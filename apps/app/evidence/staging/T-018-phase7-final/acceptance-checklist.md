# GoGoTrack Acceptance Checklist

Device: none
Foreground package: none
Activation deeplink foreground package: none
Activation deeplink: https://invl.me/clnlmow

- [ ] Android device connected: fail - no adb devices listed; connect an Android device or start an emulator
- [ ] Device evidence captured: fail - missing device-adb-reverse.txt, device-window.txt, device-logcat.txt, device-screenshot.png
- [ ] GoGoCash dev client installed: missing
- [ ] Dev-client APK hash verified: missing
- [ ] Metro ADB reverse configured: missing
- [ ] Usage Access granted: missing
- [ ] Supported merchant app installed: missing
- [ ] Supported merchant launched: missing
- [ ] Supported merchant foreground: missing
- [ ] GoGoTrack hub returned: missing
- [ ] GoGoTrack activation nudge visible: missing
- [ ] GoGoTrack activation nudge tapped: missing
- [x] Authenticated API reachable: pass - GET /gototrack/settings accepted token
- [x] Detection probe matched: pass - matched Shopee
- [x] Activation deeplink returned: pass - https://invl.me/clnlmow
- [ ] Activation deeplink opened: missing
- [ ] Activation deeplink post-open foreground captured: missing

Evidence files to attach when present:
- preflight-report.json
- summary.txt
- preflight-command.txt
- activation-deeplink.txt
- device-adb-reverse.txt
- device-window.txt
- device-logcat.txt
- device-screenshot.png
- merchant-foreground-window.txt
- merchant-foreground-screenshot.png
- merchant-foreground-ui.xml
- gototrack-hub-window.txt
- gototrack-hub-screenshot.png
- gototrack-hub-ui.xml
- activation-nudge-tap.txt
- activation-nudge-tap-window.txt
- activation-nudge-tap-screenshot.png
- activation-nudge-tap-ui.xml
- activation-deeplink-window.txt
- activation-deeplink-screenshot.png
- activation-deeplink-ui.xml

