import ExpoModulesCore
import UserNotifications

/**
 * Live Activity / Dynamic Island shell for GoGoTrack activation prompts.
 *
 * Full in-merchant detection requires Apple DeviceActivity + Family Controls
 * entitlement (see docs/gototrack-ios-deviceactivity-spike.md). Until approved,
 * we show a best-effort local notification when ActivityKit is unavailable.
 */
public class GototrackLiveActivityModule: Module {
  private let promptNotificationId = "gototrack-activation-prompt"

  public func definition() -> ModuleDefinition {
    Name("GototrackLiveActivity")

    AsyncFunction("startActivationPrompt") { (payload: [String: Any]) in
      await self.presentActivationPrompt(payload)
    }

    AsyncFunction("endActivationPrompt") {
      await self.clearActivationPrompt()
    }

    AsyncFunction("updateActivationPrompt") { (payload: [String: Any]) in
      await self.presentActivationPrompt(payload)
    }
  }

  @MainActor
  private func presentActivationPrompt(_ payload: [String: Any]) async {
    if #available(iOS 16.2, *) {
      // ActivityKit UI requires a widget extension + entitlement; defer until approved.
      NSLog("GoGoTrack Live Activity start requested (ActivityKit deferred): %@", payload.description)
    }

    let merchantName = payload["merchantName"] as? String ?? payload["merchantId"] as? String ?? "merchant"
    let content = UNMutableNotificationContent()
    content.title = "Cashback available"
    content.body = "Tap to activate cashback for \(merchantName)."
    content.sound = .default
    content.userInfo = payload

    let center = UNUserNotificationCenter.current()
    let settings = await center.notificationSettings()
    guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else {
      NSLog("GoGoTrack activation prompt skipped: notification permission not granted")
      return
    }

    let request = UNNotificationRequest(
      identifier: self.promptNotificationId,
      content: content,
      trigger: nil
    )

    do {
      try await center.add(request)
    } catch {
      NSLog("GoGoTrack activation prompt notification failed: %@", error.localizedDescription)
    }
  }

  @MainActor
  private func clearActivationPrompt() async {
    let center = UNUserNotificationCenter.current()
    center.removeDeliveredNotifications(withIdentifiers: [self.promptNotificationId])
    center.removePendingNotificationRequests(withIdentifiers: [self.promptNotificationId])
    NSLog("GoGoTrack Live Activity end requested")
  }
}
