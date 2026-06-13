import { describe, expect, it } from "vitest";
import {
  DEV_PHONE_CREDENTIAL_JWT,
  DEV_PHONE_EXISTING_USER_LOCAL_DIGITS,
  DEV_PHONE_EXISTING_USER_OTP,
  DEV_PHONE_LOCAL_DIGITS,
  DEV_PHONE_NEW_USER_LOCAL_DIGITS,
  DEV_PHONE_NEW_USER_OTP,
  DEV_PHONE_OTP,
  devPhoneMockExpectedOtp,
  devPhoneMockIsNewUser,
  isDevPhoneMagicLocalDigits,
} from "./phoneAuthMock";

describe("phoneAuthMock", () => {
  it("documents the dev phone + OTP pair for login QA", () => {
    expect(DEV_PHONE_NEW_USER_LOCAL_DIGITS).toBe("123456789");
    expect(DEV_PHONE_LOCAL_DIGITS).toBe(DEV_PHONE_NEW_USER_LOCAL_DIGITS);
    expect(DEV_PHONE_EXISTING_USER_LOCAL_DIGITS).toBe("321654987");
    expect(DEV_PHONE_NEW_USER_OTP).toBe("123456");
    expect(DEV_PHONE_EXISTING_USER_OTP).toBe("321654");
    expect(DEV_PHONE_OTP).toBe(DEV_PHONE_NEW_USER_OTP);
    expect(DEV_PHONE_CREDENTIAL_JWT.length).toBeGreaterThan(10);
  });

  it("maps magic numbers to dev OTPs", () => {
    expect(devPhoneMockExpectedOtp("123456789")).toBe("123456");
    expect(devPhoneMockExpectedOtp("321654987")).toBe("321654");
    expect(devPhoneMockExpectedOtp("000000000")).toBe("");
  });

  it("classifies mock numbers for new vs existing user", () => {
    expect(isDevPhoneMagicLocalDigits("123456789")).toBe(true);
    expect(isDevPhoneMagicLocalDigits("321654987")).toBe(true);
    expect(isDevPhoneMagicLocalDigits("111111111")).toBe(false);
    expect(devPhoneMockIsNewUser("+66123456789", "login")).toBe(true);
    expect(devPhoneMockIsNewUser("+66321654987", "register")).toBe(false);
    expect(devPhoneMockIsNewUser("+66999888777", "register")).toBe(true);
    expect(devPhoneMockIsNewUser("+66999888777", "login")).toBe(false);
  });
});
