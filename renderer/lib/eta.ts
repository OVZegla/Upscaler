/**
 * Time-remaining estimate for a running job.
 *
 * The engine reports a percentage per pass, and a wall-sized job is several
 * chained passes, so the raw number restarts at 0 several times. Combining it
 * with the pass counter gives one monotonic fraction for the whole job, which
 * is what an estimate can be built on.
 *
 * The estimate is deliberately cautious: it stays silent until enough of the
 * job has run to mean anything, and it is smoothed, because a figure that
 * jumps between "2 min" and "20 min" is worse than none at all.
 */

export type EtaState = {
  startedAt: number;
  /** Exponentially smoothed estimate of the total run, in milliseconds. */
  smoothedTotalMs: number | null;
};

export function startEta(now = Date.now()): EtaState {
  return { startedAt: now, smoothedTotalMs: null };
}

/** Fraction of the whole job done, 0..1, from the pass counter and the
 *  percentage reported within the current pass. */
export function overallFraction(
  percentInPass: number,
  pass: { current: number; total: number } | null,
): number {
  const p = Math.min(100, Math.max(0, percentInPass)) / 100;
  if (!pass || pass.total <= 1) return p;
  const done = Math.max(0, pass.current - 1);
  return Math.min(1, (done + p) / pass.total);
}

/** Below this, elapsed time says almost nothing about the total. */
const MIN_FRACTION = 0.04;
/** Weight given to the newest sample; the rest carries the previous estimate. */
const SMOOTHING = 0.25;

export function updateEta(
  state: EtaState,
  fraction: number,
  now = Date.now(),
): EtaState {
  if (fraction < MIN_FRACTION || fraction >= 1) return state;
  const elapsed = now - state.startedAt;
  if (elapsed <= 0) return state;
  const total = elapsed / fraction;
  return {
    ...state,
    smoothedTotalMs:
      state.smoothedTotalMs === null
        ? total
        : state.smoothedTotalMs * (1 - SMOOTHING) + total * SMOOTHING,
  };
}

export function remainingMs(
  state: EtaState,
  fraction: number,
  now = Date.now(),
): number | null {
  if (state.smoothedTotalMs === null) return null;
  const left = state.smoothedTotalMs - (now - state.startedAt);
  if (!Number.isFinite(left)) return null;
  return Math.max(0, left);
}

/** "environ 4 min", "environ 35 s" — rounded, because false precision on an
 *  estimate reads as a promise. */
export function formatRemaining(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 10) return "quelques secondes";
  if (s < 60) return `environ ${Math.round(s / 5) * 5} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `environ ${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `environ ${h} h` : `environ ${h} h ${rest} min`;
}
