# UI：响应式与触摸

[← 返回 README](../README.md)

> **这是硬性要求，不是加分项。** 界面必须同时适用于鼠标、键盘、触摸与窄屏。
>
> 目标环境（按优先级）：
> 1. **桌面触屏 / 二合一**（Windows 触摸本、笔记本触控板 + 触摸屏）
> 2. **平板**（iPad Safari、Android Chrome）
> 3. **手机 Web**（同一份 Vite 构建）
> 4. Tauri 桌面（鼠标 + 键盘）
>
> Tauri 移动端（Android/iOS）**不在当前范围**，但布局不得假设「一定是鼠标 + 大屏」。

---

## 1. ⚠️ 先读：引擎自己已经做了触摸手势

**foliate-js 的 paginator 内置了完整的滑动翻页**，实现位于 `paginator.js`。
不了解这点会重复实现，或与引擎互相打架。

| 引擎已有的行为 | 位置 |
|---|---|
| 单指拖拽**跟随手指**（`scrollBy(dx, dy)` + `preventDefault()`） | `paginator.js#onTouchMove` |
| 松手按**速度吸附**翻页（`snap(vx, vy)`，已处理 RTL 与竖排） | `#onTouchEnd` / `snap()` |
| 手势监听**同时挂在 `foliate-view` 和每个 section 的 `document`（iframe 内）** | 由 `load` 事件注册 |
| 多指触摸 → **直接 return**（交给浏览器做缩放） | `if (e.touches.length > 1) return` |
| `visualViewport.scale > 1`（已缩放）→ **不接管** | `state.pinched` |
| `flow = scrolled` 模式 → **完全不接管** | `if (this.scrolled) return` |

### 结论

- ❌ **不要自己实现滑动翻页** —— 已有，且考虑了 RTL/竖排/惯性。
- ❌ **不要对 `foliate-view` 或其内部挂 `touchmove` 做别的事** —— 引擎已 `preventDefault()`，会冲突。
- ✅ 需要自己做的：**缩放**、**外壳手势**、**`touch-action` / `overscroll-behavior`**（引擎完全没设）、**fixed-layout（CBZ）的平移缩放**。

---

## 2. 必须补的缺口

| 缺口 | 处理 |
|---|---|
| 引擎**没有设置任何** `touch-action` / `overscroll-behavior` | 见下 |
| `fixed-layout.js`（CBZ/PDF）**完全没有触摸处理** | 平移/缩放需自行实现；`zoom` 属性走 `setAttribute`（`'fit-width'` / `'fit-page'` / 数字） |
| 引擎只覆盖阅读区，**不覆盖外壳** | 侧栏、目录抽屉等外壳手势另做 |

```css
/* 分页模式：屏蔽浏览器平移，但保留捏合缩放（引擎依赖 visualViewport.scale 判定） */
.reader[data-flow="paginated"] foliate-view { touch-action: pinch-zoom; }

/* 滚动模式：交给浏览器纵向滚动 */
.reader[data-flow="scrolled"]  foliate-view { touch-action: pan-y; }

/* 防止下拉刷新 / 滚动链穿透 */
.reader { overscroll-behavior: contain; }
```

---

## 3. 三个最容易踩的陷阱

### 3.1 iframe 事件不冒泡到父文档

书页正文在**嵌套 iframe** 内。任何「全局」手势（侧滑开目录、双指调亮度等）
如果在父文档监听，**在正文上完全无效**。

必须像引擎那样，通过 `load` 事件挂到**每个 section 的 document**：

```ts
view.addEventListener('load', (e: CustomEvent) => {
  const { doc } = e.detail
  doc.addEventListener('touchstart', onReaderGesture, { passive: true })
})
```

### 3.2 不要用 `touchstart` 判「点击」

用 `click` / `pointerup`。HeroUI v3 基于 **React Aria Components**（已实测其 peer 依赖），
`usePress` 已统一处理触摸、鼠标、键盘与焦点，直接用它，别自己搓。

### 3.3 悬停态必须有触摸等价物

触摸设备没有 hover。任何「鼠标移上去才出现」的 UI 都必须有替代入口：

| 悬停交互 | 触摸等价 |
|---|---|
| 悬停显示工具提示 | React Aria 的 `Tooltip` **聚焦也会显示**，保证可聚焦即可 |
| 悬停浮出顶栏/底栏 | **点按中部切换显隐**（tap-to-toggle） |
| 悬停预览书封 | 长按 / 点按进入详情 |

---

## 4. 响应式布局

### 4.1 断点（Tailwind v4 默认值）

