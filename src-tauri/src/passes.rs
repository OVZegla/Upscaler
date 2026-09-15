//! Plans a chain of AI passes to reach a target width.
//!
//! The model only ever infers at its native x4. Asking the binary for more
//! doesn't work: `-s` accepts 2, 3 or 4 and silently falls back to x4 beyond
//! that, and `-w` merely *resizes* the result with a classic filter
//! (cubicbspline, catmullrom…). So a 9.4x job used to be x4 of real detail
//! followed by 2.36x of plain interpolation — i.e. blur.
//!
//! Instead we chain several x4 inference passes. Each pass is followed by a
//! resize down to the width that pass should end at, chosen so the final pass
//! lands exactly on the target. Because x4 always overshoots the next
//! checkpoint, every resize is a *reduction* — detail is never interpolated
//! upwards, and the peak size stays bounded.
//!
//! For a 4000 px source to 37 795 px (9.4x):
//!   pass 1: 4000 -> x4 -> 16 000 -> resize 9449
//!   pass 2: 9449 -> x4 -> 37 796 -> resize 37 795

/// Native scale of one inference pass.
const MODEL_SCALE: f64 = 4.0;

/// Hard ceiling on chained passes. Each one multiplies time and disk churn,
/// and past this the source has nothing left to give.
const MAX_PASSES: u32 = 4;

/// Widths each pass must end at, in order. The last entry is `target_width`.
///
/// Returns an empty plan when the inputs make no sense, or when the target is
/// at or below the source (nothing to upscale).
pub fn plan(source_width: u32, target_width: u32) -> Vec<u32> {
    if source_width == 0 || target_width == 0 || target_width <= source_width {
        return Vec::new();
    }

    let factor = target_width as f64 / source_width as f64;
    // How many x4 passes are needed to reach (or exceed) the factor.
    let passes = (factor.log(MODEL_SCALE).ceil() as u32).clamp(1, MAX_PASSES);

    (1..=passes)
        .map(|i| {
            // Pass i ends at target / 4^(remaining passes after i).
            let divisor = MODEL_SCALE.powi((passes - i) as i32);
            ((target_width as f64) / divisor).round() as u32
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_pass_below_model_scale() {
        // 4000 -> 12000 is 3x: one pass, x4 then reduce to target.
        assert_eq!(plan(4000, 12000), vec![12000]);
    }

    #[test]
    fn two_passes_past_model_scale() {
        // The 3.20 m at 300 DPI case: 9.4x.
        let p = plan(4000, 37795);
        assert_eq!(p, vec![9449, 37795]);
        // Every step must be reachable by x4 from the previous width,
        // i.e. each resize is a reduction, never an enlargement.
        let mut w = 4000f64;
        for step in &p {
            assert!(w * MODEL_SCALE >= *step as f64, "x4 must overshoot {step}");
            w = *step as f64;
        }
    }

    #[test]
    fn three_passes_for_very_large_factors() {
        // 1000 -> 40000 is 40x: needs three x4 passes (64x ceiling).
        let p = plan(1000, 40000);
        assert_eq!(p.len(), 3);
        assert_eq!(*p.last().unwrap(), 40000);
    }

    #[test]
    fn always_lands_exactly_on_target() {
        for (s, t) in [(4000u32, 37795u32), (1200, 9000), (800, 3000), (2500, 60000)] {
            let p = plan(s, t);
            assert_eq!(*p.last().unwrap(), t, "source {s} target {t}");
        }
    }

    #[test]
    fn every_resize_is_a_reduction() {
        for (s, t) in [(4000u32, 37795u32), (1000, 40000), (800, 3000), (1500, 5000)] {
            let mut w = s as f64;
            for step in plan(s, t) {
                assert!(
                    w * MODEL_SCALE >= step as f64,
                    "source {s} target {t}: x4 from {w} cannot reach {step}"
                );
                w = step as f64;
            }
        }
    }

    #[test]
    fn no_plan_when_nothing_to_do() {
        assert!(plan(4000, 4000).is_empty());
        assert!(plan(4000, 2000).is_empty());
        assert!(plan(0, 1000).is_empty());
        assert!(plan(1000, 0).is_empty());
    }

    #[test]
    fn factor_mode_6x_and_8x_chain_and_land_exactly() {
        // The slider's 6x and 8x: the binary caps `-s` at 4, so these only
        // become real by chaining.
        for (src, factor) in [(4000u32, 6u32), (4000, 8), (1200, 6), (1200, 8)] {
            let target = src * factor;
            let p = plan(src, target);
            assert!(p.len() >= 2, "{factor}x must chain, got {p:?}");
            assert_eq!(*p.last().unwrap(), target, "{factor}x must land exactly");
            let mut w = src as f64;
            for step in &p {
                assert!(
                    w * MODEL_SCALE >= *step as f64,
                    "{factor}x: x4 from {w} cannot reach {step}"
                );
                w = *step as f64;
            }
        }
    }

    #[test]
    fn factors_up_to_model_scale_need_no_chain() {
        // 2x/3x/4x are handled natively by `-s`, so a single pass is enough.
        for f in [2u32, 3, 4] {
            assert_eq!(plan(4000, 4000 * f).len(), 1, "{f}x should be one pass");
        }
    }

    #[test]
    fn pass_count_is_capped() {
        // An absurd factor must not spawn an unbounded chain.
        assert!(plan(100, 10_000_000).len() as u32 <= MAX_PASSES);
    }
}
