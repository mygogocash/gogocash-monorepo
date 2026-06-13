import { DataFav, RequestDataFav } from "@/interfaces/offer";
import { fetcherPost } from "../axios/client";

export const favoriteOffer = (formData: RequestDataFav) =>
  fetcherPost([
    `/offer/favorite/${formData.offer_id}`,
    {
      data: formData,
    },
  ]) as Promise<DataFav>;
