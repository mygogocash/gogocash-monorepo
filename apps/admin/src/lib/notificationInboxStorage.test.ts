// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from "vitest";
import {
  hasUnreadNotifications,
  loadDismissedNotificationKeys,
  mergeDismissedNotificationKeys,
  NOTIFICATION_DISMISSED_STORAGE_KEY,
  saveDismissedNotificationKeys,
} from "./notificationInboxStorage";

describe("notificationInboxStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("mergeDismissedNotificationKeys > dedupes keys", () => {
    expect(mergeDismissedNotificationKeys(["w:1"], ["w:1", "o:2"])).toEqual([
      "w:1",
      "o:2",
    ]);
  });

  it("hasUnreadNotifications > returns false when every key is dismissed", () => {
    expect(
      hasUnreadNotifications(["w:1", "o:2"], ["w:1", "o:2"]),
    ).toBe(false);
  });

  it("hasUnreadNotifications > returns true when a new key is not dismissed", () => {
    expect(hasUnreadNotifications(["w:1", "w:2"], ["w:1"])).toBe(true);
  });

  it("persists dismissed keys in localStorage", () => {
    saveDismissedNotificationKeys(["w:1", "o:3"]);
    expect(window.localStorage.getItem(NOTIFICATION_DISMISSED_STORAGE_KEY)).toBe(
      JSON.stringify(["w:1", "o:3"]),
    );
    expect(loadDismissedNotificationKeys()).toEqual(["w:1", "o:3"]);
  });
});
