//! Event name constants emitted to the renderer.
//! These MUST match the slugs used in the `window.electron` shim
//! (renderer/lib/tauri-electron-shim.ts).

pub const UPSCAYL_PROGRESS: &str = "upscayl-progress";
pub const UPSCAYL_DONE: &str = "upscayl-done";
pub const UPSCAYL_ERROR: &str = "upscayl-error";
pub const UPSCAYL_WARNING: &str = "upscayl-warning";

pub const DOUBLE_UPSCAYL_PROGRESS: &str = "double-upscayl-progress";
pub const DOUBLE_UPSCAYL_DONE: &str = "double-upscayl-done";

pub const FOLDER_UPSCAYL_PROGRESS: &str = "folder-upscayl-progress";
pub const FOLDER_UPSCAYL_DONE: &str = "folder-upscayl-done";

pub const SCALING_AND_CONVERTING: &str = "scaling-and-converting";
pub const CUSTOM_MODEL_FILES_LIST: &str = "custom-model-files-list";
pub const METADATA_ERROR: &str = "metadata-error";

pub const PASTE_IMAGE_SAVE_SUCCESS: &str = "paste-image-save-success";
pub const PASTE_IMAGE_SAVE_ERROR: &str = "paste-image-save-error";

pub const OS: &str = "os";
