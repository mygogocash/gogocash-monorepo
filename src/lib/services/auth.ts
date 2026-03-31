import { IRequestSignInCrossmint, IResponseLogin } from "@/interfaces/auth";
import client from "../axios/client";

export const signInCrossmint = (formData: IRequestSignInCrossmint, jwt: string) =>
  new Promise<IResponseLogin>((resolve, reject) => {
    // Prepare the request payload with proper validation

    client
      .post<IResponseLogin>(`/auth/sign-in`, formData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        // Enhance error message for better user experience
        const enhancedError = {
          ...error,
          response: {
            ...error.response,
            data: {
              ...error.response?.data,
              message: error.response?.data?.message || "Authentication failed. Please try again.",
            },
          },
        };

        reject(enhancedError);
      });
  });

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
