//! 仅 debug 构建注册的引擎冒烟命令（配套 tools/tauri-smoke/）。
//!
//! ⚠️ **安全边界 —— 本模块绝不能进入 release 构建。**
//! `smoke_read_book` 接受前端传入的**任意路径**并整读；`smoke_write_result` 会把内容写到
//! env 指定的路径。Tauri v2 下本地命令对自身前端默认可达，而这些前端又可能被不可信内容影响：
//! 上游 foliate-js 的正文与宿主**同源**（`blob:` URL，上游 README 自认
//! *"currently impossible to do so securely"*），恶意 EPUB 若能触达父文档，就等于拿到
//! 一个任意文件读取入口。
//!
//! 门控方式：整模块只在 `#[cfg(debug_assertions)]` 下编译，命令也只在 debug 下注册（见 lib.rs）。
//! 验证：`cargo build --release` 后二进制里应**搜不到** `smoke_read_book` 等字符串。
//!
//! 写路径只来自环境变量（前端只能传内容），读路径来自前端 —— 这正是必须门控的原因。

use std::collections::HashMap;

/// 样本清单与输出路径（PITAKI_SMOKE_SAMPLES 逗号分隔的绝对路径 / PITAKI_SMOKE_OUT）
#[tauri::command]
pub fn smoke_env() -> HashMap<String, String> {
    let mut env = HashMap::new();
    for key in ["PITAKI_SMOKE_SAMPLES", "PITAKI_SMOKE_OUT"] {
        if let Ok(value) = std::env::var(key) {
            env.insert(key.to_string(), value);
        }
    }
    env
}

/// 把本地书籍读成原始字节（前端包装成 File 喂给引擎）。仅冒烟用。
#[tauri::command]
pub fn smoke_read_book(path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("读取 {path} 失败：{e}"))?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// 把冒烟报告落盘，便于无头环境取值。写路径只由 env 决定。
#[tauri::command]
pub fn smoke_write_result(content: String) -> Result<String, String> {
    let path = std::env::var("PITAKI_SMOKE_OUT")
        .unwrap_or_else(|_| "/tmp/pitaki-smoke.json".to_string());
    std::fs::write(&path, content).map_err(|e| format!("写入 {path} 失败：{e}"))?;
    Ok(path)
}
