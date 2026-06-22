package co.gogocash.gogosense

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * GoGoSense Android foreground-app detector (UsageStats-only MVP).
 *
 * Scope (locked): detect-on-return via UsageStatsManager. NO persistent
 * foreground service, NO NotificationListenerService, NO screenshot capture.
 * `startDetection`/`stopDetection` are intentionally light — the detection
 * loop is driven from JS (detectionRunner) while a session is active; the
 * always-on background service is a deferred phase 2.
 *
 * VERIFICATION: this native code is compiled + exercised only in an EAS
 * dev-client build on a real Android device (see the plan's Phase 4). It is
 * not built by the JS/vitest suite.
 */
class GogosenseDetectorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GogosenseDetector")

    Function("isAndroidSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
    }

    AsyncFunction("hasUsageAccessPermission") {
      hasUsageAccess()
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

    // Foreground-only MVP: no service to start/stop. Kept so the JS detector
    // interface is fully satisfied and phase-2 can fill these in.
    AsyncFunction("startDetection") {}
    AsyncFunction("stopDetection") {}
  }

  private fun requireContext(): Context =
    appContext.reactContext ?: throw ReactContextUnavailableException()

  private fun hasUsageAccess(): Boolean {
    val context = requireContext()
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName,
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName,
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /**
   * Most-recent foreground app package over a two-minute trailing window, excluding
   * GoGoCash itself. Returns null when Usage Access is not granted or no
   * other-app foreground event occurred. MOVE_TO_FOREGROUND (== ACTIVITY_RESUMED
   * on API 29+, same constant value) works across supported API levels.
   */
  private fun isForegroundEvent(eventType: Int): Boolean {
    return eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
      (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        eventType == UsageEvents.Event.ACTIVITY_RESUMED)
  }

  private fun currentForegroundPackage(): String? {
    if (!hasUsageAccess()) return null
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
      if (isForegroundEvent(event.eventType) &&
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
  CodedException("GogosenseDetector: React context is unavailable")
