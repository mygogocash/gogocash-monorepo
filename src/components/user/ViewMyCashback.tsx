import { fetcher } from "@/lib/axios/client";
import { formatDate } from "@/lib/dateFormat";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../ui/modal";
import { MyCashbackResponse } from "@/types/user";
interface IProp {
  id: string;
  openModal: boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
}
const ViewMyCashback = ({ id, openModal, setOpenModal }: IProp) => {
  const { data: myCashback } = useQuery<MyCashbackResponse[]>({
    queryKey: ["getMyCashback", id],
    queryFn: () => fetcher(`/admin/get-mycashback-user/${id}`),
    enabled: !!id,
  });

  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={function (): void {
        setOpenModal(false);
      }}
      className="min-h-[300px] max-w-[600px] p-5 lg:p-10"
    >
      <h1>My Cashback</h1>
      <div>
        {myCashback && myCashback.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No cashback found.
          </p>
        )}
        {myCashback &&
          myCashback?.map((cashback) => (
            <div key={cashback._id} className="mb-4 border-b pb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Phone: {cashback.phoneNumber}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                BuyerId: {cashback.buyerId}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Created At: {formatDate(cashback.createdAt)}
              </p>
              {cashback.balance?.map((balance) => (
                <div key={balance._id} className="mt-2 ml-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Balance Amount: {balance.amount} {balance.currency}
                  </p>
                </div>
              ))}
            </div>
          ))}
      </div>
    </Modal>
  );
};
export default ViewMyCashback;
