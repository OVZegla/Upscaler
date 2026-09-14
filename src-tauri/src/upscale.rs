//! upscayl-ncnn argument construction and stderr streaming.
//! Mirrors electron/utils/get-arguments.ts and spawn-upscayl.ts.

use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter};

use crate::events;
use crate::state::{AppState, SharedChild};

/// Initial scale baked into a model name (mirrors common/check-model-scale.ts).
fn model_scale(model: &str) -> &'static str {
    let m = model.to_lowercase();
    if m.contains("x2") || m.contains("2x") {
        "2"
    } else if m.contains("x3") || m.contains("3x") {
        "3"
    } else {
        "4"
    }
}

fn sep() -> char {
    std::path::MAIN_SEPARATOR
}

fn join(dir: &str, file: &str) -> String {
    format!("{dir}{}{file}", sep())
}

/// Pushes `-flag value` pairs, skipping empty values (mirrors the JS
/// `.filter(arg => arg !== "")` behaviour).
struct Args(Vec<String>);
impl Args {
    fn new() -> Self {
        Args(Vec::new())
    }
    fn pair(&mut self, flag: &str, value: impl Into<String>) {
        let v = value.into();
        if v.is_empty() {
            return;
        }
        self.0.push(flag.to_string());
        self.0.push(v);
    }
    fn flag(&mut self, flag: &str, on: bool) {
        if on {
            self.0.push(flag.to_string());
        }
    }
    fn into_vec(self) -> Vec<String> {
        self.0
    }
}

pub struct SingleArgs<'a> {
    pub input_dir: &'a str,
    pub file_name_with_ext: &'a str,
    pub out_file: &'a str,
    pub models_path: &'a str,
    pub model: &'a str,
    pub scale: &'a str,
    pub gpu_id: &'a str,
    pub save_image_as: &'a str,
    pub custom_width: &'a str,
    pub compression: &'a str,
    pub tile_size: i64,
    pub tta_mode: bool,
}

pub fn single_image_args(a: &SingleArgs) -> Vec<String> {
    let include_scale = model_scale(a.model) != a.scale && a.custom_width.is_empty();
    let mut args = Args::new();
    args.pair("-i", join(a.input_dir, a.file_name_with_ext));
    args.pair("-o", a.out_file);
    if include_scale {
        args.pair("-s", a.scale);
    }
    args.pair("-m", a.models_path);
    args.pair("-n", a.model);
    args.pair("-g", a.gpu_id);
    args.pair("-f", a.save_image_as);
    args.pair("-w", a.custom_width);
    args.pair("-c", a.compression);
    if a.tile_size != 0 {
        args.pair("-t", a.tile_size.to_string());
    }
    args.flag("-x", a.tta_mode);
    args.into_vec()
}

pub struct DoubleFirstArgs<'a> {
    pub input_dir: &'a str,
    pub full_file_name: &'a str,
    pub out_file: &'a str,
    pub models_path: &'a str,
    pub model: &'a str,
    pub scale: &'a str,
    pub gpu_id: &'a str,
    pub save_image_as: &'a str,
    pub custom_width: &'a str,
    pub tile_size: i64,
}

pub fn double_first_pass_args(a: &DoubleFirstArgs) -> Vec<String> {
    let include_scale = model_scale(a.model) != a.scale && a.custom_width.is_empty();
    let mut args = Args::new();
    args.pair("-i", join(a.input_dir, a.full_file_name));
    args.pair("-o", a.out_file);
    if include_scale {
        args.pair("-s", a.scale);
    }
    args.pair("-m", a.models_path);
    args.pair("-n", a.model);
    args.pair("-g", a.gpu_id);
    args.pair("-f", a.save_image_as);
    if a.tile_size != 0 {
        args.pair("-t", a.tile_size.to_string());
    }
    args.into_vec()
}

