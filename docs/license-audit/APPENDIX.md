# 依赖许可证 — 完整清单

[← 返回 README](../../README.md) ｜ [← 返回审计结论](../LICENSING.md)

> 本文件由 [`scripts/license-audit/`](../../scripts/license-audit/) 中的扫描器自动生成，
> 原始数据为 [`npm-packages.json`](npm-packages.json) 与 [`rust-crates.json`](rust-crates.json)。

---

## 附录 A：npm 完整清单

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

---

## 附录 B：Rust 非标准许可清单

> 「非标准」= 不属于 `MIT`、`Apache-2.0`、`MIT OR Apache-2.0` 这三种最常见组合的 crate。
> 完整 626 条记录见 [`rust-crates.json`](rust-crates.json)。

共 **121** 个 crate（占 626 个的 19%）。

### Zlib — 39 个

声明：`MIT OR Apache-2.0 OR Zlib` ｜ `MIT OR Zlib OR Apache-2.0` ｜ `Zlib` ｜ `Zlib OR Apache-2.0 OR MIT`

| crate | 版本 | 声明 |
|---|---|---|
| `bytemuck` | 1.25.2 | Zlib OR Apache-2.0 OR MIT |
| `bytemuck_derive` | 1.12.1 | Zlib OR Apache-2.0 OR MIT |
| `dispatch2` | 0.3.1 | Zlib OR Apache-2.0 OR MIT |
| `foldhash` | 0.2.0 | Zlib |
| `miniz_oxide` | 0.9.1 | MIT OR Zlib OR Apache-2.0 |
| `objc2-app-kit` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-cloud-kit` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-contacts` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-data` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-foundation` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-graphics` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-image` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-location` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-ml` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-services` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-spotlight` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-text` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-core-video` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-exception-helper` | 0.1.1 | Zlib OR Apache-2.0 OR MIT |
| `objc2-image-io` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-io-surface` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-javascript-core` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-metal` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-open-gl` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-proc-macros` | 0.2.0 | Zlib OR Apache-2.0 OR MIT |
| `objc2-quartz-core` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-security` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-symbols` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-system-configuration` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-ui-kit` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-uniform-type-identifiers` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-user-notifications` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `objc2-web-kit` | 0.3.2 | Zlib OR Apache-2.0 OR MIT |
| `raw-window-handle` | 0.6.2 | MIT OR Apache-2.0 OR Zlib |
| `tiny-xlib` | 0.2.5 | MIT OR Apache-2.0 OR Zlib |
| `zlib-rs` | 0.6.8 | Zlib |
| `zune-core` | 0.5.3 | MIT OR Apache-2.0 OR Zlib |
| `zune-inflate` | 0.2.54 | MIT OR Apache-2.0 OR Zlib |
| `zune-jpeg` | 0.5.15 | MIT OR Apache-2.0 OR Zlib |

### BSD 系 — 19 个

声明：`(Apache-2.0 OR MIT) AND BSD-3-Clause` ｜ `BSD-2-Clause` ｜ `BSD-2-Clause OR Apache-2.0 OR MIT` ｜ `BSD-3-Clause` ｜ `BSD-3-Clause AND MIT` ｜ `BSD-3-Clause OR Apache-2.0` ｜ `BSD-3-Clause/MIT` ｜ `ISC AND (Apache-2.0 OR ISC) AND Apache-2.0 AND MIT AND BSD-3-Clause AND (Apache-2.0 OR ISC OR MIT) AND (Apache-2.0 OR ISC OR MIT-0)`

