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

pub struct ChainPassArgs<'a> {
    /// Full path of this pass's input.
    pub in_file: &'a str,
    /// Full path this pass writes to.
    pub out_file: &'a str,
    pub models_path: &'a str,
    pub model: &'a str,
    pub gpu_id: &'a str,
    /// Output format for this pass (PNG for intermediates — lossless).
    pub save_image_as: &'a str,
    /// Width this pass must end at. The binary infers at x4 then resizes
    /// down to this, so it is always a reduction.
    pub width: u32,
    pub compression: &'a str,
    pub tile_size: i64,
    pub tta_mode: bool,
}

/// Args for one pass of a chained upscale. No `-s`: the model always infers
/// at its native scale, and the width is what pins the result.
pub fn chain_pass_args(a: &ChainPassArgs) -> Vec<String> {
    let mut args = Args::new();
    args.pair("-i", a.in_file);
    args.pair("-o", a.out_file);
    args.pair("-m", a.models_path);
    args.pair("-n", a.model);
    args.pair("-g", a.gpu_id);
    args.pair("-f", a.save_image_as);
    args.pair("-w", a.width.to_string());
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

/// What a run of the engine ended up doing.
///
/// The exit status used to be thrown away, which is how a process that died
/// before reaching `main` was reported to the user as a success: nothing was
/// printed, so nothing matched "Error", so the run "worked" and the interface
/// went looking for a file that was never written.
#[derive(Debug, Default, Clone)]
pub struct RunOutcome {
    /// The job must not be treated as finished.
    pub failed: bool,
    /// Process exit code, when the process exited on its own.
    pub code: Option<i32>,
    /// True if the engine printed anything at all. A run with no output
    /// never got as far as its own code.
    pub saw_output: bool,
}

impl RunOutcome {
    /// Extra sentence for a run that never said anything. The engine narrates
    /// every job it does, so silence plus a missing file means it never got
    /// started, which is worth saying instead of blaming the destination.
    pub fn silent_hint(&self) -> String {
        if self.saw_output {
            return String::new();
        }
        format!(
            " Le moteur n'a rien affiché (code {}) : il n'a probablement pas \
             pu démarrer. Ouvrez les Paramètres puis « Diagnostic du moteur ».",
            self.code
                .map(|c| c.to_string())
                .unwrap_or_else(|| "inconnu".to_string())
        )
    }
}

/// Plain-French account of an exit code, for codes that mean something
/// specific. Returns None when the code carries no better explanation than
/// its own number.
///
/// Windows reports a process that could not start as an NTSTATUS, which
/// `ExitStatus::code()` hands back as a negative i32; compare on the bits.
pub fn describe_exit_code(code: i32) -> Option<&'static str> {
    match code as u32 {
        0xC000_0135 => Some(
            "une bibliothèque système nécessaire au moteur est introuvable. \
             Il s'agit presque toujours de vulkan-1.dll, fournie par le pilote \
             de la carte graphique : installez ou mettez à jour le pilote \
             graphique de la machine (Intel, AMD ou NVIDIA), puis relancez.",
        ),
        0xC000_0139 => Some(
            "une bibliothèque système présente sur la machine est d'une version \
             incompatible. Mettez à jour le pilote de la carte graphique.",
        ),
        0xC000_0142 => Some(
            "l'initialisation d'une bibliothèque du moteur a échoué, le plus \
             souvent le pilote graphique. Mettez-le à jour, puis relancez.",
        ),
        0xC000_007B => Some(
            "le moteur et la machine ne sont pas de la même architecture \
             (binaire 64 bits sur un système 32 bits, ou l'inverse).",
        ),
        0xC000_0005 => Some(
            "le moteur s'est arrêté brutalement (violation d'accès mémoire). \
             Si cela se répète, réduisez le facteur d'agrandissement : le pilote \
             graphique peut manquer de mémoire vidéo.",
        ),
        0xC000_00FD | 0xC000_0409 => Some(
            "le moteur s'est arrêté brutalement par manque de mémoire de pile.",
        ),
        0xC000_0017 => Some(
            "le moteur n'a pas pu réserver assez de mémoire. Fermez les autres \
             applications ou réduisez le facteur d'agrandissement.",
        ),
        _ => None,
    }
}

/// Directories the Windows loader looks in for a DLL that sits beside neither
/// the executable nor its own folder.
#[cfg(target_os = "windows")]
fn system_library_dirs() -> Vec<std::path::PathBuf> {
    let mut dirs = Vec::new();
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
    dirs.push(std::path::PathBuf::from(&root).join("System32"));
    dirs.push(std::path::PathBuf::from(&root).join("SysWOW64"));
    if let Ok(path) = std::env::var("PATH") {
        for entry in path.split(';').filter(|e| !e.trim().is_empty()) {
            dirs.push(std::path::PathBuf::from(entry));
        }
    }
    dirs
}

