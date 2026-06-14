// Session-scoped flag for the "Every Purchase Pays You Back" intro modal.
//
// React Native has no `sessionStorage`, so we mirror its semantics with a module-level singleton:
// the flag lives for the JS process lifetime (one app session) and is cleared once consumed.
// Set on a successful sign-in (CustomerAuthScreen) and read once when the home screen mounts.

let introModalPending = false;

export function markIntroModalPending(): void {
  introModalPending = true;
}

/** Returns the pending state and clears it (show-once semantics). */
export function consumeIntroModalPending(): boolean {
  const pending = introModalPending;
  introModalPending = false;
  return pending;
}
