# GoGoTrack Acceptance Checklist

Device: SM02G4061912033
Foreground package: com.shopee.th
Activation deeplink foreground package: none
Activation deeplink: none

- [x] Android device connected: pass - SM02G4061912033
- [x] Device evidence captured: pass - device-evidence.txt, device-adb-reverse.txt, device-window.txt, device-logcat.txt, device-screenshot.png
- [x] GoGoCash dev client installed: pass - co.gogocash.app
- [ ] Dev-client APK hash verified: missing
- [ ] Metro ADB reverse configured: missing
- [ ] Usage Access granted: missing
- [x] Supported merchant app installed: pass - com.shopee.th
- [ ] Supported merchant launched: missing
- [ ] Supported merchant foreground: missing
- [x] GoGoTrack hub returned: pass - gogocash://gototrack opened in co.gogocash.app
- [x] GoGoTrack activation nudge visible: pass - evidence/staging/T-apk39/phase7/gototrack-hub-ui.xml contains activation nudge evidence
- [ ] GoGoTrack activation nudge tapped: missing
- [x] Authenticated API reachable: pass - GET /gototrack/settings accepted token
- [x] Detection probe matched: pass - matched Shopee
- [ ] Activation deeplink returned: missing
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

