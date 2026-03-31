import { describe, expect, it } from "vitest";
import {
  createMockRegisterResponse,
  createMockSignInResponse,
  mockSignInUser,
  mockTelegramSignInResponse,
} from "./signInMockData";

describe("signInMockData", () => {
  it("mock user has required User fields", () => {
    expect(mockSignInUser._id).toBeTruthy();
    expect(mockSignInUser.email).toContain("@");
    expect(mockSignInUser.country).toBeTruthy();
  });

  it("createMockSignInResponse matches login shape", () => {
    const res = createMockSignInResponse();
    expect(res.token).toBeTruthy();
    expect(res.user.email).toBe(mockSignInUser.email);
    expect(res.is_new_user).toBe(false);
    expect(res.auth_flow).toBe("login");
  });

  it("createMockRegisterResponse flags new user", () => {
    const res = createMockRegisterResponse();
    expect(res.is_new_user).toBe(true);
    expect(res.auth_flow).toBe("register");
  });

  it("mockTelegramSignInResponse has telegram fields", () => {
    expect(mockTelegramSignInResponse.user.id_telegram).toBeTruthy();
    expect(mockTelegramSignInResponse.user.provider).toBe("telegram");
  });
});
