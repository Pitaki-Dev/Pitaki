#!/usr/bin/env python3
"""Rust 依赖许可证扫描（v2）

为什么不用 crates.io 的 JSON API：
    实测 10 个请求有 8 个返回 429，并发 6 时 10/10 全 429。
    因此改为：
      依赖图  → 稀疏索引 index.crates.io（静态 CDN，无限流，含完整 deps）
      许可证  → static.crates.io 上 .crate 压缩包内的 Cargo.toml（同为 CDN）

流程：
    1. BFS 遍历依赖图（排除 dev-dependencies，保留 normal/build/optional）
    2. 并发拉取每个 crate 的许可证
    3. 每解析若干条即增量落盘到 crates.json，避免超时丢失

注意：crates.io 的 dependencies 接口返回的是版本**约束**而非解析后的版本，
因此取每个 crate 的最新稳定版，属合理近似。精确结果应以最终 Cargo.lock +
cargo-deny 为准。
"""
import gzip
import json
import os
import re
import sys
import tarfile
import threading
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

UA = "Pitaki-license-audit (https://github.com/Pitaki-Dev/Pitaki)"
MAX_CRATES = int(sys.argv[1]) if len(sys.argv) > 1 else 400
WORKERS = 8

ROOTS = [
    "tauri", "tauri-build", "tauri-plugin-sql", "tauri-plugin-fs",
    "tauri-plugin-dialog", "serde", "serde_json", "sqlx", "tokio",
]

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crates.json")
_lock = threading.Lock()


# ---------- 稀疏索引 ----------

def index_path(name):
    n = name.lower()
    if len(n) == 1:
        return f"1/{n}"
    if len(n) == 2:
        return f"2/{n}"
    if len(n) == 3:
        return f"3/{n[0]}/{n}"
    return f"{n[:2]}/{n[2:4]}/{n}"


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def parse_ver(v):
    m = re.match(r"^(\d+)(?:\.(\d+))?(?:\.(\d+))?", v)
    if not m:
        return (0, 0, 0)
    return tuple(int(x or 0) for x in m.groups())


def index_entry(name):
    """返回 (最新稳定版, [依赖名])，失败返回 (None, [])。"""
    try:
        raw = fetch(f"https://index.crates.io/{index_path(name)}", timeout=30).decode()
    except urllib.error.HTTPError as e:
        return name, None, [], f"HTTP {e.code}"
    except Exception as e:
        return name, None, [], type(e).__name__

    best_ver, best_deps = None, []
    for line in raw.splitlines():
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        if d.get("yanked"):
            continue
        vers = d.get("vers", "")
        if "-" in vers.split("+")[0]:          # 跳过预发布
            continue
        if best_ver is None or parse_ver(vers) > parse_ver(best_ver):
            best_ver = vers
            best_deps = [
                (dep.get("package") or dep.get("name"))
                for dep in d.get("deps", [])
                if dep.get("kind") != "dev" and (dep.get("package") or dep.get("name"))
            ]
    return name, best_ver, best_deps, None


# ---------- 许可证（.crate → Cargo.toml）----------

def crate_license(name, version):
    url = f"https://static.crates.io/crates/{name}/{name}-{version}.crate"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=90) as resp:
            gz = gzip.GzipFile(fileobj=resp)
            tf = tarfile.open(fileobj=gz, mode="r|")
            for m in tf:
                if m.name.endswith("Cargo.toml") and m.name.count("/") == 1:
                    data = tf.extractfile(m).read(500_000).decode("utf-8", "ignore")
                    lic = re.search(r'^\s*license\s*=\s*"([^"]+)"', data, re.M)
                    lf = re.search(r'^\s*license-file\s*=\s*"([^"]+)"', data, re.M)
                    return (lic.group(1) if lic else None), (lf.group(1) if lf else None)
    except Exception as e:
        return None, f"ERR:{type(e).__name__}"
    return None, None


def main():
    t_start = time.time()

    # ---- Phase 1: BFS 依赖图 ----
    print(f"Phase 1: 遍历依赖图（上限 {MAX_CRATES} 个 crate）", file=sys.stderr)
    seen = {}
    frontier = list(ROOTS)
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        while frontier and len(seen) < MAX_CRATES:
            frontier = [n for n in dict.fromkeys(frontier) if n not in seen]
            if not frontier:
                break
            nxt = []
            for name, ver, deps, err in ex.map(index_entry, frontier):
                if name in seen:
                    continue
                seen[name] = {"name": name, "version": ver, "deps": deps,
                              "index_error": err}
                nxt.extend(d for d in deps if d not in seen)
            frontier = nxt
            print(f"  ...已解析 {len(seen)} 个 crate", file=sys.stderr)

    print(f"依赖图解析完成：{len(seen)} 个 crate，用时 {time.time()-t_start:.0f}s\n", file=sys.stderr)

    # ---- Phase 2: 并发取许可证 ----
    targets = [(n, v["version"]) for n, v in seen.items() if v["version"]]
    print(f"Phase 2: 获取 {len(targets)} 个 crate 的许可证", file=sys.stderr)
    done = 0
    lock = threading.Lock()

    def work(item):
        nonlocal done
        name, ver = item
        lic, lf = crate_license(name, ver)
        with lock:
            seen[name]["license"] = lic
            seen[name]["license_file"] = lf
            done += 1
            if done % 50 == 0:
                dump(seen)
                print(f"  ...{done}/{len(targets)}，已落盘", file=sys.stderr)
        return name

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        list(ex.map(work, targets))

    for n, v in seen.items():
        if v.get("version") is None:
            v["license"] = v.get("index_error") or "❌ 索引中不存在"
        elif v.get("license") is None:
            if v.get("license_file"):
                v["license"] = f"license-file:{v['license_file']}"
            elif isinstance(v.get("license_file"), str) and v["license_file"].startswith("ERR:"):
                v["license"] = v["license_file"]
            else:
                v["license"] = "⚠️ Cargo.toml 未声明 license"

    dump(seen)
    report(seen, time.time() - t_start)


def dump(seen):
    payload = []
    for v in seen.values():
        payload.append({
            "name": v["name"],
            "version": v.get("version"),
            "license": v.get("license"),
            "deps": len(v.get("deps") or []),
        })
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(sorted(payload, key=lambda x: x["name"]), f,
                  ensure_ascii=False, indent=2)
    os.replace(tmp, OUT)


def report(seen, elapsed):
    by = defaultdict(list)
    for v in seen.values():
        by[v.get("license") or "?"].append(v)

    print(f"根 crate: {', '.join(ROOTS)}")
    print(f"解析 crate 总数: {len(seen)}")
    print(f"总耗时: {elapsed:.0f}s\n")

    print("=" * 72)
    print("按许可证聚合")
    print("=" * 72)
    for lic, items in sorted(by.items(), key=lambda kv: -len(kv[1])):
        print(f"\n[{lic}]  ×{len(items)}")
        for it in sorted(items, key=lambda x: x["name"]):
            print(f"    - {it['name']} {it['version']}")

    print("\n" + "=" * 72)
    print("汇总")
    print("=" * 72)
    c = Counter(v.get("license") or "?" for v in seen.values())
    for lic, n in c.most_common():
        print(f"  {n:>4}  {lic}")

    print(f"\n明细已写入 {OUT}")


if __name__ == "__main__":
    main()