| crate | 版本 | 声明 |
|---|---|---|
| `Inflector` | 0.11.4 | BSD-2-Clause |
| `alloc-no-stdlib` | 3.0.0 | BSD-3-Clause |
| `alloc-stdlib` | 0.3.0 | BSD-3-Clause |
| `avif-serialize` | 0.8.9 | BSD-3-Clause |
| `aws-lc-sys` | 0.45.0 | ISC AND (Apache-2.0 OR ISC) AND Apache-2.0 AND MIT AND BSD-3-Clause AND (Apache-2.0 OR ISC OR MIT) AND (Apache-2.0 OR ISC OR MIT-0) |
| `bindgen` | 0.73.2 | BSD-3-Clause |
| `brotli` | 9.0.0 | BSD-3-Clause AND MIT |
| `brotli-decompressor` | 6.0.0 | BSD-3-Clause/MIT |
| `encoding_rs` | 0.8.41 | (Apache-2.0 OR MIT) AND BSD-3-Clause |
| `exr` | 1.74.2 | BSD-3-Clause |
| `lebe` | 0.5.3 | BSD-3-Clause |
| `moxcms` | 0.9.1 | BSD-3-Clause OR Apache-2.0 |
| `pxfm` | 0.1.30 | BSD-3-Clause OR Apache-2.0 |
| `rav1e` | 0.8.1 | BSD-2-Clause |
| `ravif` | 0.13.0 | BSD-3-Clause |
| `sha1_smol` | 1.0.1 | BSD-3-Clause |
| `subtle` | 2.6.1 | BSD-3-Clause |
| `zerocopy` | 0.8.57 | BSD-2-Clause OR Apache-2.0 OR MIT |
| `zstd` | 0.14.0 | BSD-3-Clause |

### 其他 — 19 个

声明：`(MIT OR Apache-2.0) AND Apache-2.0` ｜ `Apache-2.0 / MIT` ｜ `Apache-2.0 AND MIT` ｜ `URLError`

| crate | 版本 | 声明 |
|---|---|---|
| `block-buffer` | None | URLError |
| `bson` | None | URLError |
| `chrono` | None | URLError |
| `document-features` | None | URLError |
| `dpi` | 0.1.2 | Apache-2.0 AND MIT |
| `fnv` | 1.0.7 | Apache-2.0 / MIT |
| `gdk4` | None | URLError |
| `jni` | None | URLError |
| `json5` | None | URLError |
| `libc` | None | URLError |
| `moka` | 0.12.16 | (MIT OR Apache-2.0) AND Apache-2.0 |
| `nix` | None | URLError |
| `parking_lot` | None | URLError |
| `rustix` | None | URLError |
| `serialize-to-javascript-impl` | None | URLError |
| `tauri-plugin-dialog` | None | URLError |
| `tauri-plugin-sql` | None | URLError |
| `tokio` | None | URLError |
| `zerocopy-derive` | None | URLError |

### Unlicense（公共领域） — 15 个

声明：`Unlicense` ｜ `Unlicense OR MIT` ｜ `Unlicense/MIT`

| crate | 版本 | 声明 |
|---|---|---|
| `aho-corasick` | 1.1.5 | Unlicense OR MIT |
| `byteorder` | 1.5.0 | Unlicense OR MIT |
| `byteorder-lite` | 0.1.0 | Unlicense OR MIT |
| `jiff` | 0.2.37 | Unlicense OR MIT |
| `jiff-core` | 0.1.1 | Unlicense OR MIT |
| `jiff-static` | 0.2.37 | Unlicense OR MIT |
| `jiff-tzdb` | 0.1.8 | Unlicense OR MIT |
| `jiff-tzdb-platform` | 0.1.3 | Unlicense OR MIT |
| `ksni` | 0.3.6 | Unlicense |
| `memchr` | 2.8.3 | Unlicense OR MIT |
| `quickcheck` | 1.1.0 | Unlicense OR MIT |
| `same-file` | 1.0.6 | Unlicense/MIT |
| `termcolor` | 1.4.1 | Unlicense OR MIT |
| `walkdir` | 2.5.0 | Unlicense/MIT |
| `winapi-util` | 0.1.11 | Unlicense OR MIT |

### ISC — 9 个

声明：`Apache-2.0 AND ISC` ｜ `Apache-2.0 OR ISC OR MIT` ｜ `ISC` ｜ `ISC AND (Apache-2.0 OR ISC)`

