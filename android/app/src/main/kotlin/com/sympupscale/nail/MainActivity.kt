package com.sympupscale.nail

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import ai.onnxruntime.OrtSession
import com.sympupscale.nail.core.Upscaler
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The whole app: choose an image, press Upscale, compare, save.
 *
 * Deliberately one screen and one decision. There is no scale to pick (it is
 * always x2), no model, no zoom, no settings: the person at the machine should
 * never have to wonder what a control does.
 */
class MainActivity : Activity() {

    private enum class Stage { EMPTY, LOADED, WORKING, DONE }

    private lateinit var dropZone: View
    private lateinit var compare: CompareView
    private lateinit var working: View
    private lateinit var workingText: TextView
    private lateinit var progress: ProgressBar
    private lateinit var sizeLine: TextView
    private lateinit var primary: Button
    private lateinit var secondary: Button

    private val main = Handler(Looper.getMainLooper())

    // One thread for the model: it is not meant to run two jobs at once, and
    // keeping it on one thread keeps the session's memory in one place.
    private val worker = Executors.newSingleThreadExecutor()

    @Volatile private var upscaler: Upscaler? = null
    @Volatile private var engineError: String? = null

    private var stage = Stage.EMPTY
    private var source: Bitmap? = null
    private var sourceName = "image"
    private var result: Bitmap? = null
    private var saved = false
    private var cancel = AtomicBoolean(false)
    private var pendingSave = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        dropZone = findViewById(R.id.dropZone)
        compare = findViewById(R.id.compare)
        working = findViewById(R.id.working)
        workingText = findViewById(R.id.workingText)
        progress = findViewById(R.id.progress)
        sizeLine = findViewById(R.id.sizeLine)
        primary = findViewById(R.id.primary)
        secondary = findViewById(R.id.secondary)

        dropZone.setOnClickListener { pickImage() }
        findViewById<View>(R.id.about).setOnClickListener { showAbout() }
        primary.setOnClickListener { onPrimary() }
        secondary.setOnClickListener { onSecondary() }

        // Load the model while the person is choosing an image.
        worker.execute { startEngine() }

        render()
        handleIncoming(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (stage != Stage.WORKING) handleIncoming(intent)
    }

    override fun onDestroy() {
        cancel.set(true)
        worker.execute { upscaler?.close() }
        worker.shutdown()
        super.onDestroy()
    }

    // ── Engine ──────────────────────────────────────────────────────────────

    private fun startEngine() {
        try {
            val bytes = assets.open("upscale.onnx").use { it.readBytes() }
            upscaler = Upscaler.create(bytes) { opts ->
                opts.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
                opts.setIntraOpNumThreads(Runtime.getRuntime().availableProcessors().coerceIn(1, 8))
            }
        } catch (e: Throwable) {
            engineError = e.message ?: e.javaClass.simpleName
        }
    }

    // ── Choosing an image ───────────────────────────────────────────────────

