package co.gogocash.gototrack

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationManagerCompat

class GototrackPromptReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_ACCEPT -> {
        val deepLink = intent.getStringExtra(EXTRA_DEEPLINK) ?: return
        val launchIntent =
          Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            setPackage(context.packageName)
          }
        context.startActivity(launchIntent)
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID_PROMPT)
      }
      ACTION_DISMISS -> {
        val notificationId =
          intent.getIntExtra(EXTRA_NOTIFICATION_ID, NOTIFICATION_ID_PROMPT)
        NotificationManagerCompat.from(context).cancel(notificationId)
      }
    }
  }

  companion object {
    const val ACTION_ACCEPT = "co.gogocash.gototrack.action.PROMPT_ACCEPT"
    const val ACTION_DISMISS = "co.gogocash.gototrack.action.PROMPT_DISMISS"
    const val EXTRA_DEEPLINK = "deeplink"
    const val EXTRA_NOTIFICATION_ID = "notificationId"
    private const val NOTIFICATION_ID_PROMPT = 7102
  }
}
