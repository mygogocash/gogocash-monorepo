package co.gogocash.gototrack

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Foreground UsageStats monitor for GoGoTrack background activation prompts.
 * Polls foreground merchant apps, calls POST /gototrack/detect when enabled,
 * and surfaces an actionable notification (Accept / Dismiss).
 */
class GototrackMonitorService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val worker = Executors.newSingleThreadExecutor()
  private var lastPackage: String? = null
  private var lastDetectAtMs: Long = 0L
  private var lastPromptKey: String? = null
  private var lastPromptAtMs: Long = 0L

  private val pollRunnable =
    object : Runnable {
      override fun run() {
        worker.execute {
          try {
            pollOnce()
          } catch (_: Exception) {
            // Keep the service alive; the next poll retries.
          }
        }
        handler.postDelayed(this, POLL_INTERVAL_MS)
      }
    }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    startForeground(NOTIFICATION_ID_MONITOR, buildMonitorNotification())
    handler.post(pollRunnable)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopSelf()
        return START_NOT_STICKY
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(pollRunnable)
    worker.shutdownNow()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun pollOnce() {
    val prefs = GototrackPromptPreferences(this)
    if (!prefs.isBackgroundPromptsEnabled()) {
      stopSelf()
      return
    }

    if (!GototrackUsageAccess.hasUsageAccess(this)) {
      return
    }

    val packageName = currentForegroundPackage() ?: return
    if (packageName == applicationContext.packageName) {
      return
    }

    val now = System.currentTimeMillis()
    if (packageName == lastPackage) {
      if (now - lastDetectAtMs < SAME_PACKAGE_REDETECT_MS) {
        return
      }
    } else {
      lastPackage = packageName
    }
    lastDetectAtMs = now

    val apiBaseUrl = prefs.getApiBaseUrl() ?: return
    val authToken = prefs.getAuthToken() ?: return
    val detectResponse = callDetect(apiBaseUrl, authToken, packageName) ?: return
    if (!detectResponse.optBoolean("matched")) {
      return
    }
    if (detectResponse.optString("recommendedAction") != "activate") {
      return
    }

    val merchantId = detectResponse.optString("merchantId")
    val offerId = detectResponse.optInt("offerId", -1)
    val networkMerchantId = detectResponse.optInt("networkMerchantId", -1)
    if (merchantId.isNullOrBlank() || offerId < 0 || networkMerchantId < 0) {
      return
    }

    val detectionEventId = detectResponse.optString("detectionEventId", "")
    val promptKey = "$packageName:$detectionEventId"
    val promptNow = System.currentTimeMillis()
    if (promptKey == lastPromptKey && promptNow - lastPromptAtMs < PROMPT_COOLDOWN_MS) {
      return
    }
    lastPromptKey = promptKey
    lastPromptAtMs = promptNow

    val merchantName = detectResponse.optString("merchantName", merchantId)
    showActivationNotification(
      packageName = packageName,
      merchantId = merchantId,
      merchantName = merchantName,
      offerId = offerId,
      networkMerchantId = networkMerchantId,
      detectionEventId = detectionEventId,
    )
  }

  private fun showActivationNotification(
    packageName: String,
    merchantId: String,
    merchantName: String,
    offerId: Int,
    networkMerchantId: Int,
    detectionEventId: String,
  ) {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val deepLink =
      buildActivateDeepLink(
        packageName,
        merchantId,
        merchantName,
        offerId,
        networkMerchantId,
        detectionEventId,
      )

    val acceptIntent =
      Intent(this, GototrackPromptReceiver::class.java).apply {
        action = GototrackPromptReceiver.ACTION_ACCEPT
        putExtra(GototrackPromptReceiver.EXTRA_DEEPLINK, deepLink)
      }
    val dismissIntent =
      Intent(this, GototrackPromptReceiver::class.java).apply {
        action = GototrackPromptReceiver.ACTION_DISMISS
        putExtra(GototrackPromptReceiver.EXTRA_NOTIFICATION_ID, NOTIFICATION_ID_PROMPT)
      }

    val acceptPending =
      PendingIntent.getBroadcast(
        this,
        1,
        acceptIntent,
        pendingIntentFlags(),
      )
    val dismissPending =
      PendingIntent.getBroadcast(
        this,
        2,
        dismissIntent,
        pendingIntentFlags(),
      )

    val notification =
      NotificationCompat.Builder(this, PROMPT_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(getString(R.string.gototrack_prompt_title))
        .setContentText(
          getString(R.string.gototrack_prompt_body, merchantName),
        )
        .setOngoing(false)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
        .addAction(
          android.R.drawable.ic_menu_close_clear_cancel,
          getString(R.string.gototrack_prompt_dismiss),
          dismissPending,
        )
        .addAction(
          android.R.drawable.ic_menu_send,
          getString(R.string.gototrack_prompt_accept),
          acceptPending,
        )
        .build()

    manager.notify(NOTIFICATION_ID_PROMPT, notification)
  }

  private fun buildMonitorNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(getString(R.string.gototrack_monitor_title))
      .setContentText(getString(R.string.gototrack_monitor_body))
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val monitorChannel =
      NotificationChannel(
        CHANNEL_ID,
        getString(R.string.gototrack_channel_name),
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = getString(R.string.gototrack_channel_description)
      }
    val promptChannel =
      NotificationChannel(
        PROMPT_CHANNEL_ID,
        getString(R.string.gototrack_prompt_channel_name),
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = getString(R.string.gototrack_prompt_channel_description)
        enableVibration(true)
      }
    manager.createNotificationChannel(monitorChannel)
    manager.createNotificationChannel(promptChannel)
  }

  private fun currentForegroundPackage(): String? {
    val usageStats =
      getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val end = System.currentTimeMillis()
    val begin = end - LOOKBACK_MS
    val events = usageStats.queryEvents(begin, end)
    val event = UsageEvents.Event()
    var latestPackage: String? = null
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (GototrackUsageAccess.isForegroundEvent(event.eventType) &&
        event.packageName != applicationContext.packageName
      ) {
        latestPackage = event.packageName
      }
    }
    return latestPackage
  }

  private fun callDetect(
    apiBaseUrl: String,
    authToken: String,
    packageName: String,
  ): JSONObject? {
    val url = URL("${apiBaseUrl.trimEnd('/')}/gototrack/detect")
    val connection = (url.openConnection() as HttpURLConnection).apply {
      requestMethod = "POST"
      setRequestProperty("Content-Type", "application/json")
      setRequestProperty("Authorization", "Bearer $authToken")
      doOutput = true
      connectTimeout = 15_000
      readTimeout = 15_000
    }

    val body =
      JSONObject()
        .put("method", "android_package")
        .put("packageName", packageName)
        .put("platform", "android")
        .put("observedAt", java.time.Instant.now().toString())
        .toString()

    connection.outputStream.use { stream ->
      stream.write(body.toByteArray(Charsets.UTF_8))
    }

    val code = connection.responseCode
    val stream =
      if (code in 200..299) connection.inputStream else connection.errorStream
    val responseText =
      stream?.use { input ->
        BufferedReader(InputStreamReader(input)).readText()
      } ?: return null
    if (code !in 200..299) {
      return null
    }
    return JSONObject(responseText)
  }

  private fun pendingIntentFlags(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
  }

  companion object {
    const val ACTION_STOP = "co.gogocash.gototrack.action.STOP_MONITOR"
    private const val CHANNEL_ID = "gototrack_monitor"
    private const val PROMPT_CHANNEL_ID = "gototrack_prompt"
    private const val NOTIFICATION_ID_MONITOR = 7101
    private const val NOTIFICATION_ID_PROMPT = 7102
    private const val LOOKBACK_MS = 120_000L
    private const val POLL_INTERVAL_MS = 15_000L
    private const val SAME_PACKAGE_REDETECT_MS = 30_000L
    private const val PROMPT_COOLDOWN_MS = 5 * 60 * 1000L

    fun buildActivateDeepLink(
      packageName: String,
      merchantId: String,
      merchantName: String,
      offerId: Int,
      networkMerchantId: Int,
      detectionEventId: String,
    ): String {
      val builder =
        Uri.Builder()
          .scheme("gogocash")
          .authority("gototrack")
          .appendPath("activate")
          .appendQueryParameter("merchantId", merchantId)
          .appendQueryParameter("merchantName", merchantName)
          .appendQueryParameter("offerId", offerId.toString())
          .appendQueryParameter("networkMerchantId", networkMerchantId.toString())
          .appendQueryParameter("packageName", packageName)
      if (detectionEventId.isNotBlank()) {
        builder.appendQueryParameter("detectionEventId", detectionEventId)
      }
      return builder.build().toString()
    }
  }
}
