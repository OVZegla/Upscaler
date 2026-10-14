/**
 * Preview zoom limits, in one place.
 *
 * The slider and the ctrl+wheel handler both clamp the zoom, and they used to
 * carry their own copy of the ceiling. Two copies of a number drift: the app
 * version did exactly that across four files before it was noticed.
 *
 * Zoom is a multiplier on the fitted size, not an absolute pixel scale, so
 * 100% is the whole picture and 400% is four times into it.
 */

export const ZOOM_MIN = 100;
export const ZOOM_MAX = 400;

/** Stops the slider snaps to. */
export const ZOOM_STOPS = [100, 150, 200, 300, 400];
