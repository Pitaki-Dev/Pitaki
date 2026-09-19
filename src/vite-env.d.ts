/**
 * 只声明本项目实际用到的 Vite 注入变量。
 * （不引用 `vite/client`：TypeScript 7 在 pnpm 布局下解析该 type library 会报 TS6054。）
 */
interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
