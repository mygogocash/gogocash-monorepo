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
