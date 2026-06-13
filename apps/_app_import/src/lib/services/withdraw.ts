import client from "../axios/client";
import {
  DataMethodWithdraw,
  RequestCreateMethodWithdraw,
  RequestUpdateMethodWithdraw,
  ResponseCreateMethodWithdraw,
} from "@/interfaces/withdraw";

export const createMethodWithdraw = (formData: RequestCreateMethodWithdraw) =>
  new Promise<ResponseCreateMethodWithdraw>((resolve, reject) => {
    client
      .post(`/withdraw/methods`, formData)
      .then((response) => {
        resolve(response.data);
      })
      .catch((_error) => {
        reject(_error);
      });
  });

export const updateMethodWithdraw = (formData: RequestUpdateMethodWithdraw) =>
  new Promise<DataMethodWithdraw>((resolve, reject) => {
    client
      .patch(`/withdraw/methods/${formData._id}`, formData)
      .then((response) => {
        resolve(response.data);
      })
      .catch((_error) => {
        reject(_error);
      });
  });

export type ManualWithdrawCurrency = "USDT" | "USDC";

export type CreateManualWithdrawRequestBody = {
  address: string;
  currency: ManualWithdrawCurrency;
  amount: number;
};

/**
 * MiniPay users can't sign on-chain txs themselves (MiniPay is custodial in
 * the mini-app context). Instead they submit a request; admin fulfils the
 * USDT or USDC payout externally on Celo and marks it paid.
 */
export const createManualWithdrawRequest = (body: CreateManualWithdrawRequestBody) =>
  new Promise<{ success: boolean; data: unknown }>((resolve, reject) => {
    client
      .post(`/withdraw/request-manual`, body)
      .then((response) => resolve(response.data))
      .catch((err) => reject(err));
  });
