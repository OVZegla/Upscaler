//! Cutting a finished upscale into vertical strips ("lés") for wall printing.
//!
//! A printer fed from a roll has no width limit along the roll, but a wall is
//! still hung in several strips. Doing that by hand in Photoshop is slow and
//! error-prone, so the app cuts the output itself: `count` strips of equal
//! nominal width, each carrying `overlap` extra pixels of the next strip so
//! the installer has material to align and trim on site.

use std::path::{Path, PathBuf};

/// One vertical strip: its left edge and width, in pixels of the source.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Strip {
    pub x: u32,
    pub width: u32,
}

/// Plans the cut of an image `total_width` pixels wide into `count` strips.
///
/// Strip *i* starts at the nominal cut line and runs `overlap` pixels past the
/// next one, so adjacent strips share exactly `overlap` pixels of image. The
/// last strip always ends on the right edge, and the strips together always
/// cover the whole width — no column is ever lost.
///
/// `count` is clamped so every strip is at least one pixel wide, and `overlap`
/// so that a strip can never swallow the one after it.
pub fn plan(total_width: u32, count: u32, overlap: u32) -> Vec<Strip> {
    if total_width == 0 {
        return Vec::new();
    }
    let count = count.clamp(1, total_width);
    if count == 1 {
        return vec![Strip {
            x: 0,
            width: total_width,
        }];
    }

    // The narrowest nominal strip; the overlap must stay below it, otherwise
    // strip i would reach past the start of strip i+2.
    let base = total_width / count;
    let overlap = overlap.min(base.saturating_sub(1));

    let cut = |i: u32| -> u32 {
        // Rounded i * total / count, in u64 so wide prints can't overflow.
        let num = (i as u64) * (total_width as u64);
        ((num + (count as u64) / 2) / (count as u64)) as u32
    };

    (0..count)
        .map(|i| {
            let start = cut(i);
            let nominal_end = cut(i + 1);
            let end = if i + 1 == count {
                total_width
            } else {
                (nominal_end + overlap).min(total_width)
            };
            Strip {
                x: start,
                width: end - start,
            }
        })
        .collect()
}

/// Name of the file holding strip `index` (1-based) of `total`.
///
/// Deliberately ASCII — these files travel to RIPs, USB keys and Windows
/// shares where an accented name is still a good way to lose a job.
pub fn strip_file_name(stem: &str, index: usize, total: usize, ext: &str) -> String {
    format!("{stem}_bande-{index}-sur-{total}.{ext}")
}

