/**
 * 自写轻量路由（不引 React Router，见 README「依赖控制原则」）。
 * hash 路由：`#/library` / `#/reader` / `#/settings`
 * 用 useSyncExternalStore 订阅 hashchange，天然支持浏览器前进/后退。
 */
import { useSyncExternalStore } from 'react'

export const ROUTES = ['library', 'reader', 'settings'] as const
export type Route = (typeof ROUTES)[number]

export const DEFAULT_ROUTE: Route = 'library'

function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, '').split('?')[0] ?? ''
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : DEFAULT_ROUTE
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getSnapshot(): string {
  return window.location.hash
}

/** SSR/测试环境下没有 window.location.hash，给个稳定初值 */
function getServerSnapshot(): string {
  return `#/${DEFAULT_ROUTE}`
}

export function useRoute(): Route {
  return parse(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot))
}

export function navigate(route: Route): void {
  if (parse(window.location.hash) === route) return
  window.location.hash = `#/${route}`
}

/** 生成 href，保留锚点语义（右键新标签、屏幕阅读器都能识别） */
export function hrefOf(route: Route): string {
  return `#/${route}`
}
