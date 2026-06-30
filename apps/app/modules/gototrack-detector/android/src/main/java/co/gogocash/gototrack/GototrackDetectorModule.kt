package co.gogocash.gototrack

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * GoGoTrack Android foreground-app detector (UsageStats) plus optional background
 * monitor service for system activation prompts.
 */
class GototrackDetectorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GototrackDetector")

    Events("onMerchantMatch")

    Function("isAndroidSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
    }

    AsyncFunction("hasUsageAccessPermission") {
      GototrackUsageAccess.hasUsageAccess(requireContext())
    }

    AsyncFunction("openUsageAccessSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      requireContext().startActivity(intent)
    }

    AsyncFunction("getCurrentForegroundPackage") {
      currentForegroundPackage()
    }

    AsyncFunction("startDetection") {
      startMonitorService()
    }

    AsyncFunction("stopDetection") {
      stopMonitorService()
    }

    AsyncFunction("syncBackgroundPromptConfig") { config: Map<String, Any?> ->
      val prefs = GototrackPromptPreferences(requireContext())
      val enabled = config["enabled"] as? Boolean ?: false
      prefs.setBackgroundPromptsEnabled(enabled)
      prefs.setAuthToken(config["authToken"] as? String)
      prefs.setApiBaseUrl(config["apiBaseUrl"] as? String)

      if (enabled) {
        startMonitorService()
      } else {
        stopMonitorService()
      }
    }
  }

  private fun requireContext(): Context =
    appContext.reactContext ?: throw ReactContextUnavailableException()

  private fun startMonitorService() {
    val context = requireContext()
    val prefs = GototrackPromptPreferences(context)
    if (!prefs.isBackgroundPromptsEnabled()) {
      return
    }
    val intent = Intent(context, GototrackMonitorService::class.java)
    ContextCompat.startForegroundService(context, intent)
  }

  private fun stopMonitorService() {
    val context = requireContext()
    val stopIntent =
      Intent(context, GototrackMonitorService::class.java).apply {
        action = GototrackMonitorService.ACTION_STOP
      }
    context.startService(stopIntent)
  }

  private fun currentForegroundPackage(): String? {
    if (!GototrackUsageAccess.hasUsageAccess(requireContext())) return null
    val context = requireContext()
    val usageStats =
      context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val end = System.currentTimeMillis()
    val begin = end - LOOKBACK_MS
    val events = usageStats.queryEvents(begin, end)
    val event = UsageEvents.Event()
    var latestPackage: String? = null
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (GototrackUsageAccess.isForegroundEvent(event.eventType) &&
        event.packageName != context.packageName
      ) {
        latestPackage = event.packageName
      }
    }
    return latestPackage
  }

  companion object {
    private const val LOOKBACK_MS = 120_000L
  }
}

private class ReactContextUnavailableException :
  CodedException("GototrackDetector: React context is unavailable")
