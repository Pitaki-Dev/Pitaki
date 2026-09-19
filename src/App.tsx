import { useCallback, useEffect, useRef, useState } from 'react'
import { isTauri, runSpike } from './dev/spike'

/**
 * Step 1 占位界面 —— Step 2（UI 基础）会整体替换。
 * 这里只负责：证明骨架能起来 + 在 Tauri 窗口内自动复跑 Step 0 的 A/B 验证。
 */
export default function App() {
  const [lines, setLines] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const started = useRef(false)

  const run = useCallback(async () => {
    setState('running')
    setLines([])
    try {
      await runSpike(message => setLines(previous => [...previous, message]))
      setState('done')
    } catch (error) {
      setLines(previous => [...previous, `fatal: ${String(error)}`])
      setState('error')
    }
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    // 仅在 Tauri 窗口 + dev 下自动跑，浏览器里手动点按钮
    if (isTauri() && import.meta.env.DEV) void run()
  }, [run])

  return (
    <main style={{ font: '13px/1.6 system-ui, sans-serif', margin: 16 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Pitaki</h1>
      <p style={{ margin: '0 0 12px', color: '#666' }}>
        Step 1 工程骨架 · {isTauri() ? 'Tauri 窗口' : '浏览器'} · 引擎状态：{state}
      </p>
      <p>
        <button onClick={() => void run()} disabled={state === 'running'}>
          {state === 'running' ? '运行中…' : '复跑 Step 0 A/B 验证'}
        </button>
      </p>
      <pre
        style={{
          maxHeight: 320,
          overflow: 'auto',
          background: '#111',
          color: '#7ee787',
          padding: 10,
          borderRadius: 6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {lines.length ? lines.join('\n') : '（暂无输出）'}
      </pre>
      <div id="spike-reader" />
    </main>
  )
}
