import { IResponseLogin } from "@/interfaces/auth";
import client from "../axios/client";

export const updateCountry = (formData: { country: string }) =>
  new Promise((resolve, reject) => {
    client
      .put(`/user/update-country`, formData)
      .then((response) => {
        resolve(response.data);
      })
      .catch((_error) => {
        reject(_error);
      });
  });

export const signInFirebase = (formData: {
  token: string;
  referral_id?: string;
  country: string;
  pathname?: string;
  locale?: string;
  posthog_distinct_id?: string;
  posthog_anonymous_id?: string;
}): Promise<IResponseLogin> =>
  new Promise((resolve, reject) => {
    client
      .post(`/auth/log-in`, formData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${formData.token}`,
          ...(formData.locale ? { "X-App-Locale": formData.locale } : {}),
          ...(formData.posthog_distinct_id
            ? { "X-PostHog-Distinct-Id": formData.posthog_distinct_id }
            : {}),
          ...(formData.posthog_anonymous_id
            ? { "X-PostHog-Anonymous-Id": formData.posthog_anonymous_id }
            : {}),
        },
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((_error) => {
        reject(_error);
      });
  });

/**
 * Fetch a single-use SIWE nonce from the server. The returned value must be
 * embedded verbatim in the `Nonce:` field of the EIP-4361 message body
 * before signing; the server consumes it on `/auth/minipay-siwe`.
 */
export const fetchSiweNonce = (): Promise<{ nonce: string }> =>
  client.get(`/auth/siwe-nonce`).then((response) => response.data);

/**
 * MiniPay SIWE sign-in: verify the EIP-4361 signature on the backend and
 * exchange it for a GoGoCash session (same envelope shape as Firebase).
 * The backend upserts a user keyed by wallet address with `provider: "minipay"`.
 */
export const signInMiniPaySiwe = (formData: {
  address: string;
  message: string;
  signature: string;
  referral_id?: string;
}): Promise<IResponseLogin> =>
  new Promise((resolve, reject) => {
    client
      .post(`/auth/minipay-siwe`, formData, {
        headers: { "Content-Type": "application/json" },
      })
      .then((response) => resolve(response.data))
      .catch((_error) => reject(_error));
  });

export const registerFirebase = (formData: {
  token: string;
  referral_id?: string;
  country: string;
  pathname?: string;
  locale?: string;
  posthog_distinct_id?: string;
  posthog_anonymous_id?: string;
}): Promise<IResponseLogin> =>
  new Promise((resolve, reject) => {
    client
      .post(`/auth/register`, formData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${formData.token}`,
          ...(formData.locale ? { "X-App-Locale": formData.locale } : {}),
          ...(formData.posthog_distinct_id
            ? { "X-PostHog-Distinct-Id": formData.posthog_distinct_id }
            : {}),
          ...(formData.posthog_anonymous_id
            ? { "X-PostHog-Anonymous-Id": formData.posthog_anonymous_id }
            : {}),
        },
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((_error) => {
        reject(_error);
      });
  });
