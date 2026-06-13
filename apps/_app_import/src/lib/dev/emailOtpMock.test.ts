import { describe, expect, it } from "vitest";
import {
  DEV_EMAIL_OTP_EXISTING_USER,
  DEV_EMAIL_OTP_EXISTING_USER_CODE,
  DEV_EMAIL_OTP_NEW_USER,
  DEV_EMAIL_OTP_NEW_USER_CODE,
  devEmailMockExpectedOtp,
  devEmailMockIsNewUser,
  devEmailMockTelegramLoginResponse,
  devEmailMockVerifyOtpHttpStatus,
  isDevEmailOtpTestAddress,
} from "./emailOtpMock";

describe("emailOtpMock", () => {
  it("recognizes test addresses case-insensitively", () => {
    expect(isDevEmailOtpTestAddress(DEV_EMAIL_OTP_NEW_USER)).toBe(true);
    expect(isDevEmailOtpTestAddress("OTP.NEW.USER@GOGOCASH.TEST")).toBe(true);
    expect(isDevEmailOtpTestAddress(DEV_EMAIL_OTP_EXISTING_USER)).toBe(true);
    expect(isDevEmailOtpTestAddress("other@test.com")).toBe(false);
  });

  it("maps emails to expected OTPs", () => {
    expect(devEmailMockExpectedOtp(DEV_EMAIL_OTP_NEW_USER)).toBe(DEV_EMAIL_OTP_NEW_USER_CODE);
    expect(devEmailMockExpectedOtp(DEV_EMAIL_OTP_EXISTING_USER)).toBe(
      DEV_EMAIL_OTP_EXISTING_USER_CODE
    );
    expect(devEmailMockExpectedOtp("x@y.com")).toBeNull();
  });

  it("flags new vs existing user", () => {
    expect(devEmailMockIsNewUser(DEV_EMAIL_OTP_NEW_USER)).toBe(true);
    expect(devEmailMockIsNewUser(DEV_EMAIL_OTP_EXISTING_USER)).toBe(false);
  });

  it("returns 400 for wrong OTP on verify body", () => {
    expect(
      devEmailMockVerifyOtpHttpStatus({
        email: DEV_EMAIL_OTP_NEW_USER,
        otp: "000000",
      })
    ).toBe(400);
    expect(
      devEmailMockVerifyOtpHttpStatus({
        email: DEV_EMAIL_OTP_NEW_USER,
        otp: DEV_EMAIL_OTP_NEW_USER_CODE,
      })
    ).toBe(200);
  });

  it("builds telegram login response with matching is_new_user", () => {
    const neu = devEmailMockTelegramLoginResponse(DEV_EMAIL_OTP_NEW_USER);
    expect(neu).not.toBeNull();
    expect(neu?.is_new_user).toBe(true);
    expect(neu?.auth_flow).toBe("register");
    expect(neu?.user.email).toBe(DEV_EMAIL_OTP_NEW_USER);

    const ex = devEmailMockTelegramLoginResponse(DEV_EMAIL_OTP_EXISTING_USER);
    expect(ex).not.toBeNull();
    expect(ex?.is_new_user).toBe(false);
    expect(ex?.auth_flow).toBe("login");
    expect(ex?.user.email).toBe(DEV_EMAIL_OTP_EXISTING_USER);
  });
});
