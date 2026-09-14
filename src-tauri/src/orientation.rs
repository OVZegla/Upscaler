//! EXIF-orientation normalization.
//!
//! ncnn/upscayl-bin reads raw pixels and ignores the EXIF Orientation tag,
//! then writes an output with no orientation metadata. A phone photo stored
//! landscape-with-Orientation=6 therefore comes out visually rotated a quarter
//! turn. To avoid this we "bake" the orientation into the pixels of a temporary
//! copy of the *input* (small, cheap) and feed that to the binary, so the
//! upscaled output is already correctly oriented for every output format.

use std::io::BufReader;
use std::path::{Path, PathBuf};

/// If `input` carries a non-trivial EXIF orientation, produce a temp PNG with
/// the orientation baked into the pixels and return its path. Returns `None`
/// when orientation is normal/absent or anything fails (caller falls back to
/// the original file).
pub fn normalized_input(input: &str) -> Option<PathBuf> {
    let orientation = read_orientation(input)?;
    if orientation <= 1 {
        return None; // 1 = normal, 0/none = nothing to do
    }

    let img = image::open(input).ok()?;
    let fixed = apply_orientation(img, orientation);

    // Unique temp file next to the system temp dir, keyed on the source stem.
    let stem = Path::new(input)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let mut out = std::env::temp_dir();
    out.push(format!("symps_oriented_{stem}_{nanos}.png"));

    fixed.save(&out).ok()?;
    Some(out)
}

/// Reads the EXIF Orientation tag (1..=8). Returns `None` if absent/unreadable.
fn read_orientation(input: &str) -> Option<u16> {
    let file = std::fs::File::open(input).ok()?;
    let mut reader = BufReader::new(file);
    let exif = exif::Reader::new()
        .read_from_container(&mut reader)
        .ok()?;
    let field = exif.get_field(exif::Tag::Orientation, exif::In::PRIMARY)?;
    field.value.get_uint(0).map(|v| v as u16)
}

/// Applies the transform described by an EXIF orientation value to the image.
fn apply_orientation(img: image::DynamicImage, orientation: u16) -> image::DynamicImage {
    match orientation {
        2 => img.fliph(),
        3 => img.rotate180(),
        4 => img.flipv(),
        5 => img.rotate90().fliph(),
        6 => img.rotate90(),
        7 => img.rotate270().fliph(),
        8 => img.rotate270(),
        _ => img,
    }
}