/// Where vulkan-1.dll was found, or None when the machine has no Vulkan
/// runtime at all.
///
/// The engine links Vulkan at load time, so without that file the process is
/// killed by the loader before `main` runs: no output, no error, no file, and
/// an exit code we were discarding. The runtime is not something we can ship
/// ourselves, it comes with the graphics driver, so a missing one has to be
/// said out loud with the remedy attached.
///
/// It is also the only such risk left. The import table of the shipped
/// upscayl-bin.exe names vulkan-1.dll, ole32.dll, kernel32.dll, oleaut32.dll
/// and vcomp140.dll; the first is the driver's, the next three belong to
/// Windows, and vcomp140.dll ships beside the executable and itself needs
/// nothing but kernel32. So when the engine dies before printing anything,
/// Vulkan is what is missing.
#[cfg(target_os = "windows")]
pub fn vulkan_runtime() -> Option<std::path::PathBuf> {
    system_library_dirs()
        .into_iter()
        .map(|d| d.join("vulkan-1.dll"))
        .find(|p| p.exists())
}

#[cfg(not(target_os = "windows"))]
pub fn vulkan_runtime() -> Option<std::path::PathBuf> {
    // Only the Windows build loads Vulkan by file name at startup; elsewhere
    // the loader is a system library resolved by the OS and a missing one
    // surfaces as a normal error from the engine.
    Some(std::path::PathBuf::from("system"))
}

/// Result of starting the engine with no arguments at all.
///
/// It then prints its usage text and exits, which is the cheapest possible
/// proof that the executable and every library it links can actually load. A
/// probe that produces no output did not reach the engine's own code.
#[derive(Debug, Clone)]
pub struct EngineProbe {
    pub ran: bool,
    pub code: Option<i32>,
    pub output: String,
    pub error: Option<String>,
}

impl EngineProbe {
    /// True when the executable loaded and ran its own code.
    pub fn loaded(&self) -> bool {
        self.ran && !self.output.trim().is_empty()
    }
}

/// Starts the engine with no arguments and reports what happened. Gives up
/// after five seconds: a probe is a diagnostic, it must never be what hangs.
pub fn probe_engine(bin: &Path) -> EngineProbe {
    let mut cmd = Command::new(bin);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).stdin(Stdio::null());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            return EngineProbe {
                ran: false,
                code: None,
                output: String::new(),
                error: Some(e.to_string()),
            }
        }
    };

    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if std::time::Instant::now() >= deadline {
                    // Kill it and leave. Reading its output here would be the
                    // wrong move: anything the process started of its own
                    // inherited these pipes, so a read would wait on the
                    // grandchild long after the process we killed is gone —
                    // the very hang this deadline exists to prevent.
                    let _ = child.kill();
                    let _ = child.wait();
                    return EngineProbe {
                        ran: true,
                        code: None,
                        output: String::new(),
                        error: Some("le moteur ne répond pas".to_string()),
                    };
                }
                std::thread::sleep(std::time::Duration::from_millis(25));
            }
            Err(e) => {
                return EngineProbe {
                    ran: true,
                    code: None,
                    output: String::new(),
                    error: Some(e.to_string()),
                }
            }
        }
    }

    match child.wait_with_output() {
        Ok(out) => {
            let mut text = String::from_utf8_lossy(&out.stderr).to_string();
            text.push_str(&String::from_utf8_lossy(&out.stdout));
            EngineProbe {
                ran: true,
                code: out.status.code(),
                output: text,
                error: None,
            }
        }
        Err(e) => EngineProbe {
            ran: true,
            code: None,
            output: String::new(),
            error: Some(e.to_string()),
        },
    }
}

