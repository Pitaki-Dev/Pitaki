# 数据模型

[← 返回 README](../README.md)

本地优先：书籍文件由用户选择的目录承载，元数据 / 进度 / 批注 / 设置全部存 SQLite。

---

## 1. 表结构

```sql
-- 书籍
CREATE TABLE books (
  id            TEXT PRIMARY KEY,
  path          TEXT NOT NULL,
  title         TEXT,
  author        TEXT,
  cover_path    TEXT,        -- 封面走文件路径，避免大 BLOB 拖慢查询
  format        TEXT,        -- epub / azw3 / mobi / fb2 / cbz / pdf
  last_read     INTEGER,     -- Unix 时间戳
  progress      REAL,        -- 0~1，兜底
  cfi           TEXT,        -- 主定位
  added_at      INTEGER
);

-- 书签 / 高亮 / 笔记
CREATE TABLE annotations (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL,
  type          TEXT,        -- bookmark / highlight / note
  cfi           TEXT,
  section_index INTEGER,     -- 冗余字段，便于按章节检索
  content       TEXT,
  color         TEXT,
  created_at    INTEGER,
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE INDEX idx_ann_book ON annotations(book_id, section_index);

-- 设置
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

---

## 2. 设计说明

### 2.1 为什么 `cfi` 与 `progress` 并存

- `cfi`（EPUB Canonical Fragment Identifier）是**跨排版稳定**的定位方式，字号 / 行距 / 窗口尺寸变化后仍指向同一处文本；
- `progress`（0~1）是**兜底值**，用于：
  - CFI 解析失败的格式（如 CBZ、PDF）；
  - 书库列表的进度条快速渲染，无需解析 CFI。

**写入时两者都存**，读取时优先 CFI。

### 2.2 为什么封面不入库

SQLite 存 BLOB 会让单行体积暴涨，进而拖慢 `SELECT` 与备份。改为：

- 文件系统存原图 + 缩略图；
- 数据库只存 `cover_path`。

### 2.3 为什么 `annotations` 要冗余 `section_index`

引擎的 `relocate` 事件会给出当前 `index`（章节序号）。冗余存一份后：

- 「本章有哪些批注」可走索引直接查，无需遍历解析全部 CFI；
- 章节内容变化导致 CFI 失效时，可按章节降级定位（近似）。

> ⚠️ 注意：`section_index` 是**冗余字段**，写入批注时从引擎的 `index` 取值，不要试图从 CFI 反推。

---

## 3. 状态管理

```ts
interface ReaderState {
  currentBook: Book | null
  progress: number
  cfi: string | null
  theme: 'light' | 'dark' | 'paper' | 'sepia' | 'eye-care'
  fontSize: number
  lineHeight: number
  fontFamily: string
  margin: number

  updateProgress: (p: { fraction: number; cfi: string; location?: unknown }) => void
  setTheme: (t: ReaderState['theme']) => void
  flush: () => Promise<void>
}
```

---

## 4. 同步策略

```
引擎 relocate 事件
      │
      ▼
Zustand（内存，实时更新 UI）
      │
      ▼
  防抖 1s（仅 scroll）         ← 见 ENGINE.md §7
      │
      ▼
SQLite（tauri-plugin-sql）
      │
      └─► 失败则回滚内存态并提示
```

**原则**

1. **内存态服务于 UI**，SQLite 只承载「可恢复点」；
2. 写入**必须防抖**，否则滚动模式会高频触发 IO；
3. 异常退出最多丢失 1 秒进度（可接受的取舍）；
4. 云同步为**可选能力**，默认关闭，接口预留。

---

## 5. 迁移

- 数据库由 Rust 侧创建与迁移；
- 使用 `PRAGMA user_version` 管理 schema 版本；
- 每次迁移必须**幂等**且**可回滚到空库重建**。
