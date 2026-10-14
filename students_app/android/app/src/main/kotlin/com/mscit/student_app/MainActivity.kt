package com.mscit.student_app

import android.content.ContentValues
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.mscit.student_app/media_scanner"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "scanFile" -> {
                    val path = call.argument<String>("path")
                    if (path != null) {
                        MediaScannerConnection.scanFile(
                            applicationContext,
                            arrayOf(path),
                            null
                        ) { scannedPath, uri ->
                            // File scanned and indexed into Android MediaStore (Recents/Downloads)
                        }
                        result.success(true)
                    } else {
                        result.error("INVALID_PATH", "Path cannot be null", null)
                    }
                }
                "getPublicDownloadsPath" -> {
                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    result.success(downloadsDir?.absolutePath ?: "/storage/emulated/0/Download")
                }
                "saveToDownloads" -> {
                    val fileName = call.argument<String>("fileName") ?: "document"
                    val bytes = call.argument<ByteArray>("bytes")
                    val mimeType = call.argument<String>("mimeType") ?: "application/octet-stream"

                    if (bytes == null || bytes.isEmpty()) {
                        result.error("EMPTY_DATA", "Byte array is empty", null)
                        return@setMethodCallHandler
                    }

                    try {
                        var savedFilePath: String? = null
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            // Android 10+ (API 29+): Scoped Storage via MediaStore.Downloads (No permissions needed)
                            val values = ContentValues().apply {
                                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                                put(MediaStore.MediaColumns.IS_PENDING, 1)
                            }
                            val resolver = applicationContext.contentResolver
                            val collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                            val uri: Uri? = resolver.insert(collection, values)
                            if (uri != null) {
                                resolver.openOutputStream(uri)?.use { outputStream ->
                                    outputStream.write(bytes)
                                    outputStream.flush()
                                }
                                values.clear()
                                values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                                resolver.update(uri, values, null, null)

                                resolver.query(uri, arrayOf(MediaStore.MediaColumns.DATA), null, null, null)?.use { cursor ->
                                    if (cursor.moveToFirst()) {
                                        val dataIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                                        if (dataIdx >= 0) {
                                            savedFilePath = cursor.getString(dataIdx)
                                        }
                                    }
                                }
                                if (savedFilePath.isNullOrEmpty()) {
                                    savedFilePath = "${Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).absolutePath}/$fileName"
                                }
                            }
                        } else {
                            // Android 9 and below: direct filesystem write
                            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                            if (!downloadsDir.exists()) {
                                downloadsDir.mkdirs()
                            }
                            val destFile = File(downloadsDir, fileName)
                            FileOutputStream(destFile).use { fos ->
                                fos.write(bytes)
                                fos.flush()
                            }
                            savedFilePath = destFile.absolutePath
                            MediaScannerConnection.scanFile(applicationContext, arrayOf(savedFilePath), null, null)
                        }

                        result.success(savedFilePath)
                    } catch (e: Exception) {
                        result.error("SAVE_FAILED", e.message, null)
                    }
                }
                "renderPdfPages" -> {
                    val bytes = call.argument<ByteArray>("bytes")
                    val maxPages = call.argument<Int>("maxPages") ?: 10

                    if (bytes == null || bytes.isEmpty()) {
                        result.error("EMPTY_DATA", "Byte array is empty", null)
                        return@setMethodCallHandler
                    }

                    try {
                        val tempFile = File.createTempFile("pdf_preview_", ".pdf", cacheDir)
                        tempFile.writeBytes(bytes)
                        val pfd = ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY)
                        val renderer = PdfRenderer(pfd)
                        val pageCount = renderer.pageCount
                        val limit = minOf(pageCount, maxPages)
                        val renderedPages = mutableListOf<ByteArray>()

                        for (i in 0 until limit) {
                            val page = renderer.openPage(i)
                            val width = (page.width * 2.0).toInt()
                            val height = (page.height * 2.0).toInt()
                            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                            bitmap.eraseColor(Color.WHITE)
                            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                            page.close()

                            val stream = ByteArrayOutputStream()
                            bitmap.compress(Bitmap.CompressFormat.PNG, 85, stream)
                            renderedPages.add(stream.toByteArray())
                            bitmap.recycle()
                        }

                        renderer.close()
                        pfd.close()
                        tempFile.delete()

                        val responseMap = mapOf(
                            "totalPages" to pageCount,
                            "pages" to renderedPages
                        )
                        result.success(responseMap)
                    } catch (e: Exception) {
                        result.error("RENDER_FAILED", e.message, null)
                    }
                }
                else -> result.notImplemented()
            }
        }

        // Native app icon badge handler (ShortcutBadger + Xiaomi MIUI notification reflection)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "flutter_app_icon_badge").setMethodCallHandler { call, result ->
            when (call.method) {
                "updateBadge" -> {
                    try {
                        val countArg = call.argument<Any>("count")
                        val count = when (countArg) {
                            is Int -> countArg
                            is Number -> countArg.toInt()
                            is String -> countArg.toIntOrNull() ?: 0
                            else -> 0
                        }
                        // 1. ShortcutBadger for OEM launchers
                        me.leolin.shortcutbadger.ShortcutBadger.applyCount(applicationContext, count)

                        // 2. Clear any legacy/stale notification 1001
                        try {
                            val notificationManager = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
                            notificationManager?.cancel(1001)
                        } catch (_: Throwable) {}

                        result.success(null)
                    } catch (e: Exception) {
                        result.success(null)
                    }
                }
                "removeBadge" -> {
                    try {
                        me.leolin.shortcutbadger.ShortcutBadger.removeCount(applicationContext)
                        val notificationManager = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
                        notificationManager?.cancel(1001)
                        result.success(null)
                    } catch (e: Exception) {
                        result.success(null)
                    }
                }
                "isAppBadgeSupported" -> {
                    try {
                        result.success(me.leolin.shortcutbadger.ShortcutBadger.isBadgeCounterSupported(applicationContext))
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }
}
