package com.sympupscale.nail.core

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.nio.FloatBuffer
import kotlin.math.roundToInt

/**
 * Doubles the size of an image with the same model the desktop app ships.
 *
 * The model only knows how to enlarge by 4, so every tile is enlarged by 4 and
 * each 2x2 block of the result is then averaged into one pixel. That lands on
 * exactly twice the size, and the averaging is also the cleanest way down: it
 * smooths nothing the model drew at a scale a viewer could see.
 *
 * The image is processed in tiles so that a cheap tablet with little memory can
 * still do it. Each tile is read with a margin of [PAD] pixels around it, which
 * is the reach of the model's 18 stacked 3x3 convolutions: with that margin a
 * tile sees exactly what it would see inside the whole image, so the seams
 * between tiles do not exist rather than being hidden. At the edges of the
 * image the margin is filled by mirroring the image, as the desktop engine does.
 *
 * Pixels go in and out as ARGB ints, the layout of an Android Bitmap, which
 * keeps this class free of any Android dependency so it can be tested on a
 * plain JVM against the real model.
 */
class Upscaler(
    private val env: OrtEnvironment,
    private val session: OrtSession,
    private val tile: Int = TILE,
) : AutoCloseable {

    companion object {
        const val MODEL_SCALE = 4

        /** Input pixels per tile side. Small enough for a few MB per tile. */
        const val TILE = 128

        /** Receptive-field radius of 18 stacked 3x3 convolutions. */
        const val PAD = 18

        /**
         * Largest input accepted, in pixels. The result is four times that, held
         * twice (pixels, then the bitmap made of them): about 130 MB at this size,
         * which is what an entry-level Android tablet can give one app.
         */
        const val MAX_INPUT_PIXELS = 2048 * 2048

        fun create(
            modelBytes: ByteArray,
            configure: (OrtSession.SessionOptions) -> Unit = {},
        ): Upscaler {
            val env = OrtEnvironment.getEnvironment()
            val options = OrtSession.SessionOptions()
            configure(options)
            val session = env.createSession(modelBytes, options)
            return Upscaler(env, session)
        }

        /**
         * Mirror index into 0 until n, as numpy's "reflect" padding does: the
         * edge pixel itself is not repeated. Holds for any distance outside.
         */
        fun reflect(c: Int, n: Int): Int {
            if (n <= 1) return 0
            val period = 2 * (n - 1)
            val m = ((c % period) + period) % period
            return if (m < n) m else period - m
        }
    }

    private val inputName = session.inputNames.first()

    /**
     * Returns the image at twice its width and height, as ARGB, or null when
     * [isCancelled] turned true along the way. [onProgress] receives 0..1.
     */
    fun upscale2x(
        argb: IntArray,
        width: Int,
        height: Int,
        onProgress: (Float) -> Unit = {},
        isCancelled: () -> Boolean = { false },
    ): IntArray? {
        require(width > 0 && height > 0) { "empty image" }
        require(argb.size == width * height) { "pixel count does not match the size" }
        require(width.toLong() * height <= MAX_INPUT_PIXELS) { "image too large" }

        val outW = width * 2
        val outH = height * 2
        val out = IntArray(outW * outH)

        val tilesX = (width + tile - 1) / tile
        val tilesY = (height + tile - 1) / tile
        val total = tilesX * tilesY
        var done = 0
        onProgress(0f)

        for (ty in 0 until tilesY) {
            for (tx in 0 until tilesX) {
                if (isCancelled()) return null
                val x0 = tx * tile
                val y0 = ty * tile
                val tw = minOf(tile, width - x0)
                val th = minOf(tile, height - y0)
                runTile(argb, width, height, x0, y0, tw, th, out, outW)
                done++
                onProgress(done.toFloat() / total)
            }
        }

        applyAlpha(argb, width, height, out, outW, outH)
        return out
    }

    private fun runTile(
        src: IntArray, w: Int, h: Int,
        x0: Int, y0: Int, tw: Int, th: Int,
        out: IntArray, outW: Int,
    ) {
        val iw = tw + 2 * PAD
        val ih = th + 2 * PAD
        val plane = iw * ih
        val input = FloatBuffer.allocate(3 * plane)
        val data = input.array()

        for (y in 0 until ih) {
            val sy = reflect(y0 - PAD + y, h)
            for (x in 0 until iw) {
                val sx = reflect(x0 - PAD + x, w)
                val p = src[sy * w + sx]
                val i = y * iw + x
                data[i] = ((p shr 16) and 0xFF) / 255f
                data[plane + i] = ((p shr 8) and 0xFF) / 255f
                data[2 * plane + i] = (p and 0xFF) / 255f
            }
        }

        val shape = longArrayOf(1, 3, ih.toLong(), iw.toLong())
        OnnxTensor.createTensor(env, input, shape).use { tensor ->
            session.run(mapOf(inputName to tensor)).use { result ->
                val y4 = (result[0] as OnnxTensor).floatBuffer
                val ow4 = iw * MODEL_SCALE
                val plane4 = ow4 * ih * MODEL_SCALE
                val off = PAD * MODEL_SCALE
                // Each output pixel is the mean of a 2x2 block of the x4 result.
                for (oy in 0 until th * 2) {
                    val r0 = (off + oy * 2) * ow4
                    val r1 = r0 + ow4
                    val dstRow = (y0 * 2 + oy) * outW + x0 * 2
                    for (ox in 0 until tw * 2) {
                        val c = off + ox * 2
                        val a = r0 + c
                        val b = r1 + c
                        val r = avg(y4, a, b)
                        val g = avg(y4, plane4 + a, plane4 + b)
                        val bl = avg(y4, 2 * plane4 + a, 2 * plane4 + b)
                        out[dstRow + ox] = (0xFF shl 24) or (r shl 16) or (g shl 8) or bl
                    }
                }
            }
        }
    }

    private fun avg(buf: FloatBuffer, a: Int, b: Int): Int {
        val v = (buf.get(a) + buf.get(a + 1) + buf.get(b) + buf.get(b + 1)) * (255f / 4f)
        return v.roundToInt().coerceIn(0, 255)
    }

    /**
     * Transparency is not something the model knows about, so the alpha channel
     * is enlarged on its own, bilinearly. Fully opaque images skip this.
     */
    private fun applyAlpha(src: IntArray, w: Int, h: Int, out: IntArray, outW: Int, outH: Int) {
        if (src.all { (it ushr 24) == 0xFF }) return
        for (dy in 0 until outH) {
            val fy = ((dy + 0.5f) / 2f - 0.5f).coerceIn(0f, (h - 1).toFloat())
            val y0 = fy.toInt()
            val y1 = minOf(y0 + 1, h - 1)
            val wy = fy - y0
            for (dx in 0 until outW) {
                val fx = ((dx + 0.5f) / 2f - 0.5f).coerceIn(0f, (w - 1).toFloat())
                val x0 = fx.toInt()
                val x1 = minOf(x0 + 1, w - 1)
                val wx = fx - x0
                val a00 = src[y0 * w + x0] ushr 24
                val a10 = src[y0 * w + x1] ushr 24
                val a01 = src[y1 * w + x0] ushr 24
                val a11 = src[y1 * w + x1] ushr 24
                val top = a00 + (a10 - a00) * wx
                val bottom = a01 + (a11 - a01) * wx
                val a = (top + (bottom - top) * wy).roundToInt().coerceIn(0, 255)
                val i = dy * outW + dx
                out[i] = (a shl 24) or (out[i] and 0x00FFFFFF)
            }
        }
    }

    override fun close() {
        session.close()
    }
}