    private fun pickImage() {
        if (stage == Stage.WORKING) return
        val open = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "image/*"
        }
        // Some machine builds strip the system file picker; fall back to
        // whatever gallery app is there.
        val get = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "image/*"
        }
        val chosen = listOf(open, get).firstOrNull { it.resolveActivity(packageManager) != null }
        if (chosen == null) {
            toast(getString(R.string.err_no_picker))
            return
        }
        startActivityForResult(chosen, REQ_PICK)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_PICK && resultCode == RESULT_OK) data?.data?.let { open(it) }
    }

    private fun handleIncoming(intent: Intent?) {
        val uri: Uri? = when (intent?.action) {
            Intent.ACTION_SEND -> sharedStream(intent)
            Intent.ACTION_VIEW -> intent.data
            else -> null
        }
        uri?.let { open(it) }
    }

    @Suppress("DEPRECATION")
    private fun sharedStream(intent: Intent): Uri? = intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri

    private fun open(uri: Uri) {
        worker.execute {
            val loaded = Images.load(this, uri)
            main.post {
                when (loaded) {
                    is Images.Loaded.Ok -> {
                        source = loaded.bitmap
                        sourceName = loaded.name
                        result = null
                        saved = false
                        stage = Stage.LOADED
                        compare.showSingle(loaded.bitmap)
                        render()
                    }
                    is Images.Loaded.TooBig ->
                        if (loaded.width > 0) {
                            alert(getString(R.string.err_too_big, loaded.width, loaded.height))
                        } else {
                            alert(getString(R.string.err_memory))
                        }
                    Images.Loaded.Unreadable -> alert(getString(R.string.err_open))
                }
            }
        }
    }

    // ── Upscaling ───────────────────────────────────────────────────────────

    private fun startUpscale() {
        val src = source ?: return
        stage = Stage.WORKING
        cancel = AtomicBoolean(false)
        val token = cancel
        progress.progress = 0
        workingText.text = getString(R.string.preparing)
        render()

        worker.execute {
            val engine = upscaler
            if (engine == null) {
                val why = engineError ?: "moteur indisponible"
                main.post { failUpscale(getString(R.string.err_engine, why)) }
                return@execute
            }
            try {
                val w = src.width
                val h = src.height
                val px = IntArray(w * h)
                src.getPixels(px, 0, w, 0, 0, w, h)
                var lastPct = -1
                val out = engine.upscale2x(
                    px, w, h,
                    onProgress = { f ->
                        val pct = (f * 100).toInt()
                        if (pct != lastPct) {
                            lastPct = pct
                            main.post {
                                if (stage == Stage.WORKING) {
                                    progress.progress = (f * 1000).toInt()
                                    workingText.text = getString(R.string.working, pct)
                                }
                            }
                        }
                    },
                    isCancelled = { token.get() },
                )
                if (out == null) {
                    main.post { if (stage == Stage.WORKING) { stage = Stage.LOADED; render() } }
                    return@execute
                }
                val bmp = Bitmap.createBitmap(out, w * 2, h * 2, Bitmap.Config.ARGB_8888)
                main.post {
                    if (token.get()) return@post
                    result = bmp
                    saved = false
                    stage = Stage.DONE
                    compare.showComparison(src, bmp)
                    render()
                }
            } catch (e: OutOfMemoryError) {
                main.post { failUpscale(getString(R.string.err_memory)) }
            } catch (e: Throwable) {
                main.post { failUpscale(getString(R.string.err_upscale, e.message ?: e.javaClass.simpleName)) }
            }
        }
    }

    private fun failUpscale(message: String) {
        stage = if (source != null) Stage.LOADED else Stage.EMPTY
        render()
        alert(message)
    }

    // ── Saving ──────────────────────────────────────────────────────────────

    private fun save() {
        val bmp = result ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            Build.VERSION.SDK_INT <= Build.VERSION_CODES.P &&
            checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
        ) {
            pendingSave = true
            requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), REQ_WRITE)
            return
        }
        primary.isEnabled = false
        primary.text = "…"
        worker.execute {
            val outcome = runCatching { Images.save(this, bmp, sourceName) }
            main.post {
                outcome.onSuccess {
                    saved = true
                    toast(getString(R.string.saved))
                }.onFailure {
                    alert(getString(R.string.err_save, it.message ?: it.javaClass.simpleName))
                }
                render()
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_WRITE && pendingSave) {
            pendingSave = false
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) save()
            else alert(getString(R.string.err_save, "autorisation refusée"))
        }
    }

    // ── Buttons and screen state ────────────────────────────────────────────

    private fun onPrimary() {
        when (stage) {
            Stage.EMPTY -> pickImage()
            Stage.LOADED -> startUpscale()
            Stage.DONE -> if (!saved) save()
            Stage.WORKING -> Unit
        }
    }

    private fun onSecondary() {
        when (stage) {
            Stage.WORKING -> {
                cancel.set(true)
                stage = Stage.LOADED
                render()
            }
            Stage.LOADED, Stage.DONE -> pickImage()
            Stage.EMPTY -> Unit
        }
    }

    private fun render() {
        dropZone.visibility = if (stage == Stage.EMPTY) View.VISIBLE else View.GONE
        compare.visibility = if (stage == Stage.EMPTY) View.GONE else View.VISIBLE
        working.visibility = if (stage == Stage.WORKING) View.VISIBLE else View.GONE
        if (stage == Stage.EMPTY) compare.clear()
        if (stage == Stage.LOADED) source?.let { compare.showSingle(it) }

        val src = source
        if (src != null && stage != Stage.EMPTY) {
            sizeLine.text = getString(R.string.size_line, src.width, src.height, src.width * 2, src.height * 2) +
                "   ·   " + getString(R.string.zoom_hint)
            sizeLine.visibility = View.VISIBLE
        } else {
            sizeLine.visibility = View.INVISIBLE
        }

        primary.isEnabled = true
        when (stage) {
            Stage.EMPTY -> {
                primary.visibility = View.VISIBLE
                primary.text = getString(R.string.pick_title)
                secondary.visibility = View.GONE
            }
            Stage.LOADED -> {
                primary.visibility = View.VISIBLE
                primary.text = getString(R.string.upscale)
                secondary.visibility = View.VISIBLE
                secondary.text = getString(R.string.new_image)
            }
            Stage.WORKING -> {
                primary.visibility = View.GONE
                secondary.visibility = View.VISIBLE
                secondary.text = getString(R.string.cancel)
            }
            Stage.DONE -> {
                primary.visibility = View.VISIBLE
                primary.text = if (saved) "✓ " + getString(R.string.save) else getString(R.string.save)
                primary.isEnabled = !saved
                secondary.visibility = View.VISIBLE
                secondary.text = getString(R.string.new_image)
            }
        }
    }

    private fun showAbout() {
        AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
            .setTitle(R.string.about_title)
            .setMessage(R.string.about_body)
            .setPositiveButton(R.string.ok, null)
            .show()
    }

    private fun alert(message: String) {
        AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
            .setMessage(message)
            .setPositiveButton(R.string.ok, null)
            .show()
    }

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    private companion object {
        const val REQ_PICK = 1
        const val REQ_WRITE = 2
    }
}
