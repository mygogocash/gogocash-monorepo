import client from "@/lib/axios/client";

export type SendWithdrawUserContactOtpResponse = {
  demoCode?: string;
  message?: string;
};

export async function sendWithdrawUserContactOtp(params: {
  userId: string;
  channel: "email" | "mobile";
  target: string;
}): Promise<SendWithdrawUserContactOtpResponse> {
  const res = await client.post<SendWithdrawUserContactOtpResponse>(
    "/withdraw/send-user-contact-otp",
    params,
  );
  return res.data;
}

export async function verifyWithdrawUserContactOtp(params: {
  userId: string;
  channel: "email" | "mobile";
  target: string;
  otp: string;
}): Promise<void> {
  await client.post("/withdraw/verify-user-contact-otp", params);
}

export async function updateWithdrawUserProfile(body: {
  userId: string;
  emails: string[];
  mobiles: string[];
  fullName: string;
  gender: string;
  birthdate: string;
  wallet: string;
  gogopassActive: boolean;
}): Promise<void> {
  await client.post("/withdraw/update-withdraw-user", body);
}
