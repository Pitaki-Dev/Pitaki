# 风险与限制

[← 返回 README](../README.md)

---

## 1. 风险登记表

| # | 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|---|
| R1 | **引擎 API 漂移** —— 上游自述 *"not stable, expect it to break"* | 高 | 高 | submodule 锁 commit + L2 适配层隔离；升级走固定流程 |
| R2 | **误用 fflate 顶替 zip.js**，失去 `File` 随机访问能力 | 中 | 高 | 明确依赖职责 → [ENGINE.md](ENGINE.md) §3.3 |
| R3 | **PDF 缺 `cmaps`** 导致中文乱码 | 中 | 中 | vendor 拷贝时包含 `cmaps` + `standard_fonts` |
| R4 | **CSP 未放行 `blob:`** 导致书能打开但空白 | 中 | 高 | → [TAURI.md](TAURI.md) §2 |
| R5 | **Tauri v2 ACL 未授权**导致插件调用失败 | 中 | 高 | capability 显式声明权限 |
| R6 | **`relocate` 高频写库**导致 IO 抖动 | 高 | 中 | 按 `reason` 区分防抖 / 立即落库 |
| R7 | **WebKitGTK 兼容性** —— Linux 平台对 `srcdoc` iframe + CSS 多列分页支持不一；`visualViewport` 与触摸事件的行为也与 Chromium 有差异 | 中 | 中 | 早期在 Linux 冒烟测试；触摸相关判定不要只依赖 `visualViewport` |
| R8 | **纯 HTTP 部署**导致 Web Crypto SHA-1 不可用 | 中 | 中 | 强制 HTTPS，或自带 SHA-1 实现 |
| R9 | **误装 npm 上的非官方 `foliate-js` 包** | 中 | 高 | 只用 submodule，禁止 `npm i foliate-js` |
| R10 | **自定义主题只改少量变量**导致对比度异常 | 中 | 低 | 用 Theme Builder 导出完整 token |
| R11 | **同名/重名书籍**导致 `path` 冲突 | 低 | 中 | `id` 用内容哈希而非路径 |

---

## 2. 已知限制

| 项 | 说明 |
|---|---|
| DRM | 不支持任何 DRM 保护的书籍 |
| CBR | 不支持（RAR 格式），仅支持 CBZ |
| 混合版式 | 不支持 reflowable + pre-paginated 混排的书籍 |
| PDF | 上游标记为 *proof-of-concept, highly experimental*，功能有限 |
| HeroUI Pro | DataGrid / Kanban / Command palette 等属**付费组件**，免费版不含 |
| 内容隔离 | 引擎以 `blob:` 同源 iframe 渲染，上游承认无法做到安全隔离 |
| 大文件 | MOBI 的 HUFF/CDIC 解压实现较慢，超大 KF8 文件加载可能卡顿 |
| 分页性能 | 分页基于 CSS multi-column，与 Epub.js 有相同局限 |

---

## 3. 需要早期验证的三件事

这三点若失败，会动摇整套方案的可行性，**建议在 Phase 1 就跑通**：

1. **vendor 产物能否构建成功**，且 `view.js` 的相对路径能正确解析；
2. **Linux / WebKitGTK** 下能否正常渲染并分页；
3. **Tauri CSP 与 capabilities** 能否放行引擎所需的 `blob:` iframe 与 Worker。