| 断点 | 宽度 | 布局 |
|---|---|---|
| `< md` | < 768px | **手机**：全屏阅读；书库单/双列网格；底部导航；侧栏为覆盖式抽屉 |
| `md` – `lg` | 768–1024px | **平板**：书库 2–4 列；阅读器单栏；侧栏为抽屉 |
| `≥ lg` | ≥ 1024px | **桌面**：侧栏常驻 + 阅读器；可分栏 |
| `≥ xl` | ≥ 1280px | 同上，并对正文设 `max-inline-size` 限制行宽 |

### 4.2 行宽

引擎的 paginator 支持 `max-inline-size`（单位必须 `px`，只能 `setAttribute`）。
**大屏上必须设**，否则一行过长严重影响可读性。建议随笔宽响应式调整：

```ts
view.setAttribute('max-inline-size', isWide ? '720px' : 'none')
```

### 4.3 输入方式检测

**用 CSS，不要用 UA 嗅探。** Tailwind v4 已内置相关变体（实测存在于 4.3.3）：

```html
<Button class="min-h-11 pointer-coarse:min-h-12 pointer-coarse:text-base">打开</Button>
```

可用变体：`pointer-coarse:` / `pointer-fine:` / `any-pointer-coarse:`；
媒体查询：`@media (pointer: coarse)`、`@media (hover: hover)`。

---

## 5. 触摸目标与安全区

- **最小触摸目标 44×44 CSS px**（Apple HIG）/ 48dp（Material）。
- HeroUI 默认 `size="md"` 按钮约 40px，**触摸设备上偏小** → 用 `size="lg"` 或 `min-h-11 min-w-11`
  （Tailwind `11` = 2.75rem = 44px）。
- 图标按钮必须显式给最小尺寸，不要只靠 padding。
- 相邻可点元素间距 ≥ 8px，避免误触。

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

> ⚠️ **不要加 `user-scalable=no`。** 它会同时废掉浏览器缩放**和**引擎赖以判断的
> `visualViewport.scale` —— 引擎正是靠 `scale > 1` 来决定「用户正在缩放，我不接管手势」。

```css
/* 刘海屏 / 手势条 */
.reader-chrome {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

## 6. 阅读器的两种模式都要能用

| | `flow = paginated` | `flow = scrolled` |
|---|---|---|
| 翻页 | 滑动 + 惯性（引擎自带） | 纵向滚动（浏览器） |
| `touch-action` | `pinch-zoom` | `pan-y` |
| `relocate` 频率 | 翻页时触发（低频） | **滚动中持续触发**（务必节流，见 [ENGINE.md §7](ENGINE.md)） |
| 大屏 | 可能双栏（`max-column-count`） | 单栏 |
| 小屏推荐 | 视内容而定 | ✅ 通常更适合 |

**默认策略建议**：窄屏默认 `scrolled`，宽屏默认 `paginated`，并允许用户切换。

---

## 7. 测试矩阵

每个 UI 改动至少覆盖：

- [ ] 鼠标 + 键盘（Tab 顺序、方向键翻页、Esc 关闭弹层）
- [ ] **纯触摸**（无鼠标）：滑动翻页、点按切换 chrome、长按选择
- [ ] 二合一设备（触控板 + 触摸屏混用）
- [ ] 窄屏 320px 宽（最窄手机）
- [ ] 横屏 / 竖屏切换
- [ ] 浏览器缩放 200%
- [ ] 屏幕阅读器（HeroUI 基于 React Aria，本身无障碍良好，但自定义手势需补 ARIA）

> ⚠️ **Linux / WebKitGTK**（Tauri 在 Linux 的 WebView）对 `visualViewport` 与触摸事件的支持
> 与 Chromium 有差异，需单独冒烟（见 [RISKS.md](RISKS.md) R7）。

---

## 8. 常见错误

| 错误 | 后果 |
|---|---|
| 自己实现滑动翻页 | 与引擎重复处理，翻页跳动或翻两页 |
| 在父文档监听「全局」手势 | 正文在 iframe 内，手势完全无效 |
| 用 `touchstart` 当点击 | 与滚动/长按冲突，误触发 |
| 加 `user-scalable=no` | 废掉缩放，且破坏引擎的手势让位判定 |
| 只靠 hover 展示操作 | 触摸设备上功能不可达 |
| 图标按钮不设最小尺寸 | 触摸目标过小，误触率高 |
| 大屏不设 `max-inline-size` | 每行过长，可读性差 |
| 引擎外再挂 `touchmove` | 与引擎的 `preventDefault()` 冲突 |
