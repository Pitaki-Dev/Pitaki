use std::collections::HashMap;

/// 临时：Step 1 验收 harness 读取的样本清单与输出路径。
/// 环境变量 PITAKI_SPIKE_SAMPLES（逗号分隔的绝对路径）、PITAKI_SPIKE_OUT。
#[tauri::command]
fn spike_env() -> HashMap<String, String> {
    let mut env = HashMap::new();
    for key in ["PITAKI_SPIKE_SAMPLES", "PITAKI_SPIKE_OUT"] {
        if let Ok(value) = std::env::var(key) {
            env.insert(key.to_string(), value);
        }
    }
    env
}

/// 临时：把本地书籍读成原始字节（前端包装成 File 喂给引擎）。
#[tauri::command]
fn read_book(path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("读取 {path} 失败：{e}"))?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// 临时：把 Step 1 验收结果落盘，便于在无头环境下取值。
#[tauri::command]
fn write_spike_result(content: String) -> Result<String, String> {
    let path = std::env::var("PITAKI_SPIKE_OUT")
        .unwrap_or_else(|_| "/tmp/pitaki-step1-spike.json".to_string());
    std::fs::write(&path, content).map_err(|e| format!("写入 {path} 失败：{e}"))?;
    Ok(path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            spike_env,
            read_book,
            write_spike_result
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