pub struct DoubleSecondArgs<'a> {
    pub out_file: &'a str,
    pub models_path: &'a str,
    pub model: &'a str,
    pub scale: &'a str,
    pub gpu_id: &'a str,
    pub save_image_as: &'a str,
    pub custom_width: &'a str,
    pub compression: &'a str,
    pub tile_size: i64,
    pub tta_mode: bool,
}

pub fn double_second_pass_args(a: &DoubleSecondArgs) -> Vec<String> {
    let include_scale = model_scale(a.model) != a.scale && a.custom_width.is_empty();
    let mut args = Args::new();
    args.pair("-i", a.out_file);
    args.pair("-o", a.out_file);
    if include_scale {
        args.pair("-s", a.scale);
    }
    args.pair("-m", a.models_path);
    args.pair("-n", a.model);
    args.pair("-g", a.gpu_id);
    args.pair("-f", a.save_image_as);
    args.pair("-w", a.custom_width);
    args.pair("-c", a.compression);
    if a.tile_size != 0 {
        args.pair("-t", a.tile_size.to_string());
    }
    args.flag("-x", a.tta_mode);
    args.into_vec()
}

pub struct BatchArgs<'a> {
    pub input_dir: &'a str,
    pub output_dir: &'a str,
    pub models_path: &'a str,
    pub model: &'a str,
    pub scale: &'a str,
    pub gpu_id: &'a str,
    pub save_image_as: &'a str,
    pub custom_width: &'a str,
    pub compression: &'a str,
    pub tile_size: i64,
    pub tta_mode: bool,
}

pub fn batch_args(a: &BatchArgs) -> Vec<String> {
    let include_scale = model_scale(a.model) != a.scale && a.custom_width.is_empty();
    let mut args = Args::new();
    args.pair("-i", a.input_dir);
    args.pair("-o", a.output_dir);
    if include_scale {
        args.pair("-s", a.scale);
    }
    args.pair("-m", a.models_path);
    args.pair("-n", a.model);
    args.pair("-g", a.gpu_id);
    args.pair("-f", a.save_image_as);
    args.pair("-w", a.custom_width);
    args.pair("-c", a.compression);
    if a.tile_size != 0 {
        args.pair("-t", a.tile_size.to_string());
    }
    args.flag("-x", a.tta_mode);
    args.into_vec()
}

/// Spawns the binary and streams its stderr, emitting `progress_event` for
/// every chunk. Blocks the calling thread until the process exits.
/// Returns `true` if the run failed.
pub fn spawn_stream(
    app: &AppHandle,
    state: &AppState,
    bin: &Path,
    args: &[String],
    progress_event: &str,
) -> bool {
    let mut cmd = Command::new(bin);
    cmd.args(args).stderr(Stdio::piped()).stdout(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW — don't flash a console window.
        cmd.creation_flags(0x0800_0000);
    }

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit(events::UPSCAYL_ERROR, format!("Failed to start upscayl: {e}"));
            return true;
        }
    };

    let mut stderr = match child.stderr.take() {
        Some(s) => s,
        None => {
            let _ = app.emit(events::UPSCAYL_ERROR, "Could not capture upscayl output");
            let _ = child.kill();
            return true;
        }
    };

    let shared: SharedChild = Arc::new(Mutex::new(child));
    state.register_child(shared.clone());

    let mut failed = false;
    let mut buf = [0u8; 4096];
    loop {
        match stderr.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                let s = String::from_utf8_lossy(&buf[..n]).to_string();
                let _ = app.emit(progress_event, s.clone());
                if s.contains("Error") || s.contains("failed") {
                    failed = true;
                    let _ = app.emit(events::UPSCAYL_ERROR, s.clone());
                    if let Ok(mut c) = shared.lock() {
                        let _ = c.kill();
                    }
                    break;
                } else if s.contains("Resizing") {
                    let _ = app.emit(events::SCALING_AND_CONVERTING, "");
                }
            }
            Err(_) => break,
        }
    }

    if let Ok(mut c) = shared.lock() {
        let _ = c.wait();
    }
    failed
}
