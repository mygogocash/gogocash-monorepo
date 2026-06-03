import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import { devError } from "@/lib/devConsole";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useDataSession } from "@/hooks/useDataSession";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { ResponseQuestCreateForm, ResponseQuestDate } from "@/types/quest";
interface IProp {
  fetchData: () => void;
  openModal: boolean | ResponseQuestDate;
  setOpenModal: React.Dispatch<
    React.SetStateAction<boolean | ResponseQuestDate>
  >;
  form: ResponseQuestCreateForm;
  setForm: React.Dispatch<React.SetStateAction<ResponseQuestCreateForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const FormQuest = ({
  fetchData,
  openModal,
  setOpenModal,
  form,
  setForm,
  isLoading,
  setIsLoading,
}: IProp) => {
  const session = useDataSession();
  const bannerEnUrl = useObjectUrl(
    form.banner_en instanceof File ? form.banner_en : null,
  );
  const bannerThUrl = useObjectUrl(
    form.banner_th instanceof File ? form.banner_th : null,
  );
  const subBannerEnUrl = useObjectUrl(
    form.sub_banner_en instanceof File ? form.sub_banner_en : null,
  );
  const subBannerThUrl = useObjectUrl(
    form.sub_banner_th instanceof File ? form.sub_banner_th : null,
  );
  // Handle file change
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const handleSave = () => {
    const formData = new FormData();

    if (typeof openModal === "object") {
      formData.append("_id", openModal._id);
    }
    formData.append("start_date", String(form.start_date));
    formData.append("end_date", String(form.end_date));
    formData.append("facebook_page", String(form.facebook_page));
    formData.append("facebook_post", String(form.facebook_post));
    formData.append("line", String(form.line));

    if (form.banner_en instanceof File) {
      formData.append("banner_en", form.banner_en);
    }
    if (form.banner_th instanceof File) {
      formData.append("banner_th", form.banner_th);
    }
    if (form.sub_banner_en instanceof File) {
      formData.append("sub_banner_en", form.sub_banner_en);
    }
    if (form.sub_banner_th instanceof File) {
      formData.append("sub_banner_th", form.sub_banner_th);
    }
    setIsLoading(true);
    client
      .post(`/point/create-quest`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        setOpenModal(false);
        fetchData();
        setIsLoading(false);
        toast.success("updated successfully");
      })
      .catch((err) => {
        setIsLoading(false);
        devError("Failed to save quest:", err);
        toast.error(err?.data?.message || "updated error");
      });
  };
  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={function (): void {
        setOpenModal(false);
      }}
      className="max-h-screen max-w-screen p-5 lg:p-10"
    >
      <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
        Create Quest
      </h4>
      <div className="max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto">
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date: Ex.(2026-02-01)
            </p>
            <Input
              type="text"
              name="start_date"
              onChange={(event) =>
                setForm({ ...form, start_date: event.target.value })
              }
              defaultValue={form.start_date || ""}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              End Date: Ex.(2026-02-28)
            </p>
            <Input
              type="text"
              name="end_date"
              onChange={(event) =>
                setForm({ ...form, end_date: event.target.value })
              }
              defaultValue={form.end_date || ""}
            />
          </div>
          <div>
            <p className="mt-3 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload banner_en:
            </p>
            <Input
              type="file"
              name="banner_en"
              onChange={(event) => handleFileChange(event, "banner_en")}
            />
            {(form.banner_en || (openModal as ResponseQuestDate).banner_en) && (
              <div className="mt-4 mb-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview banner en:
                </p>
                <RemoteOrBlobImage
                  src={
                    bannerEnUrl ??
                    `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as ResponseQuestDate).banner_en}`
                  }
                  alt="Preview"
                  width={800}
                  height={512}
                  className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
          </div>
          <div>
            <p className="mt-3 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload banner_th:
            </p>
            <Input
              type="file"
              name="banner_th"
              onChange={(event) => handleFileChange(event, "banner_th")}
            />
            {(form.banner_th || (openModal as ResponseQuestDate).banner_th) && (
              <div className="mt-4 mb-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview banner th:
                </p>
                <RemoteOrBlobImage
                  src={
                    bannerThUrl ??
                    `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as ResponseQuestDate).banner_th}`
                  }
                  alt="Preview"
                  width={800}
                  height={512}
                  className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
          </div>

          <div>
            <p className="mt-3 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload sub_banner_en:
            </p>
            <Input
              type="file"
              name="sub_banner_en"
              onChange={(event) => handleFileChange(event, "sub_banner_en")}
            />
            {(form.sub_banner_en ||
              (openModal as ResponseQuestDate).sub_banner_en) && (
              <div className="mt-4 mb-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview sub banner en:
                </p>
                <RemoteOrBlobImage
                  src={
                    subBannerEnUrl ??
                    `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as ResponseQuestDate).sub_banner_en}`
                  }
                  alt="Preview"
                  width={800}
                  height={512}
                  className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
          </div>

          <div>
            <p className="mt-3 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload sub_banner_th:
            </p>
            <Input
              type="file"
              name="sub_banner_th"
              onChange={(event) => handleFileChange(event, "sub_banner_th")}
            />
            {(form.sub_banner_th ||
              (openModal as ResponseQuestDate).sub_banner_th) && (
              <div className="mt-4 mb-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview sub banner th:
                </p>
                <RemoteOrBlobImage
                  src={
                    subBannerThUrl ??
                    `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as ResponseQuestDate).sub_banner_th}`
                  }
                  alt="Preview"
                  width={800}
                  height={512}
                  className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Facebook Page:
            </p>
            <Input
              type="text"
              name="facebook_page"
              onChange={(event) =>
                setForm({ ...form, facebook_page: event.target.value })
              }
              defaultValue={form.facebook_page || ""}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Facebook Post:
            </p>
            <Input
              type="text"
              name="facebook_post"
              onChange={(event) =>
                setForm({ ...form, facebook_post: event.target.value })
              }
              defaultValue={form.facebook_post || ""}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Line:
            </p>
            <Input
              type="text"
              name="line"
              onChange={(event) =>
                setForm({ ...form, line: event.target.value })
              }
              defaultValue={form.line || ""}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex w-full items-center justify-end gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpenModal(false)}
          disabled={isLoading}
        >
          Close
        </Button>
        <Button
          size="sm"
          disabled={isLoading}
          onClick={() => {
            handleSave();
          }}
          startIcon={
            isLoading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-600"></div>
            ) : null
          }
        >
          Save Changes
        </Button>
      </div>
    </Modal>
  );
};

export default FormQuest;
