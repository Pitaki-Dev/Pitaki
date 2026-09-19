# 依赖许可证审计

[← 返回 README](../README.md)

> 本文档记录 Pitaki 计划使用的全部依赖的许可证扫描结果，并据此确定本项目的开源许可证。

---

## 1. 结论（TL;DR）

| 问题 | 结论 |
|---|---|
| 本项目应选什么许可证？ | ✅ **MIT**（当前已采用） |
| 是否存在传染性 copyleft 依赖？ | ❌ 运行时依赖中**没有 GPL / AGPL / LGPL** |
| 是否有需要注意的许可证？ | ⚠️ 有：4 个 MPL-2.0（**仅构建期**，无影响） |
| 需要履行的义务 | 保留 MIT / Apache-2.0 / BSD-3 / ISC 的版权声明与许可证全文 |

**MIT 可行**，理由见 §5。

---

## 2. 扫描方法

### 2.1 前端（npm）

**真实安装 + 递归扫描**，非读取声明清单：

1. 按 [README 技术栈表](../README.md#技术栈) 构建 `package.json`（含全部运行时与开发依赖）；
2. `npm install` 实际安装依赖树；
3. 递归遍历 `node_modules`（含嵌套），对每个包：
   - 优先读取 `package.json` 的 `license` / `licenses` 字段；
   - 缺失时回退到 `LICENSE*` / `COPYING*` 文件的**内容特征识别**；
   - 过滤 npm 的**子路径 shim**（如 `dom-helpers/activeElement`，`private: true` 且无 `version` 字段）——这类条目不是真实包，会污染统计。

**结果：101 个真实包，0 个未声明。**

### 2.2 桌面端（Rust / crates.io）

通过 crates.io API 对依赖图做 BFS（排除 dev-dependencies）。
> ⚠️ 注意：crates.io 的 dependencies 接口返回**版本约束**而非解析后的版本，因此取每个 crate 的 `max_stable_version` 的许可证，属合理近似。**精确结果应以最终 `Cargo.lock` + `cargo-deny` 为准。**

---

## 3. npm 依赖许可证分布

| 包数 | 许可证 | 性质 |
|---:|---|---|
| 60 | **MIT** | 宽松 |
| 25 | **Apache-2.0** | 宽松，需附 NOTICE |
| 4 | **MPL-2.0** | 文件级 copyleft（**仅构建期**） |
| 3 | **Apache-2.0 OR MIT** | 双许可（Tauri CLI） |
| 3 | **BSD-3-Clause** | 宽松 |
| 3 | **ISC** | 宽松 |
| 2 | **MIT OR Apache-2.0** | 双许可（Tauri 插件） |
| 1 | **0BSD** | 无署名义务 |
| **101** | | **合计** |

### 3.1 关键运行时依赖

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

### 3.2 需要注意的项

#### ⚠️ MPL-2.0：`lightningcss`

```
vite@8.3.0                          → lightningcss@1.33.0
@tailwindcss/vite@4.3.3
  └─ @tailwindcss/node@4.3.3        → lightningcss@1.32.0
```

**影响：无。** 两个理由：

1. **MPL-2.0 是文件级 copyleft** —— 只要不修改 MPL 覆盖的源文件，就无需开源自己的代码；即使分发，MPL-2.0 也允许将其作为「更大作品」的一部分以任意许可证发布。
2. **`lightningcss` 是构建期依赖** —— 它只参与 CSS 编译，**不会出现在最终产物中**，因此不构成分发行为。

#### ℹ️ 一个意外发现：HeroUI v3 引入了 Adobe Spectrum

```
@heroui/react@3.2.6
  └─ @react-types/color@3.2.0
      ├─ @react-spectrum/color@3.2.1 → @adobe/react-spectrum@3.47.5
      └─ @react-spectrum/provider@3.11.1
```

这条链由 HeroUI 的取色器组件引入，会带来可观的重依赖。许可证层面无害（均为 Apache-2.0），但**对「轻量」目标有影响**，建议在打包时用代码分割隔离取色器相关组件。

---

## 4. 依赖分层：谁真正需要署名

| 分层 | 是否进入分发产物 | 需履行许可义务 |
|---|---|---|
| **运行时依赖**（react、heroui、zip.js、pdfjs、lucide…） | ✅ 是 | ✅ **需要** |
| **构建期依赖**（vite、typescript、tailwindcss、lightningcss、rolldown…） | ❌ 否 | ❌ 不需要 |
| **引擎**（foliate-js，git submodule） | ✅ 是（vendor 产物） | ✅ 需要（MIT） |
| **Rust crate**（tauri 及插件） | ✅ 是（静态链接） | ✅ 需要 |

> 这是许可证合规的关键区分：**构建工具不会随产品分发**，其许可证（含 MPL-2.0）不约束本项目。

---

## 5. 为什么选 MIT

| 判断项 | 结果 |
|---|---|
| 运行时依赖是否含 GPL / AGPL / LGPL？ | ❌ 没有 |
| 运行时依赖是否含文件级 copyleft（MPL）？ | ❌ 没有（MPL 仅出现在构建期） |
| 是否要求以 copyleft 发布衍生作品？ | ❌ 不要求 |
| 能否满足全部署名义务？ | ✅ 可以（MIT / Apache-2.0 / BSD-3 / ISC 均为**保留声明**义务，非传染） |

**因此 MIT 与全部依赖兼容。**

### 5.1 MIT 之外的可选项

若希望更贴合下游使用者，也可考虑 **Apache-2.0**（含显式专利授权）。两者对本依赖树均无冲突。本项目选择 MIT 是为了**最简授权**，降低使用者的合规负担。

---

## 6. 必须履行的义务

发布产品时需随附第三方许可声明，至少覆盖：

1. **MIT / ISC / BSD 系** —— 保留原始版权声明与许可证全文；
2. **Apache-2.0 系**（`pdfjs-dist`、`react-aria` 系列、`@adobe/react-spectrum`）——
   - 保留许可证全文；
   - 保留其 `NOTICE` 文件（如有）；
   - 若修改过其源码，需注明修改。
3. **`@zip.js/zip.js`（BSD-3-Clause）** —— 不得以作者名义背书衍生产品。

### 6.1 建议做法

```bash
# 开发期生成第三方声明
npx license-checker-rseidelsohn --production --json > third-party.json
npx license-checker-rseidelsohn --production --plainVertical > THIRD-PARTY-NOTICES.md
```

- 在 CI 中加入许可证检查，**新增 GPL/AGPL 依赖时直接失败**；
- Rust 侧使用 `cargo-deny` / `cargo-license` 做同等检查；
- 把 `THIRD-PARTY-NOTICES.md` 随安装包一并分发（Tauri 可在「关于」页面展示）。

---

## 7. ⚠️ 特别提醒：Readest 是 AGPL-3.0

[Readest](https://github.com/readest/readest) 与 Pitaki 使用同一引擎（foliate-js），是极佳的设计参考，但：

> **Readest 采用 AGPL-3.0。直接复制其代码将使 Pitaki 同样受 AGPL-3.0 约束** —— 必须开源全部源码，且网络服务使用者也需获得源码。

**边界**：

- ✅ 参考其架构思路、阅读其文档与 issue —— 不受限；
- ❌ 复制粘贴其**代码**（哪怕是片段） —— 受 AGPL 约束。

> 相比之下，**foliate-js 本身是 MIT**，可自由使用。务必区分这两个仓库。

---

## 8. 局限与后续

| 项 | 状态 |
|---|---|
| npm 依赖（101 包） | ✅ 已完成实测扫描 |
| Rust / crates.io 依赖 | ⏳ 见 §2.2，需以最终 `Cargo.lock` 复核 |
| 引擎 vendor 产物内部 | ⏳ `foliate-js` 自身打包了 `@zip.js/zip.js`(BSD-3) / `pdfjs-dist`(Apache-2.0) / `fflate`(MIT)，许可证与上表一致 |
| `package.json` 的 `license` 字段可信度 | ⚠️ 该字段由作者声明，可能与包内实际 LICENSE 文件不一致。上线前建议**抽取 LICENSE 原文二次核验** |

---

## 附录：npm 依赖完整清单

共 **101** 个包，其中**运行时 59 个**、构建期 42 个。

> `层级` 由 `npm ls --omit=dev` 的依赖图推导，并做了一处人工修正：`tailwindcss` 是 `@heroui/styles` 的 **peerDependency**（仅构建期使用），已归入构建期。

| 许可证 | 包 | 版本 | 层级 |
|---|---|---|---|
| `MIT` | `@babel/runtime` | 7.29.7 | **运行时** |
|  | `@heroui/react` | 3.2.6 | **运行时** |
|  | `@heroui/styles` | 3.2.6 | **运行时** |
|  | `@jridgewell/gen-mapping` | 0.3.13 | 构建期 |
|  | `@jridgewell/remapping` | 2.3.5 | 构建期 |
|  | `@jridgewell/resolve-uri` | 3.1.2 | 构建期 |
|  | `@jridgewell/sourcemap-codec` | 1.6.0 | 构建期 |
|  | `@jridgewell/trace-mapping` | 0.3.31 | 构建期 |
|  | `@napi-rs/canvas` | 0.1.100 | 构建期 |
|  | `@napi-rs/canvas-linux-arm64-gnu` | 0.1.100 | 构建期 |
|  | `@oxc-project/types` | 0.150.0 | 构建期 |
|  | `@radix-ui/primitive` | 1.1.7 | **运行时** |
|  | `@radix-ui/react-avatar` | 1.2.6 | **运行时** |
|  | `@radix-ui/react-compose-refs` | 1.1.5 | **运行时** |
|  | `@radix-ui/react-context` | 1.2.2 | **运行时** |
|  | `@radix-ui/react-primitive` | 2.1.10 | **运行时** |
|  | `@radix-ui/react-slot` | 1.3.3 | **运行时** |
|  | `@radix-ui/react-use-callback-ref` | 1.1.4 | **运行时** |
|  | `@radix-ui/react-use-is-hydrated` | 0.1.3 | **运行时** |
|  | `@radix-ui/react-use-layout-effect` | 1.1.4 | **运行时** |
|  | `@rolldown/binding-linux-arm64-gnu` | 1.2.9 | 构建期 |
|  | `@rolldown/pluginutils` | 1.0.1 | 构建期 |
|  | `@tailwindcss/node` | 4.3.3 | 构建期 |
|  | `@tailwindcss/oxide` | 4.3.3 | 构建期 |
|  | `@tailwindcss/oxide-linux-arm64-gnu` | 4.3.3 | 构建期 |
|  | `@tailwindcss/vite` | 4.3.3 | 构建期 |
|  | `@vitejs/plugin-react` | 6.1.1 | 构建期 |
|  | `aria-hidden` | 1.2.6 | **运行时** |
|  | `client-only` | 0.0.1 | **运行时** |
|  | `clsx` | 2.1.1 | **运行时** |
|  | `csstype` | 3.2.3 | **运行时** |
|  | `dom-helpers` | 5.2.1 | **运行时** |
|  | `enhanced-resolve` | 5.25.1 | 构建期 |
|  | `fdir` | 6.5.0 | 构建期 |
|  | `fflate` | 0.8.3 | **运行时** |
|  | `input-otp` | 1.5.0 | **运行时** |
|  | `jiti` | 2.7.0 | 构建期 |
|  | `js-tokens` | 4.0.0 | **运行时** |
|  | `loose-envify` | 1.4.0 | **运行时** |
|  | `magic-string` | 0.30.21 | 构建期 |
|  | `nanoid` | 3.3.19 | 构建期 |
|  | `node-readable-to-web-readable-stream` | 0.4.2 | 构建期 |
|  | `object-assign` | 4.1.1 | **运行时** |
|  | `picomatch` | 4.0.7 | 构建期 |
|  | `postcss` | 8.5.28 | 构建期 |
|  | `prop-types` | 15.8.1 | **运行时** |
|  | `react` | 19.3.0 | **运行时** |
|  | `react-dom` | 19.3.0 | **运行时** |
|  | `react-is` | 16.13.1 | **运行时** |
|  | `rolldown` | 1.2.9 | 构建期 |
|  | `scheduler` | 0.28.0 | **运行时** |
|  | `tailwind-variants` | 3.3.1 | **运行时** |
|  | `tailwindcss` | 4.3.3 | 构建期 |
|  | `tapable` | 2.3.3 | 构建期 |
|  | `tinyglobby` | 0.2.17 | 构建期 |
|  | `tw-animate-css` | 1.4.0 | **运行时** |
|  | `use-sync-external-store` | 1.7.0 | **运行时** |
|  | `vite` | 8.3.0 | 构建期 |
|  | `vscode-jsonrpc` | 9.0.0 | 构建期 |
|  | `zustand` | 5.0.15 | **运行时** |
| `Apache-2.0` | `@adobe/react-spectrum` | 3.47.5 | **运行时** |
|  | `@adobe/react-spectrum-ui` | 1.2.1 | **运行时** |
|  | `@adobe/react-spectrum-workflow` | 2.3.5 | **运行时** |
|  | `@internationalized/date` | 3.12.4 | **运行时** |
|  | `@internationalized/number` | 3.6.8 | **运行时** |
|  | `@internationalized/string` | 3.2.10 | **运行时** |
|  | `@react-aria/color` | 3.2.1 | **运行时** |
|  | `@react-aria/ssr` | 3.10.1 | **运行时** |
|  | `@react-aria/utils` | 3.34.1 | **运行时** |
|  | `@react-spectrum/color` | 3.2.1 | **运行时** |
|  | `@react-spectrum/provider` | 3.11.1 | **运行时** |
|  | `@react-stately/color` | 3.10.1 | **运行时** |
|  | `@react-stately/utils` | 3.12.1 | **运行时** |
|  | `@react-types/color` | 3.2.0 | **运行时** |
|  | `@react-types/shared` | 3.36.1 | **运行时** |
|  | `@spectrum-icons/ui` | 3.7.2 | **运行时** |
|  | `@spectrum-icons/workflow` | 4.3.2 | **运行时** |
|  | `@swc/helpers` | 0.5.23 | **运行时** |
|  | `@typescript/typescript-linux-arm64` | 7.0.2 | 构建期 |
|  | `detect-libc` | 2.1.2 | 构建期 |
|  | `pdfjs-dist` | 5.5.207 | 构建期 |
|  | `react-aria` | 3.52.1 | **运行时** |
|  | `react-aria-components` | 1.21.1 | **运行时** |
|  | `react-stately` | 3.50.0 | **运行时** |
|  | `typescript` | 7.0.2 | 构建期 |
| `MPL-2.0` | `lightningcss` | 1.33.0 | 构建期 |
|  | `lightningcss` | 1.32.0 | 构建期 |
|  | `lightningcss-linux-arm64-gnu` | 1.33.0 | 构建期 |
|  | `lightningcss-linux-arm64-gnu` | 1.32.0 | 构建期 |
| `Apache-2.0 OR MIT` | `@tauri-apps/api` | 2.11.1 | **运行时** |
|  | `@tauri-apps/cli` | 2.11.4 | 构建期 |
|  | `@tauri-apps/cli-linux-arm64-gnu` | 2.11.4 | 构建期 |
| `BSD-3-Clause` | `@zip.js/zip.js` | 2.15.0 | **运行时** |
|  | `react-transition-group` | 4.4.5 | **运行时** |
|  | `source-map-js` | 1.2.1 | 构建期 |
| `ISC` | `graceful-fs` | 4.2.11 | 构建期 |
|  | `lucide-react` | 1.47.0 | **运行时** |
|  | `picocolors` | 1.1.1 | 构建期 |
| `MIT OR Apache-2.0` | `@tauri-apps/plugin-fs` | 2.5.2 | **运行时** |
|  | `@tauri-apps/plugin-sql` | 2.4.1 | **运行时** |
| `0BSD` | `tslib` | 2.8.1 | **运行时** |