| crate | 版本 | 声明 |
|---|---|---|
| `aws-lc-rs` | 1.18.1 | ISC AND (Apache-2.0 OR ISC) |
| `hyper-rustls` | 0.27.9 | Apache-2.0 OR ISC OR MIT |
| `inotify` | 0.11.5 | ISC |
| `inotify-sys` | 0.1.8 | ISC |
| `ring` | 0.17.14 | Apache-2.0 AND ISC |
| `rustls` | 0.23.45 | Apache-2.0 OR ISC OR MIT |
| `rustls-native-certs` | 0.8.4 | Apache-2.0 OR ISC OR MIT |
| `rustls-webpki` | 0.103.15 | ISC |
| `untrusted` | 0.9.0 | ISC |

### MPL-2.0 — 5 个

声明：`MPL-2.0` ｜ `MPL-2.0 OR MIT OR Apache-2.0`

| crate | 版本 | 声明 |
|---|---|---|
| `cssparser` | 0.38.0 | MPL-2.0 |
| `mp4parse` | 0.17.0 | MPL-2.0 |
| `option-ext` | 0.2.0 | MPL-2.0 |
| `selectors` | 0.40.0 | MPL-2.0 |
| `slog` | 2.8.2 | MPL-2.0 OR MIT OR Apache-2.0 |

### CC0-1.0（公共领域） — 3 个

声明：`CC0-1.0` ｜ `CC0-1.0 OR Apache-2.0` ｜ `CC0-1.0 OR MIT-0 OR Apache-2.0`

| crate | 版本 | 声明 |
|---|---|---|
| `dunce` | 1.0.5 | CC0-1.0 OR MIT-0 OR Apache-2.0 |
| `imgref` | 1.12.3 | CC0-1.0 OR Apache-2.0 |
| `notify` | 8.2.0 | CC0-1.0 |

### BSL-1.0 — 3 个

声明：`Apache-2.0 OR BSL-1.0` ｜ `Apache-2.0 OR BSL-1.0 OR MIT`

| crate | 版本 | 声明 |
|---|---|---|
| `ryu` | 1.0.23 | Apache-2.0 OR BSL-1.0 |
| `wasite` | 1.0.2 | Apache-2.0 OR BSL-1.0 OR MIT |
| `whoami` | 2.1.3 | Apache-2.0 OR BSL-1.0 OR MIT |

### Unicode-3.0 — 2 个

声明：`(MIT OR Apache-2.0) AND Unicode-3.0` ｜ `Unicode-3.0`

| crate | 版本 | 声明 |
|---|---|---|
| `icu_properties` | 2.3.0 | Unicode-3.0 |
| `unicode-ident` | 1.0.26 | (MIT OR Apache-2.0) AND Unicode-3.0 |

### CDLA-Permissive-2.0 — 2 个

声明：`CDLA-Permissive-2.0`

| crate | 版本 | 声明 |
|---|---|---|
| `webpki-root-certs` | 1.0.9 | CDLA-Permissive-2.0 |
| `webpki-roots` | 1.0.9 | CDLA-Permissive-2.0 |

### ISC / OpenSSL — 1 个

声明：`ISC AND (Apache-2.0 OR ISC) AND OpenSSL`

| crate | 版本 | 声明 |
|---|---|---|
| `aws-lc-fips-sys` | 0.14.2 | ISC AND (Apache-2.0 OR ISC) AND OpenSSL |

### MIT-0 — 1 个

声明：`MIT-0`

| crate | 版本 | 声明 |
|---|---|---|
| `encase` | 0.12.2 | MIT-0 |

### ⚠️ GPL 家族 — 1 个

声明：`MIT OR Apache-2.0 OR LGPL-2.1-or-later`

| crate | 版本 | 声明 |
|---|---|---|
| `r-efi` | 7.1.0 | MIT OR Apache-2.0 OR LGPL-2.1-or-later |

### EPL-2.0 — 1 个

声明：`EPL-2.0 OR Apache-2.0`

| crate | 版本 | 声明 |
|---|---|---|
| `uhlc` | 0.9.0 | EPL-2.0 OR Apache-2.0 |

### Apache-2.0 WITH LLVM-exception — 1 个

声明：`Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT`

| crate | 版本 | 声明 |
|---|---|---|
| `wasi` | 0.14.7+wasi-0.2.4 | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT |

