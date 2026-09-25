#[cfg(debug_assertions)]
mod dev_smoke;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build());

    // 冒烟命令只在 debug 构建注册：release 里整块不存在（安全边界，见 dev_smoke.rs 模块注释）。
    #[cfg(debug_assertions)]
    {
        builder = builder.invoke_handler(tauri::generate_handler![
            dev_smoke::smoke_env,
            dev_smoke::smoke_read_book,
            dev_smoke::smoke_write_result
        ]);
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
