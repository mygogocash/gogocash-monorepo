import { RequestGenerateDeeplink, ResponseGenerateDeeplink } from "@/interfaces/shop";
import { fetcherPost } from "../axios/client";

export const generateDeeplink = (formData: RequestGenerateDeeplink) =>
  fetcherPost([
    `/involve/create-affiliate`,
    {
      data: formData,
    },
  ]) as Promise<ResponseGenerateDeeplink>;