/// Cuts `source` into `count` strips written into `out_dir`.
///
/// Returns the directory the strips were written to and how many were actually
/// produced (`count` is clamped to the image width). `dpi`, when given, is
/// stamped into each strip so it opens at its true physical size, exactly as
/// the full-size output does.
pub fn cut(
    source: &Path,
    out_dir: &Path,
    stem: &str,
    ext: &str,
    count: u32,
    overlap: u32,
    dpi: Option<u32>,
) -> Result<(PathBuf, usize), String> {
    let img = image::open(source).map_err(|e| format!("lecture impossible : {e}"))?;
    let (width, height) = (img.width(), img.height());

    let strips = plan(width, count, overlap);
    if strips.len() < 2 {
        return Err("rien à découper".to_string());
    }

    std::fs::create_dir_all(out_dir).map_err(|e| format!("dossier impossible à créer : {e}"))?;

    // PNG and JPEG are the formats we can actually write; anything else (WEBP
    // is decode-only here) falls back to PNG rather than failing the cut.
    let ext = match ext.to_ascii_lowercase().as_str() {
        "jpg" => "jpg",
        "jpeg" => "jpeg",
        _ => "png",
    };
    let is_jpeg = ext.starts_with("jp");

    let total = strips.len();
    for (i, strip) in strips.iter().enumerate() {
        let tile = img.crop_imm(strip.x, 0, strip.width, height);
        // JPEG has no alpha channel; handing it an RGBA buffer is an error.
        let tile = if is_jpeg {
            image::DynamicImage::ImageRgb8(tile.to_rgb8())
        } else {
            tile
        };
        let path = out_dir.join(strip_file_name(stem, i + 1, total, ext));
        tile.save(&path)
            .map_err(|e| format!("écriture de la bande {} impossible : {e}", i + 1))?;
        if let Some(dpi) = dpi {
            crate::resolution::write_dpi(&path.to_string_lossy(), dpi);
        }
    }

    Ok((out_dir.to_path_buf(), total))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The strips must tile the full width with no gap, whatever the overlap.
    fn assert_covers(total: u32, strips: &[Strip]) {
        assert_eq!(strips[0].x, 0, "first strip must start at the left edge");
        let last = strips.last().unwrap();
        assert_eq!(
            last.x + last.width,
            total,
            "last strip must end at the right edge"
        );
        for pair in strips.windows(2) {
            assert!(
                pair[1].x <= pair[0].x + pair[0].width,
                "gap between {:?} and {:?}",
                pair[0],
                pair[1]
            );
        }
    }

    #[test]
    fn one_strip_is_the_whole_image() {
        assert_eq!(plan(4000, 1, 0), vec![Strip { x: 0, width: 4000 }]);
    }

    #[test]
    fn zero_width_plans_nothing() {
        assert!(plan(0, 3, 10).is_empty());
    }

    #[test]
    fn even_split_without_overlap() {
        assert_eq!(
            plan(3000, 3, 0),
            vec![
                Strip { x: 0, width: 1000 },
                Strip { x: 1000, width: 1000 },
                Strip { x: 2000, width: 1000 },
            ]
        );
    }

    #[test]
    fn overlap_widens_every_strip_but_the_last() {
        let strips = plan(3000, 3, 100);
        assert_eq!(
            strips,
            vec![
                Strip { x: 0, width: 1100 },
                Strip { x: 1000, width: 1100 },
                Strip { x: 2000, width: 1000 },
            ]
        );
        assert_covers(3000, &strips);
    }

    #[test]
    fn adjacent_strips_share_exactly_the_overlap() {
        let strips = plan(12_000, 4, 236);
        for pair in strips.windows(2) {
            let shared = (pair[0].x + pair[0].width) - pair[1].x;
            assert_eq!(shared, 236, "strips must share the requested overlap");
        }
        assert_covers(12_000, &strips);
    }

    #[test]
    fn uneven_width_loses_no_column() {
        let strips = plan(3001, 3, 0);
        assert_covers(3001, &strips);
        assert_eq!(strips.len(), 3);
    }

    #[test]
    fn absurd_overlap_is_clamped_instead_of_overflowing() {
        let strips = plan(900, 3, 100_000);
        assert_covers(900, &strips);
        // Each strip stops short of swallowing the one after it.
        for pair in strips.windows(2) {
            assert!(pair[0].x + pair[0].width < pair[1].x + pair[1].width);
        }
    }

    #[test]
    fn more_strips_than_pixels_is_clamped() {
        let strips = plan(5, 50, 2);
        assert_eq!(strips.len(), 5);
        assert_covers(5, &strips);
        assert!(strips.iter().all(|s| s.width >= 1));
    }

    #[test]
    fn very_wide_prints_do_not_overflow() {
        let strips = plan(200_000, 7, 300);
        assert_covers(200_000, &strips);
        assert_eq!(strips.len(), 7);
    }

    /// A scratch directory of our own, so the test never trips over a leftover
    /// from a previous run.
    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("symps_strips_test_{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_source(dir: &Path, name: &str, w: u32, h: u32) -> PathBuf {
        let img = image::RgbaImage::from_fn(w, h, |x, _| {
            image::Rgba([(x % 256) as u8, 40, 90, 255])
        });
        let p = dir.join(name);
        img.save(&p).unwrap();
        p
    }

    #[test]
    fn cutting_writes_every_strip_at_the_planned_width() {
        let dir = scratch("png");
        let src = write_source(&dir, "source.png", 1200, 300);
        let out = dir.join("bandes");

        let (folder, produced) = cut(&src, &out, "mur", "png", 3, 30, Some(300)).unwrap();
        assert_eq!(produced, 3);
        assert_eq!(folder, out);

        let expected = plan(1200, 3, 30);
        for (i, strip) in expected.iter().enumerate() {
            let p = out.join(strip_file_name("mur", i + 1, 3, "png"));
            let dims = image::image_dimensions(&p).unwrap();
            assert_eq!(dims, (strip.width, 300), "bande {}", i + 1);
        }
    }

    /// JPEG has no alpha channel: handing it the source's RGBA buffer would
    /// make the encoder reject every strip.
    #[test]
    fn cutting_to_jpeg_drops_the_alpha_channel() {
        let dir = scratch("jpeg");
        let src = write_source(&dir, "source.png", 800, 200);
        let out = dir.join("bandes");

        let (_, produced) = cut(&src, &out, "mur", "jpg", 2, 0, None).unwrap();
        assert_eq!(produced, 2);
        for i in 1..=2 {
            let p = out.join(strip_file_name("mur", i, 2, "jpg"));
            assert!(p.exists(), "bande {i} manquante");
            image::open(&p).unwrap();
        }
    }

    /// WEBP is decode-only in this build; the cut must still produce files
    /// rather than failing and losing the strips altogether.
    #[test]
    fn an_unwritable_format_falls_back_to_png() {
        let dir = scratch("webp");
        let src = write_source(&dir, "source.png", 600, 120);
        let out = dir.join("bandes");

        let (_, produced) = cut(&src, &out, "mur", "webp", 2, 0, None).unwrap();
        assert_eq!(produced, 2);
        assert!(out.join(strip_file_name("mur", 1, 2, "png")).exists());
    }

    #[test]
    fn cutting_an_unreadable_file_reports_instead_of_panicking() {
        let dir = scratch("broken");
        let src = dir.join("not-an-image.png");
        std::fs::write(&src, b"pas une image").unwrap();
        assert!(cut(&src, &dir.join("bandes"), "mur", "png", 3, 0, None).is_err());
    }

    #[test]
    fn file_names_are_ascii_and_ordered() {
        assert_eq!(
            strip_file_name("mur_salon", 2, 3, "png"),
            "mur_salon_bande-2-sur-3.png"
        );
    }
}
