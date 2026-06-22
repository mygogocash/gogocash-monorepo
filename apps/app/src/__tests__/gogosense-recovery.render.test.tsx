import { act, renderHook, waitFor } from "@testing-library/react";
import { useGoGoSenseRecovery } from "@mobile/gogosense/useGoGoSenseRecovery";
import { describe, expect, it, vi } from "vitest";

describe("useGoGoSenseRecovery (render)", () => {
  it("creates and refreshes a manual recovery job", async () => {
    const api = {
      createScreenshotJob: vi.fn(async () => ({
        _id: "screenshot-1",
        status: "pending",
      })),
      getScreenshotJob: vi.fn(async () => ({
        _id: "screenshot-1",
        status: "manual_review",
        upload_url: "https://uploads.gogocash.test/screenshot-1",
      })),
    };

    const { result } = renderHook(() => useGoGoSenseRecovery(api));

    await act(async () => {
      await result.current.startRecovery();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.createScreenshotJob).toHaveBeenCalledTimes(1);
    expect(api.getScreenshotJob).toHaveBeenCalledWith("screenshot-1");
    expect(result.current.job).toMatchObject({
      id: "screenshot-1",
      status: "manual_review",
      uploadUrl: "https://uploads.gogocash.test/screenshot-1",
    });
  });

  it("clears a stale manual recovery job when the next start fails", async () => {
    const api = {
      createScreenshotJob: vi
        .fn()
        .mockResolvedValueOnce({
          _id: "screenshot-1",
          status: "pending",
        })
        .mockRejectedValueOnce(new Error("network down")),
      getScreenshotJob: vi.fn(async () => ({
        _id: "screenshot-1",
        status: "manual_review",
        upload_url: "https://uploads.gogocash.test/screenshot-1",
      })),
    };

    const { result } = renderHook(() => useGoGoSenseRecovery(api));

    await act(async () => {
      await result.current.startRecovery();
    });
    await waitFor(() => expect(result.current.job?.id).toBe("screenshot-1"));

    await act(async () => {
      await result.current.startRecovery();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.createScreenshotJob).toHaveBeenCalledTimes(2);
    expect(result.current.job).toBeNull();
    expect(result.current.error).toBe(
      "Recovery job could not be started. Try again from GoGoSense timeline."
    );
  });

  it("stays unavailable without an app api session", () => {
    const { result } = renderHook(() => useGoGoSenseRecovery(null));

    expect(result.current.available).toBe(false);
    expect(result.current.job).toBeNull();
  });
});
