# Tauri 配置要点

[← 返回 README](../README.md)

> Tauri **v2** 与 v1 最大的差异是 **Capabilities / ACL 权限体系**。不配置会导致插件调用直接失败。

---

## 1. 权限（Capabilities）

`fs`、`dialog`、`sql` 等插件的能力必须在 capability 文件中显式声明。

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "dialog:default",
    "sql:default",
    "sql:allow-execute"
  ]
}
```

**要点**

- 权限**最小化**：只声明实际需要的那几条，不要图省事写 `fs:default`；
- 允许用户选择任意目录时，fs scope 需**运行时动态扩展**（而非一次性放开全盘）；
- 权限缺失的典型表现是**运行时静默失败或报 ACL 错误**，而非编译错误。

---

## 2. CSP

引擎使用 `blob:` 同源 iframe 渲染正文，并可能使用 Worker。CSP 必须放行：

```
default-src 'self';
img-src 'self' data: blob: asset: http://asset.localhost;
frame-src 'self' blob: data:;
worker-src 'self' blob:;
style-src 'self' 'unsafe-inline';
```

**说明**

- `frame-src` 的 `blob:` 是必需的 —— 引擎把每一章渲染进 iframe；
- `worker-src` 的 `blob:` 用于 PDF Worker 等；
- `style-src` 的 `'unsafe-inline'` 是必需的 —— 引擎通过 `setStyles()` 注入书页样式；
- 若 CSP 过严，典型表现是**书能打开但一片空白**。

> ⚠️ 上游 README 承认其内容隔离方案 *"currently impossible to do so securely due to the content being served from the same origin (using `blob:` URLs)"*。打开不可信来源的书籍时需自行评估风险。

---

## 3. 安全上下文（重要）

IDPF 字体去混淆默认调用 **Web Crypto 的 SHA-1**，该 API **仅在安全上下文可用**。

| 运行环境 | 是否安全上下文 | 结果 |
|---|---|---|
| Tauri（`tauri://localhost` / `http://tauri.localhost`） | ✅ 通常是 | 正常 |
| Web（HTTPS） | ✅ | 正常 |
| Web（纯 HTTP） | ❌ | **字体去混淆失败** |

**结论**：Web 部署**必须启用 HTTPS**；否则需自行提供 SHA-1 实现。

---

## 4. Rust 侧原则

**保持极简**，只负责：

- 文件访问（`tauri-plugin-fs`）
- 系统对话框（`tauri-plugin-dialog`）
- SQLite（`tauri-plugin-sql`，启用 `sqlite` feature）
- 必要的系统调用（窗口、全屏、置顶）

**复杂解析全部留在前端。** 避免前后端职责重叠。

---

## 5. 版本参考

| 组件 | 版本 |
|---|---|
| `@tauri-apps/cli` | `^2.11.4` |
| `@tauri-apps/api` | `^2.11.1` |
| `@tauri-apps/plugin-fs` | `^2.5.2` |
| `@tauri-apps/plugin-sql` | `^2.4.1` |
| `tauri`（crate） | `2.11.5` |
| Rust stable | `1.98.1`（锁定） |

> ⚠️ Tauri **3.0.0-alpha.1** 已发布，但仍是 alpha。本项目使用 **v2 稳定线**。

---

## 6. Rust 工具链

### 6.1 版本决定

| 项 | 值 | 说明 |
|---|---|---|
| 锁定工具链 | **1.98.1** | 见 [rust-toolchain.toml](../rust-toolchain.toml) |
| MSRV（`rust-version`） | **1.98.1** | 与锁定值一致，避免「声明了却没测过」的 MSRV 失真 |
| Tauri 自身 MSRV | 1.77.2 | 上游的**下限**，不是我们的目标 |
| Edition | 2024 | 需 Rust ≥ 1.85，当前工具链满足 |

**为什么锁到 patch 位（1.98.1 而非 1.98）**：

`1.98.0` 存在已知的 rustc **vtable 误编译缺陷**（[rust-lang/rust#161441](https://github.com/rust-lang/rust/issues/161441)），已在 1.98.1 修复。把 MSRV 写到 `1.98.1` 可以**从工具链层面阻止**他人用有问题的 1.98.0 构建本项目。

```toml
# src-tauri/Cargo.toml
[package]
rust-version = "1.98.1"   # 而非 "1.98"
```

### 6.2 版本节奏

Rust 每 6 周发布一版。截至 2026-09-19：

| 通道 | 版本 |
|---|---|
| stable | **1.98.1**（2026-09-03） |
| beta | 1.99.0-beta.6（2026-09-17） |
| nightly | 1.100.0-nightly（2026-09-18） |

**1.99.0 预计 2026-10 初发布**。升级时需同步更新 `rust-toolchain.toml` 与 `Cargo.toml` 的 `rust-version`。
