# GoGoCash Input Data Validation Specs

This document defines user input validations, constraints, formats, and mock flags for the GoGoCash app.

---

## 1. Phone Auth & OTP Verification

Phone authentication is the core gateway for registering or linking MyCashback accounts.

- **Dial Code**: Dropdown selection (e.g. `+66` for Thailand, `+81` for Japan, `+1` for US).
- **Local Number Validation**:
  - Strip all non-digit characters: `phoneDigits = inputVal.replace(/\D/g, "")`.
  - Must have at least **9 digits** (e.g. `0891234567` becomes `891234567`).
  - Converts to E.164 format: `${dialCode}${phoneDigits}` before dispatching.
- **OTP Verification**:
  - Code consists of exactly **6 digits**: `otp = otpInput.replace(/\D/g, "")`.
  - Display error if digits are fewer than 6.
- **Mock Developer Mode**:
  - Enabled via environment settings.
  - Matches test local magic numbers and returns a predictable mock OTP code for quick developer validations.

---

## 2. Withdrawal Method Validations

When adding a new payout method in `/method/create`, inputs are validated per tab.

### 2.1 PromptPay
- **PromptPay ID Type Selection**: Radio buttons select either `phone` or `citizen`.
- **Account Identifier (`account_no`)**:
  - Phone mode: Must consist of exactly 10 digits (Thai local) or 13 digits (E.164).
  - Citizen ID mode: Must consist of exactly 13 digits.
  - Strips non-digits: `ppCode.trim()`.
- **Thai Owner Name**: Required, must contain Thai characters and spaces.
- **English Owner Name**: Required, must contain English characters and spaces.
- **QR Attachment**: Optional, must be image type (`image/*`).
- **Bank Code Payload**: Dispatched as `PP_PHONE` or `PP_CITIZEN` respectively.

### 2.2 Bank Account
- **Bank Name Selection (`bank_name`)**: Selected from list.
- **Bank Code (`bank_code`)**: Selected from standard codes (e.g. `BBL`, `KBANK`, `SCB`).
- **Account Number (`account_no`)**: Required, digits only, length between 10 to 12.
- **Account Owner Name (`account_name`)**: Required, string, letters and spaces only.

### 2.3 Crypto Wallet Address
- **Wallet Address (`account_no`)**:
  - Must be a valid **EVM/Ethereum hex address**.
  - Verified via regex: `/^0x[a-fA-F0-9]{40}$/`.
- **Bank Code & Name Payload**: Standardized to `CRYPTO` / `"Crypto Wallet"`.

---

## 3. KYC / Profile Edit Validations

When updating profile details or performing KYC validation, fields must be validated before submission:

- **Username**: Required, alphanumeric string, spaces allowed, length between 3 and 30 characters.
- **ID Type & Identification Number**:
  - `national` (National ID): String of exactly 13 digits.
  - `passport` (Passport ID): Alphanumeric, length between 7 and 15 characters.
- **Address & Location**:
  - Legal Address: Required, minimum 10 characters.
  - Country, State, City: Mandatory selections.
  - Zip Code: Digits only, length 5 (Thai postal code format).
- **Gender**: Selected from Male, Female, Other, or left empty (Optional).
- **Birthdate**: Date picker format `YYYY-MM-DD`. Must ensure age is **18 years or older** at the time of verification.
