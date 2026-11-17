package com.sympupscale.nail

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import androidx.exifinterface.media.ExifInterface
import com.sympupscale.nail.core.Upscaler
import java.io.File
import java.io.FileOutputStream

/** Reading the chosen image and writing the result, nothing else. */
object Images {

    /** Folder under Pictures the results go to. */
    const val FOLDER = "Symp's Upscale"

    sealed class Loaded {
        class Ok(val bitmap: Bitmap, val name: String) : Loaded()
        class TooBig(val width: Int, val height: Int) : Loaded()
        object Unreadable : Loaded()
    }

    /**
     * Decodes [uri] upright (a phone photo is often stored sideways with a tag
     * saying so) in ARGB_8888, the layout the upscaler reads.
     */
    fun load(context: Context, uri: Uri): Loaded {
        val cr = context.contentResolver
        return try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            cr.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return Loaded.Unreadable
            if (bounds.outWidth.toLong() * bounds.outHeight > Upscaler.MAX_INPUT_PIXELS) {
                return Loaded.TooBig(bounds.outWidth, bounds.outHeight)
            }

            val opts = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 }
            val decoded = cr.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
                ?: return Loaded.Unreadable

            val upright = rotateUpright(decoded, orientationOf(context, uri))
            val bitmap = if (upright.config == Bitmap.Config.ARGB_8888) upright
            else upright.copy(Bitmap.Config.ARGB_8888, false)
            Loaded.Ok(bitmap, baseName(context, uri))
        } catch (e: OutOfMemoryError) {
            Loaded.TooBig(0, 0)
        } catch (e: Exception) {
            Loaded.Unreadable
        }
    }

    private fun orientationOf(context: Context, uri: Uri): Int = try {
        context.contentResolver.openInputStream(uri)?.use {
            ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        } ?: ExifInterface.ORIENTATION_NORMAL
    } catch (e: Exception) {
        ExifInterface.ORIENTATION_NORMAL
    }

    private fun rotateUpright(src: Bitmap, orientation: Int): Bitmap {
        val m = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> m.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> m.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> m.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> m.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> m.postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> { m.postRotate(90f); m.postScale(-1f, 1f) }
            ExifInterface.ORIENTATION_TRANSVERSE -> { m.postRotate(270f); m.postScale(-1f, 1f) }
            else -> return src
        }
        val out = Bitmap.createBitmap(src, 0, 0, src.width, src.height, m, true)
        if (out !== src) src.recycle()
        return out
    }

    /** The file's own name without its extension, for naming the result. */
    private fun baseName(context: Context, uri: Uri): String {
        val raw = try {
            context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
                ?.use { c -> if (c.moveToFirst()) c.getString(0) else null }
        } catch (e: Exception) {
            null
        } ?: uri.lastPathSegment
        val stem = raw?.substringAfterLast('/')?.substringBeforeLast('.')?.trim().orEmpty()
        // Keep what any file system accepts.
        val safe = stem.replace(Regex("[\\\\/:*?\"<>|]"), "_").take(80)
        return safe.ifEmpty { "image_${System.currentTimeMillis()}" }
    }

    /**
     * Writes [bitmap] as PNG into Pictures/Symp's Upscale and returns the
     * file name. PNG because the result goes to a printer: no compression
     * artefact gets added on top of the detail just computed.
     */
    fun save(context: Context, bitmap: Bitmap, name: String): String {
        val fileName = "${name}_x2.png"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val cr = context.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/$FOLDER")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
            val uri = cr.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                ?: error("la galerie a refusé le fichier")
            try {
                cr.openOutputStream(uri)?.use { out ->
                    check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) { "encodage PNG impossible" }
                } ?: error("écriture impossible")
                values.clear()
                values.put(MediaStore.Images.Media.IS_PENDING, 0)
                cr.update(uri, values, null, null)
            } catch (e: Exception) {
                cr.delete(uri, null, null)
                throw e
            }
            return fileName
        }

        @Suppress("DEPRECATION")
        val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), FOLDER)
        if (!dir.exists() && !dir.mkdirs()) error("dossier Images inaccessible")
        var file = File(dir, fileName)
        var n = 2
        while (file.exists()) file = File(dir, "${name}_x2 ($n).png").also { n++ }
        FileOutputStream(file).use { out ->
            check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) { "encodage PNG impossible" }
        }
        // Without this the gallery does not see the file until the next scan.
        MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf("image/png"), null)
        return file.name
    }
}
