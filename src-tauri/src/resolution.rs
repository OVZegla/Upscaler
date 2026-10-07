//! Stamps an output file with its intended print resolution (DPI).
//!
//! The upscaler writes raw pixels with no density metadata, so Photoshop and
//! RIPs fall back to 72 DPI and report the wrong physical size — a 37 795 px
//! wall meant to be 3.20 m reads as ~13 m, and the scale has to be fixed by
//! hand on every job. Writing the density makes the file open at the size the
//! user actually asked for.
//!
//! PNG carries it in a `pHYs` chunk (pixels per metre); JPEG in the JFIF APP0
//! segment (dots per inch). Other formats are left untouched.

use std::fs;
use std::path::Path;

/// Writes `dpi` into the file at `path`. Returns true if the file was updated.
/// Never partially writes: the new contents are built in memory first.
pub fn write_dpi(path: &str, dpi: u32) -> bool {
    if dpi == 0 {
        return false;
    }
    let bytes = match fs::read(path) {
        Ok(b) => b,
        Err(_) => return false,
    };

    let updated = if is_png(&bytes) {
        png_with_dpi(&bytes, dpi)
    } else if is_jpeg(&bytes) {
        jpeg_with_dpi(&bytes, dpi)
    } else {
        None
    };

    match updated {
        Some(out) => fs::write(Path::new(path), out).is_ok(),
        None => false,
    }
}

/// Stamps every PNG/JPEG directly inside `dir`. Used for batch runs, which
/// write into a dedicated output folder, so only this run's results are
/// touched. Returns how many files were updated.
pub fn write_dpi_in_dir(dir: &str, dpi: u32) -> usize {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return 0,
    };
    let mut count = 0;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if !matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "jfif") {
            continue;
        }
        if write_dpi(&path.to_string_lossy(), dpi) {
            count += 1;
        }
    }
    count
}

fn is_png(b: &[u8]) -> bool {
    b.len() > 8 && b[..8] == [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]
}

fn is_jpeg(b: &[u8]) -> bool {
    b.len() > 3 && b[0] == 0xFF && b[1] == 0xD8
}

/// DPI -> pixels per metre, as PNG's pHYs chunk expects.
fn dpi_to_ppm(dpi: u32) -> u32 {
    ((dpi as f64) * 10_000.0 / 254.0).round() as u32
}

/// Rebuilds a PNG with a `pHYs` chunk carrying `dpi`, dropping any existing
/// one. The chunk must precede IDAT, so it is inserted before the first.
fn png_with_dpi(bytes: &[u8], dpi: u32) -> Option<Vec<u8>> {
    let ppm = dpi_to_ppm(dpi);
    let mut phys_data = Vec::with_capacity(9);
    phys_data.extend_from_slice(&ppm.to_be_bytes());
    phys_data.extend_from_slice(&ppm.to_be_bytes());
    phys_data.push(1); // unit: metre
    let phys_chunk = build_png_chunk(b"pHYs", &phys_data);

    let mut out = Vec::with_capacity(bytes.len() + phys_chunk.len());
    out.extend_from_slice(&bytes[..8]); // signature

    let mut i = 8usize;
    let mut inserted = false;
    while i + 8 <= bytes.len() {
        let len = u32::from_be_bytes(bytes[i..i + 4].try_into().ok()?) as usize;
        let kind = &bytes[i + 4..i + 8];
        // length + type + data + crc
        let end = i.checked_add(12)?.checked_add(len)?;
        if end > bytes.len() {
            return None; // truncated/corrupt — leave the file alone
        }

        if kind == b"pHYs" {
            i = end; // drop the stale density
            continue;
        }
        if !inserted && kind == b"IDAT" {
            out.extend_from_slice(&phys_chunk);
            inserted = true;
        }
        out.extend_from_slice(&bytes[i..end]);
        i = end;
    }

    if !inserted {
        return None; // no IDAT found — not a PNG we understand
    }
    Some(out)
}

fn build_png_chunk(kind: &[u8; 4], data: &[u8]) -> Vec<u8> {
    let mut chunk = Vec::with_capacity(12 + data.len());
    chunk.extend_from_slice(&(data.len() as u32).to_be_bytes());
    chunk.extend_from_slice(kind);
    chunk.extend_from_slice(data);

    let mut hasher = crc32fast::Hasher::new();
    hasher.update(kind);
    hasher.update(data);
    chunk.extend_from_slice(&hasher.finalize().to_be_bytes());
    chunk
}

/// Sets the density in a JPEG's JFIF APP0 segment, inserting one when absent.
fn jpeg_with_dpi(bytes: &[u8], dpi: u32) -> Option<Vec<u8>> {
    let d = u16::try_from(dpi).ok()?;

    // An APP0 JFIF segment directly after SOI is the common layout.
    if bytes.len() > 20 && bytes[2] == 0xFF && bytes[3] == 0xE0 && &bytes[6..11] == b"JFIF\0" {
        let mut out = bytes.to_vec();
        out[13] = 1; // units: dots per inch
        out[14..16].copy_from_slice(&d.to_be_bytes()); // X density
        out[16..18].copy_from_slice(&d.to_be_bytes()); // Y density
        return Some(out);
    }

    // Otherwise splice a minimal JFIF APP0 in right after SOI.
    let mut app0: Vec<u8> = vec![0xFF, 0xE0, 0x00, 0x10];
    app0.extend_from_slice(b"JFIF\0");
    app0.extend_from_slice(&[1, 2]); // version 1.02
    app0.push(1); // units: DPI
    app0.extend_from_slice(&d.to_be_bytes());
    app0.extend_from_slice(&d.to_be_bytes());
    app0.extend_from_slice(&[0, 0]); // no thumbnail

    let mut out = Vec::with_capacity(bytes.len() + app0.len());
    out.extend_from_slice(&bytes[..2]); // SOI
    out.extend_from_slice(&app0);
    out.extend_from_slice(&bytes[2..]);
    Some(out)
}
