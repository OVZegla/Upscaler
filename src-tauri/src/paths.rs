//! Resolves the upscayl binary and models paths — mirrors
//! electron/utils/get-resource-paths.ts.
//!
//! In a bundled app, `bundle.resources` places our staged folders under
//! the resource directory:
//!   <resource_dir>/resources/bin/upscayl-bin[.exe]
//!   <resource_dir>/resources/models/*
//!
//! In `tauri dev` the resource dir is the target dir, so we fall back to
//! the repo's `resources/<os>/bin` and `resources/models` layout.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// Windows: resource_dir() can return \\?\C:\... (extended-length prefix).
// upscayl-bin.exe uses ncnn which calls fopen() and doesn't handle \\?\ paths.
fn strip_unc_prefix(path: PathBuf) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let s = path.to_string_lossy();
        if let Some(stripped) = s.strip_prefix(r"\\?\") {
            return PathBuf::from(stripped);
        }
    }
    path
}

fn bin_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "upscayl-bin.exe"
    } else {
        "upscayl-bin"
    }
}

fn os_folder() -> &'static str {
    if cfg!(target_os = "windows") {
        "win"
    } else if cfg!(target_os = "macos") {
        "mac"
    } else {
        "linux"
    }
}

/// True when macOS is running the app from a randomised read-only copy.
///
/// Gatekeeper does this to any quarantined bundle that is launched from where
/// it was unzipped, rather than from /Applications. The app then lives at
/// /private/var/folders/<...>/AppTranslocation/<uuid>/d/<App>.app, and a path
/// in an error message is unrecognisable to the person reading it. Detecting
/// it lets us say what to do instead of showing a cryptic failure.
pub fn is_translocated(app: &AppHandle) -> bool {
    if !cfg!(target_os = "macos") {
        return false;
    }
    app.path()
        .resource_dir()
        .map(|d| d.to_string_lossy().contains("/AppTranslocation/"))
        .unwrap_or(false)
}

/// Absolute path to the upscayl-ncnn executable.
pub fn exec_path(app: &AppHandle) -> PathBuf {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = strip_unc_prefix(resource_dir)
            .join("resources")
            .join("bin")
            .join(bin_name());
        if bundled.exists() {
            return bundled;
        }
    }
    // Dev fallback: <cwd>/resources/<os>/bin/upscayl-bin
    repo_resources()
        .join(os_folder())
        .join("bin")
        .join(bin_name())
}

/// Absolute path to the bundled default models directory.
pub fn models_path(app: &AppHandle) -> PathBuf {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = strip_unc_prefix(resource_dir).join("resources").join("models");
        if bundled.exists() {
            return bundled;
        }
    }
    repo_resources().join("models")
}

fn repo_resources() -> PathBuf {
    // src-tauri/.. -> repo root, then /resources
    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if dir.ends_with("src-tauri") {
        dir.pop();
    }
    dir.join("resources")
}
