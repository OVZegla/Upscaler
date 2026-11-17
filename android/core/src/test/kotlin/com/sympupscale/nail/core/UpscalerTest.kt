package com.sympupscale.nail.core

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO
import kotlin.math.abs
import kotlin.math.log10
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Runs the real model, the file the app ships, on a plain JVM.
 *
 * The reference image was produced by the desktop app's own engine (ncnn, the
 * same weights) enlarged by 4 and averaged down to 2, so these tests hold the
 * Android pipeline to what the desktop app already does, not to itself.
 */
class UpscalerTest {

    private val modelBytes = File(System.getProperty("model.path")).readBytes()
    private val opened = mutableListOf<Upscaler>()

    private fun upscaler(tile: Int = Upscaler.TILE): Upscaler {
        val env = OrtEnvironment.getEnvironment()
        val session = env.createSession(modelBytes, OrtSession.SessionOptions())
        return Upscaler(env, session, tile).also { opened += it }
    }

    @AfterTest
    fun close() = opened.forEach { it.close() }

    private fun load(name: String): BufferedImage =
        ImageIO.read(javaClass.classLoader.getResource(name)!!)

    private fun argbOf(img: BufferedImage): IntArray =
        img.getRGB(0, 0, img.width, img.height, null, 0, img.width)

    private fun psnr(a: IntArray, b: IntArray): Double {
        var se = 0.0
        for (i in a.indices) {
            for (shift in intArrayOf(16, 8, 0)) {
                val d = ((a[i] shr shift) and 0xFF) - ((b[i] shr shift) and 0xFF)
                se += d * d
            }
        }
        val mse = se / (a.size * 3)
        return if (mse == 0.0) Double.POSITIVE_INFINITY else 10 * log10(255.0 * 255.0 / mse)
    }

    @Test
    fun matches_the_desktop_engine() {
        val src = load("sample.png")
        val ref = load("sample_engine_x2.png")
        val out = upscaler().upscale2x(argbOf(src), src.width, src.height)
        assertNotNull(out)
        assertEquals(ref.width * ref.height, out.size)
        // The desktop engine computes in half precision on the GPU; this runs in
        // single precision. 54.9 dB measured; a plain bicubic enlargement of the
        // same image scores 30.7 against the same reference.
        val score = psnr(out, argbOf(ref))
        println("PSNR against the desktop engine: %.2f dB".format(score))
        assertTrue(score > 48.0, "PSNR against the desktop engine: $score dB")
    }

    @Test
    fun tiles_leave_no_seam() {
        // 300x200 cut into 64-pixel tiles, against one tile holding everything.
        val src = load("sample.png")
        val px = argbOf(src)
        val tiled = upscaler(tile = 64).upscale2x(px, src.width, src.height)!!
        val whole = upscaler(tile = 512).upscale2x(px, src.width, src.height)!!
        var worst = 0
        for (i in tiled.indices) {
            for (shift in intArrayOf(16, 8, 0)) {
                worst = maxOf(worst, abs(((tiled[i] shr shift) and 0xFF) - ((whole[i] shr shift) and 0xFF)))
            }
        }
        assertTrue(worst <= 1, "largest difference between tiled and whole: $worst")
    }

    @Test
    fun output_is_exactly_twice_the_size_and_opaque_stays_opaque() {
        val w = 37
        val h = 23
        val px = IntArray(w * h) { i -> (0xFF shl 24) or ((i * 7) and 0xFFFFFF) }
        val out = upscaler().upscale2x(px, w, h)!!
        assertEquals(w * 2 * h * 2, out.size)
        assertTrue(out.all { (it ushr 24) == 0xFF })
    }

    @Test
    fun transparency_is_carried_over() {
        val w = 20
        val h = 10
        // Left half opaque, right half fully transparent.
        val px = IntArray(w * h) { i -> if (i % w < w / 2) 0xFFCC3366.toInt() else 0x00CC3366 }
        val out = upscaler().upscale2x(px, w, h)!!
        val ow = w * 2
        assertEquals(0xFF, out[5 * ow + 2] ushr 24)
        assertEquals(0x00, out[5 * ow + ow - 3] ushr 24)
    }

    @Test
    fun the_smallest_images_do_not_break_it() {
        for ((w, h) in listOf(1 to 1, 2 to 1, 1 to 3, 5 to 4)) {
            val px = IntArray(w * h) { 0xFF808080.toInt() }
            val out = upscaler().upscale2x(px, w, h)
            assertNotNull(out, "${w}x$h")
            assertEquals(w * h * 4, out.size)
        }
    }

    @Test
    fun a_flat_colour_stays_that_colour() {
        val w = 40
        val h = 30
        val colour = 0xFF3A7BD5.toInt()
        val out = upscaler().upscale2x(IntArray(w * h) { colour }, w, h)!!
        for (p in out) {
            for (shift in intArrayOf(16, 8, 0)) {
                val d = abs(((p shr shift) and 0xFF) - ((colour shr shift) and 0xFF))
                assertTrue(d <= 2, "flat colour drifted by $d")
            }
        }
    }

    @Test
    fun cancelling_stops_and_returns_nothing() {
        val src = load("sample.png")
        var calls = 0
        val out = upscaler(tile = 64).upscale2x(
            argbOf(src), src.width, src.height,
            isCancelled = { ++calls > 2 },
        )
        assertNull(out)
    }

    @Test
    fun progress_ends_at_one() {
        val src = load("sample.png")
        val seen = mutableListOf<Float>()
        upscaler(tile = 100).upscale2x(argbOf(src), src.width, src.height, onProgress = { seen += it })
        assertEquals(0f, seen.first())
        assertEquals(1f, seen.last())
        assertTrue(seen.zipWithNext().all { (a, b) -> b >= a })
    }

    @Test
    fun reflect_matches_mirror_padding() {
        // numpy.pad(mode="reflect") on [0, 1, 2, 3]: ... 2 1 | 0 1 2 3 | 2 1 0 1 ...
        val n = 4
        val expected = mapOf(-3 to 3, -2 to 2, -1 to 1, 0 to 0, 3 to 3, 4 to 2, 5 to 1, 6 to 0, 7 to 1)
        for ((c, want) in expected) assertEquals(want, Upscaler.reflect(c, n), "reflect($c)")
        assertEquals(0, Upscaler.reflect(-18, 1))
        for (c in -100..100) assertTrue(Upscaler.reflect(c, 3) in 0..2)
    }
}
