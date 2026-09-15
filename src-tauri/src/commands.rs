//! Tauri command handlers — port of electron/commands/*.ts.

use std::fs;
use std::path::Path;
use std::sync::atomic::Ordering;
use std::thread;

use base64::Engine;
use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_notification::NotificationExt;

use crate::events;
use crate::orientation;
use crate::passes;
use crate::resolution;
use crate::paths::{exec_path, models_path};
use crate::state::AppState;
use crate::upscale::{
    batch_args, double_first_pass_args, double_second_pass_args, single_image_args, spawn_stream,
    BatchArgs, DoubleFirstArgs, DoubleSecondArgs, SingleArgs,
};

// ── Payload types (mirror common/types/types.d.ts) ──────────────────────────

/// Deserialize a JSON string-or-null as a plain String (null → "").
fn deser_opt_str<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    let opt: Option<String> = serde::Deserialize::deserialize(d)?;
    Ok(opt.unwrap_or_default())
}

/// Deserialize a JSON number-or-null as i64 (null → 0). The renderer's
/// tileSize atom is `number | null` and defaults to null.
fn deser_opt_i64<'de, D: serde::Deserializer<'de>>(d: D) -> Result<i64, D::Error> {
    let opt: Option<i64> = serde::Deserialize::deserialize(d)?;
    Ok(opt.unwrap_or(0))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageUpscaylPayload {
    pub image_path: String,
    pub output_path: String,
    pub scale: String,
    pub model: String,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub gpu_id: String,
    pub save_image_as: String,
    #[serde(default)]
    pub overwrite: bool,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub compression: String,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub custom_width: String,
    #[serde(default)]
    pub use_custom_width: bool,
    #[serde(default, deserialize_with = "deser_opt_i64")]
    pub tile_size: i64,
    #[serde(default)]
    pub tta_mode: bool,
    #[serde(default)]
    pub copy_metadata: bool,
    #[serde(default)]
    pub output_dpi: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoubleUpscaylPayload {
    pub image_path: String,
    pub output_path: String,
    pub scale: String,
    pub model: String,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub gpu_id: String,
    pub save_image_as: String,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub compression: String,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub custom_width: String,
    #[serde(default)]
    pub use_custom_width: bool,
    #[serde(default, deserialize_with = "deser_opt_i64")]
    pub tile_size: i64,
    #[serde(default)]
    pub tta_mode: bool,
    #[serde(default)]
    pub copy_metadata: bool,
    #[serde(default)]
    pub output_dpi: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchUpscaylPayload {
    pub batch_folder_path: String,
    pub output_path: String,
    pub model: String,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub gpu_id: String,
    pub save_image_as: String,
    pub scale: String,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub compression: String,
    #[serde(default, deserialize_with = "deser_opt_str")]
    pub custom_width: String,
    #[serde(default)]
    pub use_custom_width: bool,
    #[serde(default, deserialize_with = "deser_opt_i64")]
    pub tile_size: i64,
    #[serde(default)]
    pub tta_mode: bool,
    #[serde(default)]
    pub copy_metadata: bool,
    #[serde(default)]
    pub output_dpi: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardFile {
    pub name: String,
    pub path: String,
    pub extension: String,
    #[serde(default)]
    pub encoded_buffer: String,
}

// ── Helpers ─────────────────────────────────────────────────────────────────

fn sep() -> char {
    std::path::MAIN_SEPARATOR
}

fn is_default_model(model: &str) -> bool {
    model == "upscayl-lite-4x" || model == "upscayl-standard-4x"
}

fn hex_val(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

/// Equivalent of decodeURIComponent for file paths.
fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (hex_val(bytes[i + 1]), hex_val(bytes[i + 2])) {
                out.push(h * 16 + l);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

fn filename_from_path(p: &str) -> String {
    if p.is_empty() {
        return String::new();
    }
    let s = if p.contains('/') { '/' } else { '\\' };
    p.rsplit(s).next().unwrap_or(p).to_string()
}

fn directory_from_path(p: &str) -> String {
    let s = if p.contains('/') { '/' } else { '\\' };
    let mut parts: Vec<&str> = p.split(s).collect();
    parts.pop();
    parts.join(&s.to_string())
}

fn file_stem(name: &str) -> String {
    match name.rfind('.') {
        Some(i) if i > 0 => name[..i].to_string(),
        _ => name.to_string(),
    }
}

fn notify(app: &AppHandle, title: &str, body: &str) {
    let off = app.state::<AppState>().notifications_off.load(Ordering::Relaxed);
    if off {
        return;
    }
    let _ = app.notification().builder().title(title).body(body).show();
}

fn resolve_models_path(app: &AppHandle, state: &AppState, model: &str) -> String {
    if is_default_model(model) {
        return models_path(app).to_string_lossy().to_string();
    }
    if let Ok(guard) = state.custom_models_path.lock() {
        if let Some(p) = guard.as_ref() {
            return p.clone();
        }
    }
    models_path(app).to_string_lossy().to_string()
}

/// Runs a chain of x4 inference passes, each resized down to its planned
/// width so the last one lands exactly on the target. Intermediates are
/// temporary PNGs (lossless, so repeated passes don't stack JPEG artefacts)
/// and are always cleaned up. Returns true if the run failed or was stopped.
#[allow(clippy::too_many_arguments)]
fn run_pass_chain(
    app: &AppHandle,
    st: &AppState,
    bin: &Path,
    plan: &[u32],
    first_input: &str,
    final_out: &str,
    models: &str,
    model: &str,
    gpu_id: &str,
    save_image_as: &str,
    compression: &str,
    tile_size: i64,
    tta_mode: bool,
    progress_event: &str,
) -> bool {
    let total = plan.len();
    let mut current_input = first_input.to_string();
    let mut temps: Vec<String> = Vec::new();
    let mut failed = false;

    for (idx, width) in plan.iter().enumerate() {
        if st.stopped.load(Ordering::Relaxed) {
            failed = true;
            break;
        }
        let is_last = idx + 1 == total;

        // Let the UI show overall progress instead of restarting at 0%.
        let _ = app.emit(
            events::UPSCAYL_PASS,
            serde_json::json!({ "current": idx + 1, "total": total }),
        );

        let (out_path, format) = if is_last {
            (final_out.to_string(), save_image_as)
        } else {
            let nanos = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0);
            let mut p = std::env::temp_dir();
            p.push(format!("symps_pass{}_{}.png", idx + 1, nanos));
            let p = p.to_string_lossy().to_string();
            temps.push(p.clone());
            (p, "png")
        };

        let args = crate::upscale::chain_pass_args(&crate::upscale::ChainPassArgs {
            in_file: &current_input,
            out_file: &out_path,
            models_path: models,
            model,
            gpu_id,
            save_image_as: format,
            width: *width,
            // Only compress the final output; intermediates stay lossless.
            compression: if is_last { compression } else { "" },
            tile_size,
            tta_mode,
        });

        if spawn_stream(app, st, bin, &args, progress_event) {
            failed = true;
            break;
        }
        current_input = out_path;
    }

    for t in &temps {
        let _ = fs::remove_file(t);
    }
    failed
}

// ── Upscale commands ────────────────────────────────────────────────────────

#[tauri::command]
pub fn upscale_image(app: AppHandle, payload: ImageUpscaylPayload) {
    thread::spawn(move || {
        let state = app.state::<AppState>();
        let st: &AppState = state.inner();
        st.stopped.store(false, Ordering::Relaxed);
        st.clear_children();

        let custom_width = if payload.use_custom_width {
            payload.custom_width.clone()
        } else {
            String::new()
        };
        let image_path = percent_decode(&payload.image_path);
        let input_dir = directory_from_path(&image_path);
        let output_dir = percent_decode(&payload.output_path);
        let file_name_with_ext = filename_from_path(&image_path);
        let file_name = file_stem(&file_name_with_ext);
        let model_label = payload
            .model
            .strip_prefix("upscayl-")
            .unwrap_or(&payload.model)
            .to_string();

        let scale_or_width = if !custom_width.is_empty() {
            format!("{custom_width}px_")
        } else {
            format!("{}x_", payload.scale)
        };
        let out_file = format!(
            "{output_dir}{}{file_name}_upscaled_{scale_or_width}{model_label}.{}",
            sep(),
            payload.save_image_as
        );

        if Path::new(&out_file).exists() && !payload.overwrite {
            let _ = app.emit(events::UPSCAYL_DONE, out_file);
            return;
        }

        let bin = exec_path(&app);
        let models = resolve_models_path(&app, st, &payload.model);

        // Bake EXIF orientation into a temp copy so the output isn't rotated.
        let decoded_input_dir = percent_decode(&input_dir);
        let decoded_file = percent_decode(&file_name_with_ext);
        let full_input = format!("{decoded_input_dir}{}{decoded_file}", sep());
        let oriented = orientation::normalized_input(&full_input);
        let (arg_input_dir, arg_file) = match &oriented {
            Some(tmp) => (
                directory_from_path(&tmp.to_string_lossy()),
                filename_from_path(&tmp.to_string_lossy()),
            ),
            None => (decoded_input_dir.clone(), decoded_file.clone()),
        };

        // Reaching a target width bigger than one x4 pass needs a chain of
        // passes: the binary caps `-s` at 4 and its `-w` only resizes with a
        // classic filter, so a single pass would be x4 of real detail plus
        // plain interpolation on top.
        let full_input = format!("{arg_input_dir}{}{arg_file}", sep());
        let src_dims = image::image_dimensions(&full_input).ok();

        let target_width: Option<u32> = if !custom_width.is_empty() {
            // Print mode: the width is the target.
            custom_width.parse::<u32>().ok().filter(|w| *w > 0)
        } else {
            // Factor mode: only factors beyond one pass need chaining. 2x/3x/4x
            // are handled natively by `-s`; 6x and 8x are not (the binary
            // silently falls back to x4), so derive a width and chain.
            payload
                .scale
                .parse::<u32>()
                .ok()
                .filter(|s| *s > 4)
                .and_then(|s| src_dims.map(|(w, _)| w.saturating_mul(s)))
        };

        let pass_plan: Vec<u32> = match (target_width, src_dims) {
            (Some(target), Some((src_w, _))) => passes::plan(src_w, target),
            _ => Vec::new(),
        };

        let failed = if pass_plan.len() > 1 {
            run_pass_chain(
                &app,
                st,
                &bin,
                &pass_plan,
                &full_input,
                &out_file,
                &models,
                &payload.model,
                &payload.gpu_id,
                &payload.save_image_as,
                &payload.compression,
                payload.tile_size,
                payload.tta_mode,
                events::UPSCAYL_PROGRESS,
            )
        } else {
            let args = single_image_args(&SingleArgs {
                input_dir: &arg_input_dir,
                file_name_with_ext: &arg_file,
                out_file: &out_file,
                models_path: &models,
                model: &payload.model,
                scale: &payload.scale,
                gpu_id: &payload.gpu_id,
                save_image_as: &payload.save_image_as,
                custom_width: &custom_width,
                compression: &payload.compression,
                tile_size: payload.tile_size,
                tta_mode: payload.tta_mode,
            });
            spawn_stream(&app, st, &bin, &args, events::UPSCAYL_PROGRESS)
        };
        // Clean up the temporary orientation-normalized input, if any.
        if let Some(tmp) = &oriented {
            let _ = fs::remove_file(tmp);
        }
        if !failed && !st.stopped.load(Ordering::Relaxed) {
            // Stamp the print resolution so the file opens at its intended
            // physical size instead of defaulting to 72 DPI.
            if let Some(dpi) = payload.output_dpi {
                resolution::write_dpi(&out_file, dpi);
            }
            let _ = app.emit(events::UPSCAYL_DONE, out_file);
            notify(&app, "Symp's Upscale", "Image upscaled successfully!");
        }
    });
}

#[tauri::command]
pub fn double_upscale_image(app: AppHandle, payload: DoubleUpscaylPayload) {
    thread::spawn(move || {
        let state = app.state::<AppState>();
        let st: &AppState = state.inner();
        st.stopped.store(false, Ordering::Relaxed);
        st.clear_children();

        let custom_width = if payload.use_custom_width {
            payload.custom_width.clone()
        } else {
            String::new()
        };
        let image_path = percent_decode(&payload.image_path);
        let input_dir = directory_from_path(&image_path);
        let output_dir = percent_decode(&payload.output_path);
        let full_file_name = filename_from_path(&image_path);
        let file_name = file_stem(&full_file_name);

        let scale_or_width = if !custom_width.is_empty() {
            format!("{custom_width}px_")
        } else {
            format!("{}x_", payload.scale)
        };
        let out_file = format!(
            "{output_dir}{}{file_name}_upscayl_{scale_or_width}{}.{}",
            sep(),
            payload.model,
            payload.save_image_as
        );

        let bin = exec_path(&app);
        let models = resolve_models_path(&app, st, &payload.model);

        // Bake EXIF orientation into a temp copy so the output isn't rotated.
        let decoded_file = percent_decode(&full_file_name);
        let full_input = format!("{input_dir}{}{decoded_file}", sep());
        let oriented = orientation::normalized_input(&full_input);
        let (arg_input_dir, arg_file) = match &oriented {
            Some(tmp) => (
                directory_from_path(&tmp.to_string_lossy()),
                filename_from_path(&tmp.to_string_lossy()),
            ),
            None => (input_dir.clone(), decoded_file.clone()),
        };

        // FIRST PASS
        let args1 = double_first_pass_args(&DoubleFirstArgs {
            input_dir: &arg_input_dir,
            full_file_name: &arg_file,
            out_file: &out_file,
            models_path: &models,
            model: &payload.model,
            scale: &payload.scale,
            gpu_id: &payload.gpu_id,
            save_image_as: &payload.save_image_as,
            custom_width: &custom_width,
            tile_size: payload.tile_size,
        });
        let failed1 = spawn_stream(&app, st, &bin, &args1, events::DOUBLE_UPSCAYL_PROGRESS);
        // Clean up the temporary orientation-normalized input, if any.
        if let Some(tmp) = &oriented {
            let _ = fs::remove_file(tmp);
        }
        if failed1 || st.stopped.load(Ordering::Relaxed) {
            return;
        }

        // SECOND PASS
        let args2 = double_second_pass_args(&DoubleSecondArgs {
            out_file: &out_file,
            models_path: &models,
            model: &payload.model,
            scale: &payload.scale,
            gpu_id: &payload.gpu_id,
            save_image_as: &payload.save_image_as,
            custom_width: &custom_width,
            compression: &payload.compression,
            tile_size: payload.tile_size,
            tta_mode: payload.tta_mode,
        });
        let failed2 = spawn_stream(&app, st, &bin, &args2, events::DOUBLE_UPSCAYL_PROGRESS);
        if !failed2 && !st.stopped.load(Ordering::Relaxed) {
            // Stamp the print resolution so the file opens at its intended
            // physical size instead of defaulting to 72 DPI.
            if let Some(dpi) = payload.output_dpi {
                resolution::write_dpi(&out_file, dpi);
            }
            let _ = app.emit(events::DOUBLE_UPSCAYL_DONE, out_file);
            notify(&app, "Symp's Upscale", "Image upscayled successfully!");
        }
    });
}

#[tauri::command]
pub fn batch_upscale_image(app: AppHandle, payload: BatchUpscaylPayload) {
    thread::spawn(move || {
        let state = app.state::<AppState>();
        let st: &AppState = state.inner();
        st.stopped.store(false, Ordering::Relaxed);
        st.clear_children();

        let custom_width = if payload.use_custom_width {
            payload.custom_width.clone()
        } else {
            String::new()
        };
        let input_dir = percent_decode(&payload.batch_folder_path);
        let mut output_folder = percent_decode(&payload.output_path);
        let model_label = payload
            .model
            .strip_prefix("upscayl-")
            .unwrap_or(&payload.model)
            .to_string();
        let size_part = if !custom_width.is_empty() {
            format!("{custom_width}px")
        } else {
            format!("{}x", payload.scale)
        };
        let folder_name = format!(
            "upscaled_{}_{model_label}_{size_part}",
            payload.save_image_as
        );
        output_folder = format!("{output_folder}{}{folder_name}", sep());

        if !Path::new(&output_folder).exists() {
            let _ = fs::create_dir_all(&output_folder);
        }

        let bin = exec_path(&app);
        let models = resolve_models_path(&app, st, &payload.model);
        let args = batch_args(&BatchArgs {
            input_dir: &input_dir,
            output_dir: &output_folder,
            models_path: &models,
            model: &payload.model,
            scale: &payload.scale,
            gpu_id: &payload.gpu_id,
            save_image_as: &payload.save_image_as,
            custom_width: &custom_width,
            compression: &payload.compression,
            tile_size: payload.tile_size,
            tta_mode: payload.tta_mode,
        });

        let failed = spawn_stream(&app, st, &bin, &args, events::FOLDER_UPSCAYL_PROGRESS);
        if !failed && !st.stopped.load(Ordering::Relaxed) {
            // Stamp every result so the whole batch opens at the right size.
            if let Some(dpi) = payload.output_dpi {
                resolution::write_dpi_in_dir(&output_folder, dpi);
            }
            let _ = app.emit(events::FOLDER_UPSCAYL_DONE, output_folder);
            notify(&app, "Symp's Upscale", "Images upscaled successfully!");
        }
    });
}

#[tauri::command]
pub fn stop_upscale(state: State<'_, AppState>) {
    state.stopped.store(true, Ordering::Relaxed);
    if let Ok(children) = state.children.lock() {
        for child in children.iter() {
            if let Ok(mut c) = child.lock() {
                let _ = c.kill();
            }
        }
    }
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

const IMAGE_EXTS: &[&str] = &["png", "jpg", "jpeg", "jfif", "webp"];

#[tauri::command]
pub async fn select_file(app: AppHandle) -> Option<String> {
    let mut dialog = app.dialog().file().add_filter("Images", IMAGE_EXTS);
    if let Some(dir) = app.state::<AppState>().saved_image_path.lock().ok().and_then(|g| g.clone()) {
        dialog = dialog.set_directory(dir);
    }
    let picked = dialog.blocking_pick_file();

    let path = picked.and_then(|f| f.into_path().ok())?;
    let path_str = path.to_string_lossy().to_string();

    let lower = path_str.to_lowercase();
    let valid = IMAGE_EXTS.iter().any(|e| lower.ends_with(&format!(".{e}")));
    if !valid {
        app.dialog()
            .message("The selected file is not a valid image. Make sure you select a '.png', '.jpg', or '.webp' file.")
            .title("Invalid File")
            .kind(MessageDialogKind::Error)
            .blocking_show();
        return None;
    }

    if let Ok(mut g) = app.state::<AppState>().saved_image_path.lock() {
        *g = Some(directory_from_path(&path_str));
    }
    Some(path_str)
}

#[tauri::command]
pub async fn select_folder(app: AppHandle) -> Option<String> {
    let mut dialog = app.dialog().file();
    if let Some(dir) = app.state::<AppState>().saved_batch_path.lock().ok().and_then(|g| g.clone()) {
        dialog = dialog.set_directory(dir);
    }
    let picked = dialog.blocking_pick_folder();
    let path = picked.and_then(|f| f.into_path().ok())?;
    let path_str = path.to_string_lossy().to_string();
    if let Ok(mut g) = app.state::<AppState>().saved_batch_path.lock() {
        *g = Some(path_str.clone());
    }
    Some(path_str)
}

#[tauri::command]
pub async fn select_custom_models_folder(app: AppHandle) -> Option<String> {
    let picked = app.dialog().file().blocking_pick_folder();
    let path = picked.and_then(|f| f.into_path().ok())?;
    let path_str = path.to_string_lossy().to_string();

    let ends_models = path_str.ends_with(&format!("{}models", sep()))
        || path_str.ends_with(&format!("{}models{}", sep(), sep()));
    if !ends_models {
        app.dialog()
            .message("Please make sure that the folder name is 'models' and nothing else.")
            .title("Invalid Folder")
            .kind(MessageDialogKind::Error)
            .blocking_show();
        return None;
    }

    if let Ok(mut g) = app.state::<AppState>().custom_models_path.lock() {
        *g = Some(path_str.clone());
    }
    emit_models_list(&app, &path_str);
    Some(path_str)
}

// ── Models ──────────────────────────────────────────────────────────────────

fn emit_models_list(app: &AppHandle, folder: &str) {
    let mut models: Vec<String> = Vec::new();
    if let Ok(entries) = fs::read_dir(folder) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let lower = name.to_lowercase();
            if lower.ends_with(".param") || lower.ends_with(".bin") {
                let stem = file_stem(&name);
                if !models.contains(&stem) {
                    models.push(stem);
                }
            }
        }
    }
    let _ = app.emit(events::CUSTOM_MODEL_FILES_LIST, models);
}

#[tauri::command]
pub fn get_custom_models_list(app: AppHandle, state: State<'_, AppState>, payload: Option<String>) {
    if let Some(folder) = payload {
        if let Ok(mut g) = state.custom_models_path.lock() {
            *g = Some(folder.clone());
        }
        emit_models_list(&app, &folder);
    }
}

// ── Misc ────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn open_folder(app: AppHandle, payload: String) {
    use tauri_plugin_opener::OpenerExt;
    let _ = app.opener().open_path(payload, None::<&str>);
}

#[tauri::command]
pub fn paste_image(app: AppHandle, payload: ClipboardFile) {
    if payload.name.is_empty() || payload.encoded_buffer.is_empty() {
        return;
    }
    if !IMAGE_EXTS.contains(&payload.extension.to_lowercase().as_str()) {
        let _ = app.emit(events::PASTE_IMAGE_SAVE_ERROR, "Unsupported Image Format");
        return;
    }
    let target = format!("{}{}{}", payload.path, sep(), payload.name);
    match base64::engine::general_purpose::STANDARD.decode(&payload.encoded_buffer) {
        Ok(bytes) => match fs::write(&target, bytes) {
            Ok(_) => {
                let _ = app.emit(events::PASTE_IMAGE_SAVE_SUCCESS, target);
            }
            Err(e) => {
                let _ = app.emit(events::PASTE_IMAGE_SAVE_ERROR, e.to_string());
            }
        },
        Err(e) => {
            let _ = app.emit(events::PASTE_IMAGE_SAVE_ERROR, e.to_string());
        }
    }
}

#[tauri::command]
pub fn get_file_size(path: String) -> Option<u64> {
    fs::metadata(path).ok().map(|m| m.len())
}

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> String {
    format!("{} FOSS", app.package_info().version)
}

#[tauri::command]
pub fn get_gpu_info() -> serde_json::Value {
    serde_json::Value::Null
}

#[tauri::command]
pub fn get_system_info() -> serde_json::Value {
    use sysinfo::System;
    let sys = System::new_all();
    let cpus = sys.cpus();
    let model = cpus
        .first()
        .map(|c| c.brand().trim().to_string())
        .unwrap_or_default();

    let platform = if cfg!(target_os = "windows") {
        "win"
    } else if cfg!(target_os = "macos") {
        "mac"
    } else {
        "linux"
    };

    serde_json::json!({
        "platform": platform,
        "release": System::os_version().unwrap_or_default(),
        "arch": std::env::consts::ARCH,
        "model": model,
        "cpuCount": cpus.len(),
    })
}

#[tauri::command]
pub fn set_notifications_off(state: State<'_, AppState>, value: bool) {
    state.notifications_off.store(value, Ordering::Relaxed);
}
