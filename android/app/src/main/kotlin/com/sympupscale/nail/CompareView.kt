package com.sympupscale.nail

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import android.view.animation.DecelerateInterpolator
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Before / after, one over the other, split by a line the finger drags.
 *
 * No zoom and no pan, on purpose: with nothing else to do with a finger, a
 * touch anywhere on the image moves the line, which is the one gesture a
 * person in front of the machine needs to see the difference.
 *
 * Both images are drawn into the same rectangle, so the line cuts through the
 * same point of both. The full-size result is kept for saving, but it is not
 * what gets drawn: a 4096-pixel bitmap is beyond what many tablet GPUs accept
 * as one texture and would simply not appear. What is drawn is a copy at the
 * size it occupies on screen, made once per layout.
 */
class CompareView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    private var before: Bitmap? = null
    private var after: Bitmap? = null
    private var beforeShown: Bitmap? = null
    private var afterShown: Bitmap? = null

    /** Position of the line across the image, 0 (left) to 1 (right). */
    private var split = 0.5f

    private val dst = RectF()
    private val density = resources.displayMetrics.density

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

    /** Shows one image on its own, before anything has been computed. */
    fun showSingle(bitmap: Bitmap) {
        reveal?.cancel()
        before = bitmap
        after = null
        rebuildShown()
    }

    /** Shows the comparison, sweeping the line in from the right. */
    fun showComparison(original: Bitmap, result: Bitmap) {
        before = original
        after = result
        rebuildShown()
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
        before = null
        after = null
        beforeShown = null
        afterShown = null
        invalidate()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        rebuildShown()
    }

    private fun rebuildShown() {
        val src = before ?: run { invalidate(); return }
        val pad = 12 * density
        val aw = width - 2 * pad
        val ah = height - 2 * pad
        if (aw <= 0 || ah <= 0) return
        val scale = min(aw / src.width, ah / src.height)
        val w = src.width * scale
        val h = src.height * scale
        dst.set((width - w) / 2, (height - h) / 2, (width + w) / 2, (height + h) / 2)

        val tw = max(1, w.roundToInt())
        val th = max(1, h.roundToInt())
        beforeShown = fitted(src, tw, th)
        afterShown = after?.let { fitted(it, tw, th) }
        invalidate()
    }

    /**
     * A copy at the size it is drawn. Never larger than the source: enlarging
     * is left to the draw, which costs no memory.
     */
    private fun fitted(src: Bitmap, w: Int, h: Int): Bitmap =
        if (src.width <= w && src.height <= h) src
        else Bitmap.createScaledBitmap(src, w, h, true)

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val b = beforeShown ?: return
        val a = afterShown

        if (a == null) {
            canvas.drawBitmap(b, null, dst, imagePaint)
            return
        }

        val x = dst.left + dst.width() * split
        canvas.save()
        canvas.clipRect(dst.left, dst.top, x, dst.bottom)
        canvas.drawBitmap(b, null, dst, imagePaint)
        canvas.restore()
        canvas.save()
        canvas.clipRect(x, dst.top, dst.right, dst.bottom)
        canvas.drawBitmap(a, null, dst, imagePaint)
        canvas.restore()

        drawPill(canvas, labelBefore, dst.left + 12 * density, dst.top + 12 * density, alignRight = false)
        drawPill(canvas, labelAfter, dst.right - 12 * density, dst.top + 12 * density, alignRight = true)

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

    private fun drawPill(canvas: Canvas, text: String, x: Float, y: Float, alignRight: Boolean) {
        val padX = 12 * density
        val h = 30 * density
        val w = pillText.measureText(text) + 2 * padX
        val left = if (alignRight) x - w else x
        val rect = RectF(left, y, left + w, y + h)
        canvas.drawRoundRect(rect, h / 2, h / 2, pillPaint)
        val baseline = rect.centerY() - (pillText.descent() + pillText.ascent()) / 2
        canvas.drawText(text, left + padX, baseline, pillText)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (afterShown == null || dst.width() <= 0) return false
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                reveal?.cancel()
                parent?.requestDisallowInterceptTouchEvent(true)
                split = ((event.x - dst.left) / dst.width()).coerceIn(0f, 1f)
                invalidate()
                return true
            }
            MotionEvent.ACTION_UP -> {
                performClick()
                return true
            }
        }
        return true
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }
}
