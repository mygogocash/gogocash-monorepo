import type { DataMethodWithdraw, RequestCreateMethodWithdraw } from "@/interfaces/withdraw";

export const EMPTY_FORM: RequestCreateMethodWithdraw = {
  account_no: "",
  account_name: "",
  bank_name: "",
  bank_code: "",
  is_default: false,
};

export function methodToForm(d: DataMethodWithdraw): RequestCreateMethodWithdraw {
  return {
    account_no: d.account_no,
    account_name: d.account_name,
    bank_name: d.bank_name,
    bank_code: d.bank_code,
    is_default: d.is_default,
  };
}
