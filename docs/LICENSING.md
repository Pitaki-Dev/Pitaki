# 依赖许可证审计

[← 返回 README](../README.md)

> 本文档记录 Pitaki 计划使用的全部依赖的许可证扫描结果，并据此确定本项目的开源许可证。
> 审计日期：**2026-09-19**

---

## 1. 结论（TL;DR）

| 问题 | 结论 |
|---|---|
| 本项目采用什么许可证？ | ✅ **Apache License 2.0**（含显式专利授权） |
| 是否存在传染性 copyleft 依赖？ | ❌ **没有** —— 无强制性的 GPL / AGPL / LGPL |
| 是否有需要注意的许可证？ | ⚠️ 有：npm 侧 4 个 MPL-2.0（**仅构建期**）；Rust 侧 4 个 MPL-2.0（**运行时**，但为文件级 copyleft，无传染性） |
| 需要履行的义务 | 保留 MIT / Apache-2.0 / BSD-3 / ISC 的版权声明与许可证全文；对 MPL-2.0 组件提供其源码获取方式 |

**Apache-2.0 可行**，理由见 [§6](#6-为什么选-apache-20)。

---

## 2. 扫描方法与可复现性

审计**不是**读取声明清单，而是真实安装 / 真实下载后逐个解析。

### 2.1 前端（npm）

1. 按 [README 技术栈表](../README.md#技术栈) 构建 `package.json`（含全部运行时与开发依赖）；
2. `npm install` 实际安装依赖树；
3. 递归遍历 `node_modules`（含嵌套），对每个包：
   - 优先读取 `package.json` 的 `license` / `licenses` 字段；
   - 缺失时回退到 `LICENSE*` / `COPYING*` 文件的**内容特征识别**；
   - 过滤 npm 的**子路径 shim**（如 `dom-helpers/activeElement`，`private: true` 且无 `version` 字段）—— 这类条目不是真实包，会污染统计。

**结果：101 个真实包，0 个未声明。**

### 2.2 桌面端（Rust）

**⚠️ 这里踩过一个坑，值得记录：**

最初尝试用 crates.io 的 JSON API（`/api/v1/crates/{name}`）逐个查询，但实测**限流极其激进**：

```
顺序请求 10 个： 成功 2 个，8 个 HTTP 429
并发 6 请求：   10 个全部 HTTP 429
```

加上「每个 crate 需要 2 次请求（元数据 + 依赖列表）」，实测约 **3 秒/crate**，300 个 crate 需要 15 分钟以上，极易超时。

**最终方案** —— 把「取依赖图」和「取许可证」拆到两个无限流的静态 CDN：

| 需求 | 数据源 | 说明 |
|---|---|---|
| 依赖图 | `index.crates.io`（稀疏索引） | 静态 CDN，含完整 `deps` 与 `kind`，无限流 |
| 许可证 | `static.crates.io` 上 `.crate` 包内的 `Cargo.toml` | 同为 CDN；流式解压读到 `Cargo.toml` 即停 |

流程：BFS 遍历依赖图（排除 `kind = "dev"`，保留 normal/build/optional）→ 并发拉取许可证 → **每 50 条增量落盘**（避免超时丢数据）。

**结果：626 个 crate，全部取得许可证。**

> ⚠️ **近似说明**：crates.io 的依赖接口返回的是版本**约束**而非解析后的版本，因此扫描取的是每个 crate 的**最新稳定版**。精确结果应以最终 `Cargo.lock` + `cargo-deny` 为准。

### 2.3 数据与脚本（可复现）

| 路径 | 内容 |
|---|---|
| [`scripts/license-audit/scan-npm.py`](../scripts/license-audit/scan-npm.py) | npm 扫描器 |
| [`scripts/license-audit/scan-rust.py`](../scripts/license-audit/scan-rust.py) | Rust 扫描器 |
| [`docs/license-audit/npm-packages.json`](license-audit/npm-packages.json) | npm 原始结果（101 条） |
| [`docs/license-audit/rust-crates.json`](license-audit/rust-crates.json) | Rust 原始结果（626 条） |

---

## 3. 前端依赖（npm）— 101 个包

### 3.1 分布

| 包数 | 许可证 | 性质 |
|---:|---|---|
| 60 | **MIT** | 宽松 |
| 25 | **Apache-2.0** | 宽松，需附 NOTICE |
| 4 | **MPL-2.0** | 文件级 copyleft（**仅构建期**） |
| 3 | **Apache-2.0 OR MIT** | 双许可 |
| 3 | **BSD-3-Clause** | 宽松 |
| 3 | **ISC** | 宽松 |
| 2 | **MIT OR Apache-2.0** | 双许可 |
| 1 | **0BSD** | 无署名义务 |

### 3.2 关键运行时依赖

| 包 | 版本 | 许可证 |
|---|---|---|
| `react` / `react-dom` | 19.3.0 | MIT |
| `@heroui/react` / `@heroui/styles` | 3.2.6 | MIT |
| `react-aria-components` | 1.21.1 | Apache-2.0 |
| `@adobe/react-spectrum` | 3.47.5 | Apache-2.0 |
| `zustand` | 5.0.15 | MIT |
| `@zip.js/zip.js` | 2.15.0 | **BSD-3-Clause** |
| `fflate` | 0.8.3 | MIT |
| `pdfjs-dist` | 5.5.207 | **Apache-2.0** |
| `lucide-react` | 1.47.0 | **ISC** |

### 3.3 注意事项

#### ⚠️ MPL-2.0：`lightningcss` —— 无影响

```
vite@8.3.0                      → lightningcss@1.33.0
@tailwindcss/vite@4.3.3
  └─ @tailwindcss/node@4.3.3    → lightningcss@1.32.0
```

两个理由说明它不构成约束：

1. **MPL-2.0 是文件级 copyleft** —— 只要不修改 MPL 覆盖的源文件，就无需开源自己的代码；即使分发，MPL-2.0 也允许将其作为「更大作品」的一部分以任意许可证发布。
2. **`lightningcss` 是构建期依赖** —— 只参与 CSS 编译，**不出现在最终产物中**，不构成分发行为。

#### ℹ️ 意外发现：HeroUI v3 会拖入整套 Adobe Spectrum

```
@heroui/react@3.2.6
  └─ @react-types/color@3.2.0
      ├─ @react-spectrum/color@3.2.1 → @adobe/react-spectrum@3.47.5
      └─ @react-spectrum/provider@3.11.1
```

这条链由 HeroUI 的取色器组件引入。许可证层面无害（均为 Apache-2.0），但**对「轻量」目标有影响** —— 建议打包时用代码分割隔离取色器相关组件。

> 这个发现只有**真实安装依赖**才能看到，读声明清单不会暴露。

---

## 4. 桌面端依赖（Rust）— 626 个 crate

### 4.1 分布（按许可族归并）

| crate 数 | 许可族 |
|---:|---|
| 371 | MIT / Apache-2.0 双许可 |
| 141 | MIT 系 |
| 42 | Zlib / BSL-1.0 |
| 18 | 公共领域（Unlicense / CC0） |
| 16 | 其他（见 [附录 B](license-audit/APPENDIX.md#附录-brust-非标准许可清单)） |
| 12 | BSD 系 |
| 12 | Apache-2.0 |
| 5 | MPL-2.0 |
| 4 | ISC / OpenSSL |
| 3 | Unicode-3.0 / CDLA-Permissive-2.0 |
| 1 | ⚠️ GPL 家族（**可绕开**） |
| 1 | EPL-2.0（**可绕开**） |

### 4.2 危险许可排查

**全树仅 1 个 crate 触及 GPL 家族：**

| crate | 声明 | 判定 |
|---|---|---|
| `r-efi` 7.1.0 | `MIT OR Apache-2.0 OR LGPL-2.1-or-later` | ✅ **可绕开** —— 三选一，选用 MIT 或 Apache-2.0 即可，不触发 LGPL 义务 |

`r-efi` 的来源链：`getrandom` → `r-efi`，且仅在 UEFI 目标上启用。**实际构建中不会参与。**

**EPL 家族仅 1 个：**

| crate | 声明 | 判定 |
|---|---|---|
| `uhlc` 0.9.0 | `EPL-2.0 OR Apache-2.0` | ✅ **可绕开**，且它是 `specta` 的 **optional** 依赖，默认不启用 |

**结论：不存在强制性的 copyleft 传染。**

### 4.3 MPL-2.0 明细与来源链

这是 Rust 侧唯一需要留意的类别。**4 个 crate 是运行时依赖**，且全部由 **Tauri 自身**引入：

| crate | 版本 | 引入者 | 性质 |
|---|---|---|---|
| `cssparser` | 0.38.0 | `tauri-utils` → `kuchikiki` / `dom_query` | 运行时 |
| `selectors` | 0.40.0 | `tauri-utils` → `kuchikiki` / `dom_query` | 运行时 |
| `option-ext` | 0.2.0 | `dirs` → `dirs-sys` | 运行时 |
| `mp4parse` | 0.17.0 | `image`（**optional**） | 条件启用 |
| `slog` | 2.8.2 | `uuid`（**optional**） | `MPL-2.0 OR MIT OR Apache-2.0`，可绕开 |

**影响评估：**

- MPL-2.0 是**文件级** copyleft —— 只有**修改了 MPL 覆盖的源文件**，才需要公开被修改文件；
- 我们**不修改**这些 crate，因此**无需公开 Pitaki 的任何源码**；
- 需履行的义务见 [§7](#7-必须履行的义务)。

> 这是一处「读起来吓人、实际无害」的结果。若不实际扫描，很容易误判为需要改用 GPL 兼容许可证。

### 4.4 其他非标准许可

完整清单见 [附录 B](license-audit/APPENDIX.md#附录-brust-非标准许可清单)，包括：

| 类型 | 代表 | 判定 |
|---|---|---|
| `Zlib` / `BSL-1.0` | `miniz_oxide`、`ryu` | 宽松 |
| `Unlicense` / `CC0-1.0` | 多个 | 公共领域，无义务 |
| `Unicode-3.0` | `icu_properties` | 宽松 |
| `CDLA-Permissive-2.0` | 2 个 | 宽松 |
| `BSD-2-Clause` | `rav1e`、`Inflector` | 宽松 |
| `ISC AND (Apache-2.0 OR ISC) AND OpenSSL` | `aws-lc-sys` | 见下 |
| `MIT-0` | `encase` | 无署名义务 |
| `Apache-2.0 WITH LLVM-exception` | `wasi` | 宽松 |

**关于 `aws-lc-sys`**：声明含 `OpenSSL` 字样，仅在启用 **aws-lc-rs** 或 **openssl-sys** 作为 TLS 后端时才会被编入。默认使用 `rustls`（`ring`，`Apache-2.0 AND ISC`）时不涉及。**建议在构建配置中显式固定 TLS 后端。**

**关于 `rav1e`**：`Cargo.toml` 声明 `BSD-2-Clause`，已下载其 `LICENSE` 原文核验 —— 确为标准 BSD 2-Clause，**无附加条款**。它经 `image` → `ravif` 引入（AVIF 编码），仅在需要处理 AVIF 封面时启用。

---

## 5. 依赖分层：谁真正需要署名

| 分层 | 进入分发产物 | 需履行许可义务 |
|---|---|---|
| **npm 运行时依赖**（react、heroui、zip.js、pdfjs、lucide…） | ✅ | ✅ **需要** |
| **npm 构建期依赖**（vite、typescript、tailwindcss、lightningcss…） | ❌ | ❌ 不需要 |
| **引擎**（foliate-js，git submodule + vendor 产物） | ✅ | ✅ 需要（MIT） |
| **Rust crate**（tauri 及插件，静态链接） | ✅ | ✅ **需要** |

> **这是许可证合规的关键区分**：构建工具不会随产品分发，其许可证（含 MPL-2.0）不约束本项目。

---

## 6. 为什么选 Apache-2.0

| 判断项 | 结果 |
|---|---|
| 运行时依赖是否含**强制性** GPL / AGPL / LGPL？ | ❌ 没有（唯一的 GPL 家族项为三选一，可绕开） |
| 运行时依赖是否含**会传染**的 copyleft？ | ❌ 没有（MPL-2.0 为文件级，且未修改源码） |
| 是否要求以 copyleft 发布衍生作品？ | ❌ 不要求 |
| 能否满足全部署名义务？ | ✅ 可以（均为「保留声明」义务，非传染） |
| 与依赖许可证是否兼容？ | ✅ 与 MIT / BSD / ISC / Zlib / MPL-2.0 均双向兼容 |

**因此 Apache-2.0 与全部依赖兼容。**

### 6.1 为什么是 Apache-2.0 而非 MIT

两者对本依赖树均无冲突，差别在于**授权条款的完备性**：

| 维度 | MIT | Apache-2.0 |
|---|---|---|
| 专利授权 | 无明文 | ✅ **显式授予**（§3） |
| 专利报复条款 | 无 | ✅ 有（§3 终止条款） |
| 商标授权 | 无 | ❌ 明确排除（§6） |
| 修改声明义务 | 无 | ✅ 需标注修改过的文件（§4b） |
| NOTICE 文件 | 无 | ✅ 需随分发传递（§4d） |
| 与 GPL-2.0-only 兼容 | ✅ | ❌ **不兼容**（仅兼容 GPL-3.0） |
| 条文长度 | ~170 词 | ~1600 词 |

**选择 Apache-2.0 的核心收益是显式专利授权。** 对桌面应用而言这比条文简短更重要：阅读器会引入大量第三方库，专利风险由各库的授权条款分担，「显式授予 + 报复条款」在法务上比 MIT 的默示许可更清晰。

**已知代价**：Apache-2.0 **不与 GPL-2.0-only 兼容**（MIT 可以）。若下游需要将 Pitaki 与 GPL-2.0-only 代码合并，会受阻。本项目不涉及该场景。

---

## 7. 必须履行的义务

发布产品时需随附第三方许可声明，至少覆盖：

1. **MIT / ISC / BSD / Zlib / BSL 系** —— 保留原始版权声明与许可证全文；
2. **Apache-2.0 系**（`pdfjs-dist`、`react-aria` 系列、`@adobe/react-spectrum`、Tauri 等）——
   - 保留许可证全文；
   - 保留其 `NOTICE` 文件（如有）；
   - 若修改过其源码，需注明修改；
3. **`@zip.js/zip.js`（BSD-3-Clause）** —— 不得以作者名义为衍生产品背书；
4. **MPL-2.0 组件**（`cssparser`、`selectors`、`option-ext`、可能的 `mp4parse`）——
   - 保留许可证全文与版权声明；
   - **若分发可执行形式，需告知用户如何获取这些组件的源码**。
     由于我们未做修改，指向 crates.io 的上游版本即可满足。
5. **本项目自身（Apache-2.0）** —— 分发时需随附仓库根目录的
   [`LICENSE`](../LICENSE) 与 [`NOTICE`](../NOTICE)；若修改了本项目源码，需在修改的文件中标注。

### 7.1 建议做法

```bash
# 前端：生成第三方声明
npx license-checker-rseidelsohn --production --plainVertical > THIRD-PARTY-NOTICES.md

# Rust：接入 cargo-deny，禁止引入强制性 copyleft
cargo install cargo-deny
cargo deny init
```

- 在 CI 中加入许可证检查 —— **新增强制性 GPL / AGPL 依赖时直接失败**；
- 把 `THIRD-PARTY-NOTICES.md` 随安装包分发（Tauri 可在「关于」页面展示）；
- Rust 侧用 `cargo-deny` 对**最终 `Cargo.lock`** 复核（可修正本文档的版本近似）。

---

## 8. ⚠️ 特别提醒：Readest 是 AGPL-3.0

[Readest](https://github.com/readest/readest) 与 Pitaki 使用同一引擎（foliate-js），是极佳的设计参考，但：

> **Readest 采用 AGPL-3.0。直接复制其代码将使 Pitaki 同样受 AGPL-3.0 约束** —— 必须开源全部源码，且网络服务的使用者也需获得源码。

**边界：**

- ✅ 参考其架构思路、阅读文档与 issue —— 不受限；
- ❌ 复制粘贴其**代码**（哪怕片段） —— 受 AGPL 约束。

> **注意区分**：`foliate-js` 本身是 **MIT**，可自由使用。AGPL 约束的是 Readest，不是引擎。

---

## 9. 局限

| 项 | 状态 |
|---|---|
| npm 侧（101 包） | ✅ 已完成实测 |
| Rust 侧（626 crate） | ✅ 已完成实测，但**版本为近似**（见 §2.2） |
| 平台裁剪 | ⚠️ 扫描未按目标平台裁剪（含 `windows-*` / `objc2-*` / `wasm` 等），实际参与构建的子集更小 |
| 特性门控 | ⚠️ optional 依赖可能默认不启用（如 `mp4parse`、`uhlc`、`aws-lc-sys`），实际范围更小 |
| 声明可信度 | ⚠️ 许可证字段由作者声明，可能与包内实际 `LICENSE` 文件不一致。上线前建议抽取 LICENSE 原文二次核验 |
| 引擎 vendor 产物 | ℹ️ `foliate-js` 自身打包了 `@zip.js/zip.js`(BSD-3) / `pdfjs-dist`(Apache-2.0) / `fflate`(MIT)，与上表一致 |

---
## 附录与原始数据

完整清单较长，已独立成文：

| 文件 | 内容 |
|---|---|
| [license-audit/APPENDIX.md](license-audit/APPENDIX.md) | npm（101 包）与 Rust（626 crate）的逐条清单 |
| [license-audit/npm-packages.json](license-audit/npm-packages.json) | npm 扫描原始数据 |
| [license-audit/rust-crates.json](license-audit/rust-crates.json) | Rust 扫描原始数据 |
| [scripts/license-audit/](../scripts/license-audit/) | 扫描器源码（可复现） |
