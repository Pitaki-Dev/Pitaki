/**
 * 外壳 UI 状态（Zustand）。
 * 主题不在这里 —— 直接用 HeroUI 的 useTheme（它会写 <html> 的 class 与 data-theme，且跟随系统）。
 */
import { create } from 'zustand'

export type FlowMode = 'paginated' | 'scrolled'
/** null = 自动（窄屏 scrolled / 宽屏 paginated，docs/UI.md §6） */
export type FlowPreference = FlowMode | null

const FLOW_KEY = 'pitaki.flow'

function readFlow(): FlowPreference {
  if (typeof localStorage === 'undefined') return null
  const value = localStorage.getItem(FLOW_KEY)
  return value === 'paginated' || value === 'scrolled' ? value : null
}

interface UiState {
  flowPreference: FlowPreference
  setFlowPreference: (flow: FlowPreference) => void
}

export const useUiStore = create<UiState>((set) => ({
  flowPreference: readFlow(),
  setFlowPreference: (flow) => {
    if (flow) localStorage.setItem(FLOW_KEY, flow)
    else localStorage.removeItem(FLOW_KEY)
    set({ flowPreference: flow })
  },
}))

/** 默认策略：窄屏 scrolled、宽屏 paginated */
export function resolveFlow(preference: FlowPreference, isWide: boolean): FlowMode {
  return preference ?? (isWide ? 'paginated' : 'scrolled')
}
