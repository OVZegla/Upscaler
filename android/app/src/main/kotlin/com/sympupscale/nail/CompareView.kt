package com.sympupscale.nail

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.util.AttributeSet
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.view.animation.DecelerateInterpolator
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Before / after, one over the other, split by a line, with pinch to zoom.
 *
 * Gestures, as on any phone, plus the line:
 *  - two fingers pinch to zoom and move together to pan;
 *  - one finger on the line's handle drags the line;
 *  - one finger elsewhere pans when zoomed in, and moves the line when not
 *    (there is nothing to pan at full view, and it keeps the comparison one
 *    gesture away);
 *  - a double tap zooms in on that spot, or back out.
 * The line belongs to the screen, not to the image: it stays where it was put
 * while the image moves under it, so both sides always show the same place.
 *
 * Drawing: a 4096-pixel result is beyond what many tablet GPUs take as one
 * texture, and would simply not appear. So the view never draws a full-size
 * bitmap. At full view it draws copies made at the size they occupy on
 * screen. Zoomed in, it draws those same copies stretched while a finger is
 * moving, and once the image settles, sharp crops of just the visible part,
 * cut from the full-size bitmaps.
 */
class CompareView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    private var before: Bitmap? = null
    private var after: Bitmap? = null
    private var beforeShown: Bitmap? = null
    private var afterShown: Bitmap? = null

    /** Line position across the viewport, 0 (left) to 1 (right). */
    private var split = 0.5f

    /** Where the whole image fits: the viewport, and the image at zoom 1. */
    private val dst = RectF()

    /** Where the image currently is on screen, at the current zoom. */
    private val img = RectF()

    private val density = resources.displayMetrics.density

    // Sharp crops of the visible part, valid for the image rectangle they
    // were cut for.
    private var sharpFor = RectF()
    private var sharpBefore: Bitmap? = null
    private var sharpBeforeAt = RectF()
    private var sharpAfter: Bitmap? = null
    private var sharpAfterAt = RectF()
    private val makeSharp = Runnable { buildSharp() }

    private val imagePaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        strokeWidth = 3 * density
    }
    private val knobPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    private val knobShadow = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x55000000 }
    private val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF111317.toInt()
        strokeWidth = 2.5f * density
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xCC111317.toInt() }
    private val pillText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 15 * density
        isFakeBoldText = true
    }

    private val labelBefore = context.getString(R.string.before)
    private val labelAfter = context.getString(R.string.after)
    private var reveal: ValueAnimator? = null
    private var zoomAnim: ValueAnimator? = null

    private enum class Drag { NONE, LINE, PAN }
    private var drag = Drag.NONE
    private var lastX = 0f
    private var lastY = 0f
    private var lastFocusX = 0f
    private var lastFocusY = 0f

    private val zoom get() = if (dst.width() > 0) img.width() / dst.width() else 1f

    /** Up to well past one screen pixel per image pixel. */
    private val maxZoom: Float
        get() {
            val full = after ?: before ?: return 1f
            if (dst.width() <= 0) return 1f
            return max(4f, 3f * full.width / dst.width()).coerceAtMost(16f)
        }

    // ── Content ─────────────────────────────────────────────────────────────

    /** Shows one image on its own, before anything has been computed. */
    fun showSingle(bitmap: Bitmap) {
        if (before === bitmap && after == null) return
        reveal?.cancel()
        before = bitmap
        after = null
        rebuildShown(resetZoom = true)
    }

    /** Shows the comparison, sweeping the line in from the right. */
    fun showComparison(original: Bitmap, result: Bitmap) {
        before = original
        after = result
        rebuildShown(resetZoom = true)
        reveal?.cancel()
        reveal = ValueAnimator.ofFloat(1f, 0.5f).apply {
            duration = 700
            interpolator = DecelerateInterpolator(1.6f)
            addUpdateListener { split = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    fun clear() {
        reveal?.cancel()
        zoomAnim?.cancel()
        before = null
        after = null
        beforeShown = null
        afterShown = null
        dropSharp()
        invalidate()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        rebuildShown(resetZoom = true)
    }

    private fun rebuildShown(resetZoom: Boolean) {
        val src = before ?: run { invalidate(); return }
        val pad = 12 * density
        val aw = width - 2 * pad
        val ah = height - 2 * pad
        if (aw <= 0 || ah <= 0) return
        val scale = min(aw / src.width, ah / src.height)
        val w = src.width * scale
        val h = src.height * scale
        dst.set((width - w) / 2, (height - h) / 2, (width + w) / 2, (height + h) / 2)
        if (resetZoom) img.set(dst)

        val tw = max(1, w.roundToInt())
        val th = max(1, h.roundToInt())
        beforeShown = fitted(src, tw, th)
        afterShown = after?.let { fitted(it, tw, th) }
        dropSharp()
        invalidate()
    }

    /** A copy at the size it is drawn, never larger than the source. */
    private fun fitted(src: Bitmap, w: Int, h: Int): Bitmap =
        if (src.width <= w && src.height <= h) src
        else Bitmap.createScaledBitmap(src, w, h, true)

    // ── Zoom and pan ────────────────────────────────────────────────────────

    /** Scales the image about a screen point, then keeps it covering the viewport. */
    private fun zoomAbout(targetZoom: Float, fx: Float, fy: Float) {
        val z = targetZoom.coerceIn(1f, maxZoom)
        val k = z / zoom
        img.set(
            fx - (fx - img.left) * k,
            fy - (fy - img.top) * k,
            fx - (fx - img.left) * k + img.width() * k,
            fy - (fy - img.top) * k + img.height() * k,
        )
        clampImage()
        onViewChanged()
    }

    private fun panBy(dx: Float, dy: Float) {
        img.offset(dx, dy)
        clampImage()
        onViewChanged()
    }

    private fun clampImage() {
        if (img.width() <= dst.width() + 0.5f) {
            img.set(dst)
            return
        }
        val dx = when {
            img.left > dst.left -> dst.left - img.left
            img.right < dst.right -> dst.right - img.right
            else -> 0f
        }
        val dy = when {
            img.top > dst.top -> dst.top - img.top
            img.bottom < dst.bottom -> dst.bottom - img.bottom
            else -> 0f
        }
        img.offset(dx, dy)
    }

    private fun animateZoom(target: Float, fx: Float, fy: Float) {
        zoomAnim?.cancel()
        val from = zoom
        zoomAnim = ValueAnimator.ofFloat(from, target).apply {
            duration = 260
            interpolator = DecelerateInterpolator()
            addUpdateListener { zoomAbout(it.animatedValue as Float, fx, fy) }
            start()
        }
    }

    private fun onViewChanged() {
        removeCallbacks(makeSharp)
        if (zoom > 1.01f) postDelayed(makeSharp, 140)
        invalidate()
    }

    // ── Sharp crops of the visible part ─────────────────────────────────────

    private fun dropSharp() {
        removeCallbacks(makeSharp)
        sharpBefore = null
        sharpAfter = null
        sharpFor.setEmpty()
    }

    private fun buildSharp() {
        if (zoom <= 1.01f) return
        val visible = RectF(dst)
        if (!visible.intersect(img)) return
        val b = before ?: return
        val (bb, bAt) = crop(b, visible)
        val a = after
        val (ab, aAt) = if (a != null) crop(a, visible) else (null to RectF())
        sharpBefore = bb
        sharpBeforeAt = bAt
        sharpAfter = ab
        sharpAfterAt = aAt
        sharpFor = RectF(img)
        invalidate()
    }

    /**
     * Cuts out of [full] the pixels behind [visible], no larger than the
     * screen area they cover, and returns them with where they go on screen.
     */
    private fun crop(full: Bitmap, visible: RectF): Pair<Bitmap?, RectF> {
        val sx = full.width / img.width()
        val sy = full.height / img.height()
        val px = Rect(
            floor((visible.left - img.left) * sx).toInt().coerceIn(0, full.width - 1),
            floor((visible.top - img.top) * sy).toInt().coerceIn(0, full.height - 1),
            ceil((visible.right - img.left) * sx).toInt().coerceIn(1, full.width),
            ceil((visible.bottom - img.top) * sy).toInt().coerceIn(1, full.height),
        )
        if (px.width() <= 0 || px.height() <= 0) return null to RectF()
        val at = RectF(
            img.left + px.left / sx,
            img.top + px.top / sy,
            img.left + px.right / sx,
            img.top + px.bottom / sy,
        )
        return try {
            var c = Bitmap.createBitmap(full, px.left, px.top, px.width(), px.height())
            val tw = max(1, at.width().roundToInt())
            val th = max(1, at.height().roundToInt())
            if (c.width > tw || c.height > th) c = Bitmap.createScaledBitmap(c, tw, th, true)
            c to at
        } catch (e: OutOfMemoryError) {
            null to RectF()
        }
    }

    // ── Drawing ─────────────────────────────────────────────────────────────

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val b = beforeShown ?: return
        val a = afterShown
        val sharp = zoom > 1.01f && sharpFor == img

        canvas.save()
        canvas.clipRect(dst)
        if (a == null) {
            drawLayer(canvas, b, if (sharp) sharpBefore else null, sharpBeforeAt)
        } else {
            val x = dst.left + dst.width() * split
            canvas.save()
            canvas.clipRect(dst.left, dst.top, x, dst.bottom)
            drawLayer(canvas, b, if (sharp) sharpBefore else null, sharpBeforeAt)
            canvas.restore()
            canvas.save()
            canvas.clipRect(x, dst.top, dst.right, dst.bottom)
            drawLayer(canvas, a, if (sharp) sharpAfter else null, sharpAfterAt)
            canvas.restore()
        }
        canvas.restore()

        if (a != null) {
            drawPill(canvas, labelBefore, dst.left + 12 * density, dst.top + 12 * density, PillAlign.LEFT)
            drawPill(canvas, labelAfter, dst.right - 12 * density, dst.top + 12 * density, PillAlign.RIGHT)
            drawLine(canvas)
        }
        if (zoom > 1.05f) {
            val label = "×" + String.format(java.util.Locale.FRANCE, "%.1f", zoom)
            drawPill(canvas, label, dst.centerX(), dst.bottom - 42 * density, PillAlign.CENTER)
        }
    }

    private fun drawLayer(canvas: Canvas, shown: Bitmap, sharp: Bitmap?, sharpAt: RectF) {
        if (sharp != null) canvas.drawBitmap(sharp, null, sharpAt, imagePaint)
        else canvas.drawBitmap(shown, null, img, imagePaint)
    }

    private fun drawLine(canvas: Canvas) {
        val x = dst.left + dst.width() * split
        canvas.drawLine(x, dst.top, x, dst.bottom, linePaint)
        val cy = dst.centerY()
        val r = 22 * density
        canvas.drawCircle(x, cy + 2 * density, r, knobShadow)
        canvas.drawCircle(x, cy, r, knobPaint)
        val s = 6 * density
        val gap = 4 * density
        canvas.drawLine(x - gap, cy - s, x - gap - s, cy, arrowPaint)
        canvas.drawLine(x - gap - s, cy, x - gap, cy + s, arrowPaint)
        canvas.drawLine(x + gap, cy - s, x + gap + s, cy, arrowPaint)
        canvas.drawLine(x + gap + s, cy, x + gap, cy + s, arrowPaint)
    }

    private enum class PillAlign { LEFT, RIGHT, CENTER }

    private fun drawPill(canvas: Canvas, text: String, x: Float, y: Float, align: PillAlign) {
        val padX = 12 * density
        val h = 30 * density
        val w = pillText.measureText(text) + 2 * padX
        val left = when (align) {
            PillAlign.LEFT -> x
            PillAlign.RIGHT -> x - w
            PillAlign.CENTER -> x - w / 2
        }
        val rect = RectF(left, y, left + w, y + h)
        canvas.drawRoundRect(rect, h / 2, h / 2, pillPaint)
        val baseline = rect.centerY() - (pillText.descent() + pillText.ascent()) / 2
        canvas.drawText(text, left + padX, baseline, pillText)
    }

    // ── Touch ───────────────────────────────────────────────────────────────

    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScaleBegin(d: ScaleGestureDetector): Boolean {
            zoomAnim?.cancel()
            reveal?.cancel()
            drag = Drag.NONE
            lastFocusX = d.focusX
            lastFocusY = d.focusY
            return true
        }

        override fun onScale(d: ScaleGestureDetector): Boolean {
            zoomAbout(zoom * d.scaleFactor, d.focusX, d.focusY)
            panBy(d.focusX - lastFocusX, d.focusY - lastFocusY)
            lastFocusX = d.focusX
            lastFocusY = d.focusY
            return true
        }
    })

    private val tapDetector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
        override fun onDoubleTap(e: MotionEvent): Boolean {
            if (zoom > 1.05f) animateZoom(1f, e.x, e.y)
            else animateZoom(min(3f, maxZoom), e.x, e.y)
            return true
        }
    })

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (beforeShown == null || dst.width() <= 0) return false
        parent?.requestDisallowInterceptTouchEvent(true)
        scaleDetector.onTouchEvent(event)
        tapDetector.onTouchEvent(event)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                zoomAnim?.cancel()
                lastX = event.x
                lastY = event.y
                val lineX = dst.left + dst.width() * split
                drag = when {
                    after != null && abs(event.x - lineX) < 36 * density -> Drag.LINE
                    zoom > 1.01f -> Drag.PAN
                    after != null -> Drag.LINE
                    else -> Drag.NONE
                }
                if (drag == Drag.LINE) moveLine(event.x)
            }
            MotionEvent.ACTION_POINTER_DOWN -> drag = Drag.NONE
            MotionEvent.ACTION_MOVE -> if (!scaleDetector.isInProgress && event.pointerCount == 1) {
                when (drag) {
                    Drag.LINE -> moveLine(event.x)
                    Drag.PAN -> panBy(event.x - lastX, event.y - lastY)
                    Drag.NONE -> Unit
                }
                lastX = event.x
                lastY = event.y
            }
            MotionEvent.ACTION_POINTER_UP -> {
                // The finger left on screen carries on panning from where it is.
                val remaining = if (event.actionIndex == 0) 1 else 0
                lastX = event.getX(remaining)
                lastY = event.getY(remaining)
                if (zoom > 1.01f) drag = Drag.PAN
            }
            MotionEvent.ACTION_UP -> {
                drag = Drag.NONE
                performClick()
            }
            MotionEvent.ACTION_CANCEL -> drag = Drag.NONE
        }
        return true
    }

    private fun moveLine(x: Float) {
        reveal?.cancel()
        split = ((x - dst.left) / dst.width()).coerceIn(0f, 1f)
        invalidate()
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }
}
