# GoGoTrack Acceptance Checklist

Device: SM02G4061912033
Foreground package: com.shopee.th
Activation deeplink foreground package: none
Activation deeplink: none

- [x] Android device connected: pass - SM02G4061912033
- [ ] Device evidence captured: missing
- [x] GoGoCash dev client installed: pass - co.gogocash.app
- [ ] Dev-client APK hash verified: missing
- [ ] Metro ADB reverse configured: missing
- [ ] Usage Access granted: missing
- [x] Supported merchant app installed: pass - com.shopee.th
- [x] Supported merchant launched: pass - com.shopee.th launcher intent sent
- [ ] Supported merchant foreground: missing
- [x] GoGoTrack hub returned: pass - gogocash://gototrack opened in co.gogocash.app
- [ ] GoGoTrack activation nudge visible: fail - evidence/staging/T-demo-verify/gototrack-hub-ui.xml does not contain activation nudge markers (Activate cashback, gototrack-activate-cashback-button, Activate cashback for, …)
- [ ] GoGoTrack activation nudge tapped: fail - evidence/staging/T-demo-verify/gototrack-hub-ui.xml does not contain activation nudge bounds
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

