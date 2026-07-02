# GoGoTrack Acceptance Checklist

Device: SM02G4061912033
Foreground package: co.gogocash.app
Activation deeplink foreground package: com.android.chrome
Activation deeplink: https://invl.me/clnlmow

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
- [ ] GoGoTrack activation nudge visible: fail - ./evidence/staging/T-018-phase7//gototrack-hub-ui.xml does not contain GoGoTrack hub markers (GoGoTrack, Protected tracking, PROTECTED TRACKING); gogocash://gototrack may have landed on home
- [ ] GoGoTrack activation nudge tapped: fail - ./evidence/staging/T-018-phase7//gototrack-hub-ui.xml does not contain activation nudge bounds
- [x] Authenticated API reachable: pass - GET /gototrack/settings accepted token
- [x] Detection probe matched: pass - matched Shopee
- [x] Activation deeplink returned: pass - https://invl.me/clnlmow
- [x] Activation deeplink opened: pass - https://invl.me/clnlmow
- [x] Activation deeplink post-open foreground captured: pass - com.android.chrome after activation deeplink

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

