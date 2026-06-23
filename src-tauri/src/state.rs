//! Shared application state — mirrors electron/utils/config-variables.ts.

use std::process::Child;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

/// A spawned upscayl child process, shared so that `stop` can kill it
/// while the streaming thread reads its stderr.
pub type SharedChild = Arc<Mutex<Child>>;

#[derive(Default)]
pub struct AppState {
    /// Set to true when the user presses Stop; checked before emitting "done".
    pub stopped: Arc<AtomicBool>,
    /// All currently running upscayl processes.
    pub children: Mutex<Vec<SharedChild>>,
    /// Folder containing custom .param/.bin models (set from the renderer).
    pub custom_models_path: Mutex<Option<String>>,
    /// Last directory used in the "select image" dialog.
    pub saved_image_path: Mutex<Option<String>>,
    /// Last directory used in the "select folder" dialog.
    pub saved_batch_path: Mutex<Option<String>>,
    /// Suppress desktop notifications when true.
    pub notifications_off: Arc<AtomicBool>,
}

impl AppState {
    pub fn register_child(&self, child: SharedChild) {
        if let Ok(mut guard) = self.children.lock() {
            guard.push(child);
        }
    }

    pub fn clear_children(&self) {
        if let Ok(mut guard) = self.children.lock() {
            guard.clear();
        }
    }
}
