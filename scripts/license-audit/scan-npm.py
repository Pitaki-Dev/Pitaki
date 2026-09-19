#!/usr/bin/env python3
"""递归扫描 node_modules 中每个包的许可证声明。

覆盖三种来源（优先级从高到低）：
  1. package.json 的 license / licenses 字段
  2. package.json 的 license 为对象时的 type/name
  3. 缺失时回退到 LICENSE* / COPYING* 文件的内容特征识别
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = sys.argv[1] if len(sys.argv) > 1 else "node_modules"


def normalize(raw):
    """把各种写法归一到一组 SPDX 表达式。"""
    if raw is None:
        return None
    if isinstance(raw, dict):
        raw = raw.get("type") or raw.get("name")
    if isinstance(raw, list):
        parts = [normalize(x) for x in raw]
        return " OR ".join(p for p in parts if p) or None
    if not isinstance(raw, str):
        return None
    s = raw.strip()
    if not s:
        return None
    if s.upper() in ("UNLICENSED", "NONE", "SEE LICENSE IN LICENSE"):
        return s
    # 常见写法清洗
    s = s.replace("(", "").replace(")", "")
    s = re.sub(r"\s+", " ", s)
    return s


def sniff_license_file(pkg_dir):
    """license 字段缺失时，从 LICENSE 文件内容猜。"""
    for name in os.listdir(pkg_dir):
        if not re.match(r"^(LICEN[CS]E|COPYING)", name, re.I):
            continue
        p = os.path.join(pkg_dir, name)
        if not os.path.isfile(p) or os.path.getsize(p) > 200_000:
            continue
        try:
            with open(p, encoding="utf-8", errors="ignore") as f:
                head = f.read(4000)
        except OSError:
            continue
        h = head.lower()
        if "apache license" in h and "version 2.0" in h:
            return "Apache-2.0 (from file)"
        if "mit license" in h or "permission is hereby granted, free of charge" in h:
            return "MIT (from file)"
        if "bsd 3-clause" in h or "redistribution and use in source and binary forms" in h and "3." in h:
            return "BSD-3-Clause (from file)"
        if "bsd 2-clause" in h:
            return "BSD-2-Clause (from file)"
        if "isc license" in h:
            return "ISC (from file)"
        if "gnu affero general public license" in h:
            return "AGPL (from file)"
        if "gnu lesser general public license" in h:
            return "LGPL (from file)"
        if "gnu general public license" in h:
            return "GPL (from file)"
        if "mozilla public license" in h:
            return "MPL-2.0 (from file)"
        if "creative commons" in h:
            return "CC (from file)"
        if "the unlicense" in h or "public domain" in h:
            return "Unlicense/PD (from file)"
        return f"UNKNOWN-FILE:{name}"
    return None


def scan(root):
    packages = {}
    for dirpath, dirnames, filenames in os.walk(root):
        if "package.json" not in filenames:
            continue
        if os.path.basename(dirpath) != "" and "node_modules" in dirpath:
            pass
        pj = os.path.join(dirpath, "package.json")
        try:
            with open(pj, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue
        name = data.get("name")
        version = data.get("version")
        # 排除 npm 的子路径 shim（如 "dom-helpers/activeElement"，private 且无 version）
        if not name or not version:
            continue
        if data.get("private") is True and "/" in name:
            continue
        lic = normalize(data.get("license"))
        if lic is None and "licenses" in data:
            lic = normalize(data["licenses"])
        if lic is None:
            lic = sniff_license_file(dirpath)
        if lic is None:
            lic = "⚠️ NOT DECLARED"
        key = f"{name}@{version}"
        packages[key] = {
            "name": name,
            "version": version,
            "license": lic,
            "path": os.path.relpath(dirpath, os.getcwd()),
            "description": (data.get("description") or "")[:80],
        }
        # 不再深入该包的 node_modules 之外的子目录
        dirnames[:] = [d for d in dirnames if d != "node_modules" or True]
    return packages


def main():
    packages = scan(ROOT)
    print(f"扫描根目录: {ROOT}")
    print(f"发现包总数: {len(packages)}\n")

    by_lic = defaultdict(list)
    for p in packages.values():
        by_lic[p["license"]].append(p)

    print("=" * 70)
    print("按许可证聚合")
    print("=" * 70)
    for lic, items in sorted(by_lic.items(), key=lambda kv: -len(kv[1])):
        print(f"\n[{lic}]  ×{len(items)}")
        for it in sorted(items, key=lambda x: x["name"]):
            print(f"    - {it['name']}@{it['version']}")

    print("\n" + "=" * 70)
    print("汇总统计")
    print("=" * 70)
    # 粗略归类
    copyleft = ("GPL", "AGPL", "LGPL", "MPL", "CDDL", "EPL", "SSPL")
    flags = Counter()
    for lic in by_lic:
        low = lic.lower()
        if any(c.lower() in low for c in copyleft):
            flags["copyleft"] += len(by_lic[lic])
        if "not declared" in low or "unknown" in low:
            flags["unknown"] += len(by_lic[lic])
        if "agpl" in low or re.search(r"\bgpl", low):
            flags["strict-copyleft"] += len(by_lic[lic])
    for k, v in flags.items():
        print(f"  {k}: {v} 个包")
    if not flags:
        print("  未发现 copyleft / 未知许可证")

    # 机器可读输出
    with open("licenses.json", "w", encoding="utf-8") as f:
        json.dump(sorted(packages.values(), key=lambda x: x["name"]), f,
                  ensure_ascii=False, indent=2)
    print("\n明细已写入 licenses.json")


if __name__ == "__main__":
    main()