/// Spawns the binary and streams its output, emitting `progress_event` for
/// every whole line. Blocks the calling thread until the process exits.
pub fn spawn_stream(
    app: &AppHandle,
    state: &AppState,
    bin: &Path,
    args: &[String],
    progress_event: &str,
) -> RunOutcome {
    // Echo the exact command into the log stream. When a run fails on a user's
    // machine the one thing we never have is what was actually executed, and
    // the binary's own errors quote paths without saying where they came from.
    let _ = app.emit(
        progress_event,
        format!("CMD: {} {}\n", bin.display(), args.join(" ")),
    );

    let mut cmd = Command::new(bin);
    cmd.args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW — don't flash a console window.
        cmd.creation_flags(0x0800_0000);
    }

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit(
                events::UPSCAYL_ERROR,
                format!(
                    "Le moteur d'agrandissement n'a pas pu démarrer : {e} ({}).",
                    bin.display()
                ),
            );
            return RunOutcome {
                failed: true,
                ..Default::default()
            };
        }
    };

    let mut stderr = match child.stderr.take() {
        Some(s) => s,
        None => {
            let _ = app.emit(
                events::UPSCAYL_ERROR,
                "La sortie du moteur d'agrandissement n'a pas pu être lue.",
            );
            let _ = child.kill();
            return RunOutcome {
                failed: true,
                ..Default::default()
            };
        }
    };

    // stdout was piped and never read. The engine writes its progress to
    // stderr, so it looked harmless, but a pipe nobody drains fills up and
    // then blocks the writer for good: one unexpected line on stdout and the
    // run hangs where no timeout would ever rescue it. Drain it on its own
    // thread, and keep what it says — it belongs in the log like the rest.
    let stdout_tail = Arc::new(Mutex::new(String::new()));
    let stdout_thread = child.stdout.take().map(|mut out| {
        let sink = stdout_tail.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match out.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        if let Ok(mut s) = sink.lock() {
                            s.push_str(&String::from_utf8_lossy(&buf[..n]));
                            // Only the tail is ever useful, and this must not
                            // grow without bound on a chatty build.
                            if s.len() > 8192 {
                                let cut = s.len() - 8192;
                                *s = s[cut..].to_string();
                            }
                        }
                    }
                }
            }
        })
    });

    let shared: SharedChild = Arc::new(Mutex::new(child));
    state.register_child(shared.clone());

    let mut failed = false;
    let mut saw_output = false;
    let mut buf = [0u8; 4096];
    // Raw reads land wherever the pipe happens to fill up, which routinely
    // cuts a line in half: "PROGRESS: 3" | "7.50%". Emitting those halves
    // made the UI read 7.50% out of a 37.50% message and the bar jump
    // backwards. Buffer instead, and only ever emit whole lines.
    let mut pending: Vec<u8> = Vec::new();
    // Safety valve: if the binary ever emits a huge run without a line
    // break, flush rather than growing without bound.
    const MAX_PENDING: usize = 64 * 1024;

    loop {
        match stderr.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                pending.extend_from_slice(&buf[..n]);

                // ncnn ends progress lines with \r (it overwrites in place)
                // and regular output with \n, so both count as boundaries.
                let cut = pending
                    .iter()
                    .rposition(|b| *b == b'\n' || *b == b'\r')
                    .map(|p| p + 1)
                    .unwrap_or(if pending.len() >= MAX_PENDING {
                        pending.len()
                    } else {
                        0
                    });
                if cut == 0 {
                    continue; // nothing complete yet — wait for the rest
                }

                let complete: Vec<u8> = pending.drain(..cut).collect();
                // Decode only whole lines, so a multi-byte char is never
                // split across two decodes.
                let s = String::from_utf8_lossy(&complete).to_string();

                saw_output = true;
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

    // A final line without a trailing separator would otherwise be dropped.
    if !failed && !pending.is_empty() {
        saw_output = true;
        let s = String::from_utf8_lossy(&pending).to_string();
        let _ = app.emit(progress_event, s);
    }

    let status = match shared.lock() {
        Ok(mut c) => c.wait().ok(),
        Err(_) => None,
    };

    if let Some(t) = stdout_thread {
        let _ = t.join();
    }
    if let Ok(s) = stdout_tail.lock() {
        if !s.trim().is_empty() {
            saw_output = true;
            let _ = app.emit(progress_event, s.clone());
        }
    }

    let code = status.as_ref().and_then(|s| s.code());
    let _ = app.emit(
        progress_event,
        match code {
            Some(c) => format!("EXIT: {c}\n"),
            None => "EXIT: (arrêté par un signal)\n".to_string(),
        },
    );

    // The engine's exit status, which this function used to discard. Every
    // Windows report of "it said it worked and there is no file" came through
    // here: a process killed by the loader prints nothing, so the stderr scan
    // above found no "Error", and the job was announced as a success.
    //
    // A non-zero exit after the user pressed Stop is our own kill, and a run
    // that already reported its own error does not need a second message.
    let stopped = state.stopped.load(std::sync::atomic::Ordering::Relaxed);
    if !failed && !stopped {
        match status {
            Some(s) if !s.success() => {
                failed = true;
                let detail = code.and_then(describe_exit_code);
                let message = match (detail, saw_output) {
                    (Some(d), _) => format!("Le moteur d'agrandissement a échoué : {d}"),
                    (None, true) => format!(
                        "Le moteur d'agrandissement s'est arrêté en erreur{}. \
                         Le détail est dans le journal ci-dessous.",
                        match code {
                            Some(c) => format!(" (code {c})"),
                            None => String::new(),
                        }
                    ),
                    (None, false) => format!(
                        "Le moteur d'agrandissement s'est arrêté immédiatement, \
                         sans rien afficher{}. Il n'a donc pas pu démarrer : \
                         ouvrez les Paramètres puis « Diagnostic du moteur » \
                         pour savoir ce qui manque sur cette machine.",
                        match code {
                            Some(c) => format!(" (code {c})"),
                            None => String::new(),
                        }
                    ),
                };
                let _ = app.emit(events::UPSCAYL_ERROR, message);
            }
            // Exit 0 with no output at all is not a success either: the engine
            // always narrates what it does. Let the caller's file check speak.
            _ => {}
        }
    }

    RunOutcome {
        failed,
        code,
        saw_output,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dll_not_found_is_explained_as_a_driver_problem() {
        // 0xC0000135 as it arrives from ExitStatus::code().
        let msg = describe_exit_code(-1_073_741_515).expect("explained");
        assert!(msg.contains("vulkan-1.dll"));
        assert!(msg.contains("pilote"));
    }

    #[test]
    fn known_windows_statuses_are_all_explained() {
        for code in [
            0xC000_0135u32,
            0xC000_0139,
            0xC000_0142,
            0xC000_007B,
            0xC000_0005,
            0xC000_00FD,
            0xC000_0409,
            0xC000_0017,
        ] {
            assert!(
                describe_exit_code(code as i32).is_some(),
                "{code:#x} should be explained"
            );
        }
    }

    #[test]
    fn an_ordinary_failure_gets_no_invented_explanation() {
        assert!(describe_exit_code(1).is_none());
        assert!(describe_exit_code(-1).is_none());
        assert!(describe_exit_code(255).is_none());
    }

    /// Writes an executable script and hands back its path. Lets the probe be
    /// tested against real processes rather than a stand-in for one.
    #[cfg(unix)]
    fn script(name: &str, body: &str) -> std::path::PathBuf {
        use std::os::unix::fs::PermissionsExt;
        let mut p = std::env::temp_dir();
        p.push(format!("symps_probe_{name}_{}", std::process::id()));
        std::fs::write(&p, format!("#!/bin/sh\n{body}\n")).unwrap();
        let mut perms = std::fs::metadata(&p).unwrap().permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&p, perms).unwrap();
        p
    }

    #[cfg(unix)]
    #[test]
    fn probing_a_binary_that_prints_its_usage_proves_it_loads() {
        // What the engine does with no arguments: complain, and exit non-zero.
        let p = script("usage", "echo 'Usage: upscayl-bin -i in -o out' >&2\nexit 1");
        let probe = probe_engine(&p);
        let _ = std::fs::remove_file(&p);
        assert!(probe.ran);
        assert_eq!(probe.code, Some(1));
        assert!(probe.loaded(), "non-zero exit with output still loads");
        assert!(probe.output.contains("Usage"));
    }

    #[cfg(unix)]
    #[test]
    fn probing_a_binary_that_dies_silently_reports_not_loaded() {
        // What a process killed by the loader looks like from out here.
        let p = script("silent", "exit 1");
        let probe = probe_engine(&p);
        let _ = std::fs::remove_file(&p);
        assert!(probe.ran);
        assert!(!probe.loaded());
    }

    #[cfg(unix)]
    #[test]
    fn probing_something_that_is_not_there_says_so_instead_of_panicking() {
        let probe = probe_engine(std::path::Path::new("/nonexistent/upscayl-bin"));
        assert!(!probe.ran);
        assert!(probe.error.is_some());
        assert!(!probe.loaded());
    }

    #[cfg(unix)]
    #[test]
    fn a_probe_that_never_exits_is_abandoned_rather_than_waited_on() {
        // A diagnostic must not become the thing that hangs the application.
        let p = script("hang", "sleep 600");
        let started = std::time::Instant::now();
        let probe = probe_engine(&p);
        let elapsed = started.elapsed();
        let _ = std::fs::remove_file(&p);
        assert!(
            elapsed < std::time::Duration::from_secs(20),
            "gave up after {elapsed:?}"
        );
        assert!(probe.ran);
        assert!(!probe.loaded());
    }

    #[test]
    fn a_probe_with_no_output_counts_as_not_loaded() {
        let silent = EngineProbe {
            ran: true,
            code: Some(-1_073_741_515),
            output: String::new(),
            error: None,
        };
        assert!(!silent.loaded());

        // Usage text on a non-zero exit still proves the binary runs.
        let usage = EngineProbe {
            ran: true,
            code: Some(255),
            output: "Usage: upscayl-bin -i infile -o outfile".to_string(),
            error: None,
        };
        assert!(usage.loaded());
    }
}
