# 主题系统

[← 返回 README](../README.md)

**Pitaki 有且只有两套主题机制，它们互不相通。** 这是最容易踩的坑。

---

## 1. 为什么是两套

书籍正文渲染在引擎的**嵌套 iframe** 内。HeroUI / Tailwind 的 CSS 变量定义在**外层文档**，**无法穿透到 iframe 内部**。

| 层 | 作用范围 | 机制 |
|---|---|---|
| **外壳主题** | App 界面（侧栏、按钮、弹窗、书库） | HeroUI + Tailwind v4 的 CSS 变量 |
| **书页主题** | 书籍正文 | 引擎 `renderer.setStyles()` + CSS `::part()` |

因此「夜间模式」实际上需要**分别处理这两层**。

---

## 2. 外壳主题（HeroUI v3）

### 2.1 导入顺序

```css
/* src/styles/globals.css */
@import "tailwindcss";        /* ★ 必须最先导入 */
@import "@heroui/styles";
```

> 官方明确：*"Import order matters. Always import `tailwindcss` first."*

### 2.2 变量命名规则

HeroUI v3 的命名规律：

- 无后缀 = **底色**（如 `--accent`）
- 带 `-foreground` = **该底色之上的文字颜色**（如 `--accent-foreground`）

主要 token：`--background` `--foreground` `--accent` `--accent-foreground` `--default` `--default-foreground` `--success` `--warning` `--danger`，以及 `--radius` `--spacing` 等布局变量。

### 2.3 自定义命名主题

⚠️ **不要只改 2~3 个变量**，否则组件对比度会异常。应给出完整 token 块，并放进 `@layer base`：

```css
@layer base {
  [data-theme="paper"] {
    color-scheme: light;

    /* 基础色 */
    --white: oklch(100% 0 0);
    --black: oklch(0% 0 0);

    /* 语义色 */
    --background: oklch(0.96 0.02 85);
    --foreground: oklch(0.30 0.03 50);
    --accent: oklch(0.55 0.09 60);
    --accent-foreground: oklch(0.98 0.01 85);
    --default: oklch(0.92 0.015 85);
    --default-foreground: oklch(0.30 0.03 50);

    /* 布局 */
    --radius: 0.75rem;
    --spacing: 0.25rem;
  }

  [data-theme="eye-care"] {
    color-scheme: light;
    --background: oklch(0.94 0.03 140);
    --foreground: oklch(0.25 0.04 140);
    --accent: oklch(0.55 0.12 150);
    --accent-foreground: oklch(0.98 0.01 140);
    --default: oklch(0.90 0.02 140);
    --default-foreground: oklch(0.25 0.04 140);
  }
}
```

> 建议先用官方 Theme Builder 导出完整主题 CSS，再按需覆盖。

### 2.4 切换

```html
<html class="light" data-theme="paper">
  <body class="bg-background text-foreground"><!-- App --></body>
</html>
```

- 内置 light / dark 主题同时响应 `.light` / `.dark` class 与 `data-theme` 属性；
- 若两者都手动设置，**必须保持一致**；
- **HeroUI v3 不需要 Provider** —— 组件直接从根元素读取主题变量。

---

## 3. 书页主题（引擎注入）

### 3.1 样式注入

引擎提供 `renderer.setStyles()`，官方 `reader.js` 即以此注入：

```ts
const bookCSS = ({ theme, fontSize, lineHeight, fontFamily, justify }: BookStyle) => `
  html { color-scheme: ${theme.dark ? 'dark' : 'light'}; }
  body {
    color: ${theme.fg};
    background: ${theme.bg};
    font-family: ${fontFamily};
    font-size: ${fontSize}px;
  }
  p, li, blockquote, dd {
    line-height: ${lineHeight};
    text-align: ${justify ? 'justify' : 'start'};
  }
  a { color: ${theme.link}; }
`

view.renderer.setStyles?.(bookCSS(state.bookStyle))
```

### 3.2 夜间反色的两种做法

| 做法 | 实现 | 代价 |
|---|---|---|
| **换色** | `setStyles()` 改 `color` / `background` | 触发重排，图片不变色 |
| **滤镜** ✅ | `foliate-view::part(filter)` | 廉价、无重排，图片一并反色 |

```css
foliate-view::part(filter) {
  filter: invert(1) hue-rotate(180deg);
}
```

> 引擎为渲染器暴露了 `part="filter"`，滤镜**只作用于书籍内容**，不影响高亮等叠加层。

### 3.3 页眉 / 页脚

分页模式下每列都有独立的页眉页脚区域，通过 `::part()` 定制：

```css
foliate-view::part(head) {
  padding-bottom: 4px;
  border-bottom: 1px solid graytext;
}
foliate-view::part(foot) { /* ... */ }
```

---

## 4. 常见错误

| 错误 | 后果 |
|---|---|
| 用 HeroUI 变量控制书页颜色 | 完全无效（跨 iframe） |
| 自定义主题只改 `--background` / `--foreground` | 组件对比度异常 |
| 把自定义主题写在裸 `:root` 而非 `@layer base` | 优先级错乱，可能被覆盖 |
| `@import` 顺序颠倒 | HeroUI 样式失效 |
| 用 `setStyles()` 做夜间反色 | 每次切换触发全文重排 |
