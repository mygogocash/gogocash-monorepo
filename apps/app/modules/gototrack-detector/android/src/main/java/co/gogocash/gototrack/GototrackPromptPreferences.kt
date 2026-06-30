package co.gogocash.gototrack

import android.content.Context

class GototrackPromptPreferences(context: Context) {
  private val prefs =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun isBackgroundPromptsEnabled(): Boolean {
    return prefs.getBoolean(KEY_ENABLED, false)
  }

  fun setBackgroundPromptsEnabled(enabled: Boolean) {
    prefs.edit().putBoolean(KEY_ENABLED, enabled).apply()
  }

  fun getAuthToken(): String? {
    return prefs.getString(KEY_AUTH_TOKEN, null)?.takeIf { it.isNotBlank() }
  }

  fun setAuthToken(token: String?) {
    prefs.edit().putString(KEY_AUTH_TOKEN, token).apply()
  }

  fun getApiBaseUrl(): String? {
    return prefs.getString(KEY_API_BASE_URL, null)?.takeIf { it.isNotBlank() }
  }

  fun setApiBaseUrl(url: String?) {
    prefs.edit().putString(KEY_API_BASE_URL, url).apply()
  }

  companion object {
    const val PREFS_NAME = "gogocash_gototrack_prompts"
    const val KEY_ENABLED = "background_prompts_enabled"
    const val KEY_AUTH_TOKEN = "auth_token"
    const val KEY_API_BASE_URL = "api_base_url"
  }
}
