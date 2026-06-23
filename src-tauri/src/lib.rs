mod commands;
mod events;
mod paths;
mod state;
mod upscale;

use tauri::Emitter;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            // Tell the renderer which OS we're on (mirrors the Electron "OS" send).
            let platform = if cfg!(target_os = "windows") {
                "win"
            } else if cfg!(target_os = "macos") {
                "mac"
            } else {
                "linux"
            };
            let _ = app.handle().emit(events::OS, platform);

            // Tauri's resource copying can drop the executable bit; restore it.
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let bin = paths::exec_path(app.handle());
                if let Ok(meta) = std::fs::metadata(&bin) {
                    let mut perms = meta.permissions();
                    perms.set_mode(0o755);
                    let _ = std::fs::set_permissions(&bin, perms);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::upscale_image,
            commands::double_upscale_image,
            commands::batch_upscale_image,
            commands::stop_upscale,
            commands::select_file,
            commands::select_folder,
            commands::select_custom_models_folder,
            commands::get_custom_models_list,
            commands::open_folder,
            commands::paste_image,
            commands::get_file_size,
            commands::get_app_version,
            commands::get_gpu_info,
            commands::get_system_info,
            commands::set_notifications_off,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Symp's Upscale");
}
