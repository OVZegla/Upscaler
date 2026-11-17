package com.sympupscale.nail.core

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.nio.FloatBuffer
import kotlin.math.roundToInt

/**
 * Doubles the size of an image with an ONNX super-resolution model.
 *
 * Two kinds of model are accepted, told apart by the "scale" entry of the
 * model's metadata. A x2 model's output is used as is. A x4 model (the desktop
 * app's own, which carries no metadata) is enlarged by 4 and each 2x2 block of
 * the result averaged into one pixel, which lands on exactly twice the size.
 *
 * The image is processed in tiles so that a cheap tablet with little memory can
 * still do it. Each tile is read with a margin as wide as the model's reach
 * (its "receptive_radius" metadata: one pixel per stacked 3x3 convolution):
 * with that margin a tile sees exactly what it would see inside the whole
 * image, so the seams between tiles do not exist rather than being hidden. At
 * the edges of the image the margin is filled by mirroring the image, as the
 * desktop engine does. A small model has a small reach, which is part of why
 * it is fast: less of every tile is margin.
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
        /** Input pixels per tile side: a few tens of MB per tile at most. */
        const val TILE = 256

        /** Reach of the desktop model, 18 stacked 3x3 convolutions. */
        const val DESKTOP_MODEL_PAD = 18

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

    private val meta: Map<String, String> =
        runCatching { session.metadata.customMetadata }.getOrNull() ?: emptyMap()

    /** How much the model itself enlarges: 2 or 4. */
    val modelScale: Int = meta["scale"]?.toIntOrNull() ?: 4

    /** Margin read around each tile. */
    val pad: Int = meta["receptive_radius"]?.toIntOrNull() ?: DESKTOP_MODEL_PAD

    init {
        require(modelScale == 2 || modelScale == 4) { "unsupported model scale $modelScale" }
    }

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
        val iw = tw + 2 * pad
        val ih = th + 2 * pad
        val plane = iw * ih
        val input = FloatBuffer.allocate(3 * plane)
        val data = input.array()

        for (y in 0 until ih) {
            val sy = reflect(y0 - pad + y, h)
            for (x in 0 until iw) {
                val sx = reflect(x0 - pad + x, w)
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
                val y = (result[0] as OnnxTensor).floatBuffer
                if (modelScale == 2) {
                    copyX2(y, iw, ih, x0, y0, tw, th, out, outW)
                    return
                }
                val y4 = y
                val ow4 = iw * 4
                val plane4 = ow4 * ih * 4
                val off = pad * 4
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

    private fun copyX2(
        y: FloatBuffer, iw: Int, ih: Int,
        x0: Int, y0: Int, tw: Int, th: Int,
        out: IntArray, outW: Int,
    ) {
        val ow = iw * 2
        val plane = ow * ih * 2
        val off = pad * 2
        for (oy in 0 until th * 2) {
            val row = (off + oy) * ow + off
            val dstRow = (y0 * 2 + oy) * outW + x0 * 2
            for (ox in 0 until tw * 2) {
                val i = row + ox
                val r = level(y.get(i))
                val g = level(y.get(plane + i))
                val b = level(y.get(2 * plane + i))
                out[dstRow + ox] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
            }
        }
    }

    private fun level(v: Float): Int = (v * 255f).roundToInt().coerceIn(0, 255)

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
