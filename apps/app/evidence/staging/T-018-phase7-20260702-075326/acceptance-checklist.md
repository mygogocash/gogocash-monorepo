# GoGoTrack Acceptance Checklist

Device: SM02G4061912033
Foreground package: com.shopee.th
Activation deeplink foreground package: com.android.chrome
Activation deeplink: https://invl.me/clnlmow

- [x] Android device connected: pass - SM02G4061912033
- [x] Device evidence captured: pass - device-evidence.txt, device-adb-reverse.txt, device-window.txt, device-logcat.txt, device-screenshot.png
- [x] GoGoCash dev client installed: pass - co.gogocash.app
- [ ] Dev-client APK hash verified: missing
- [x] Metro ADB reverse configured: pass - tcp:8081 -> tcp:8081
- [ ] Usage Access granted: missing
- [x] Supported merchant app installed: pass - com.shopee.th
- [x] Supported merchant launched: pass - com.shopee.th launcher intent sent
- [ ] Supported merchant foreground: missing
- [x] GoGoTrack hub returned: pass - gogocash://gototrack opened in co.gogocash.app
- [x] GoGoTrack activation nudge visible: pass - ./evidence/staging/T-018-phase7-20260702-075326//gototrack-hub-ui.xml contains activation nudge evidence
- [x] GoGoTrack activation nudge tapped: pass - ./evidence/staging/T-018-phase7-20260702-075326//gototrack-hub-ui.xml tapped at 600,50
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

