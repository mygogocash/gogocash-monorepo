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
- [x] Supported merchant launched: pass - com.shopee.th launcher intent sent
- [ ] Supported merchant foreground: missing
- [x] GoGoTrack hub returned: pass - gogocash://gototrack opened in co.gogocash.app
- [ ] GoGoTrack activation nudge visible: fail - evidence/staging/T-demo-ota-20260705-2005/gototrack-hub-ui.xml does not contain activation nudge markers (Activate cashback, gototrack-activate-cashback-button, gototrack-activation-nudge, …)
- [ ] GoGoTrack activation nudge tapped: missing
- [ ] Authenticated API reachable: warn - no token provided; set GOGOTRACK_AUTH_TOKEN (or GOTOTRACK_AUTH_TOKEN / GOGOSENSE_AUTH_TOKEN) or pass --auth-token
- [ ] Detection probe matched: missing
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

