// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import client from "@/lib/axios/client";
import type { BannerRequestForm } from "@/types/banner";
import FormUpdate from "./FormUpdate";

vi.mock("@/lib/axios/client", () => ({
  default: {
    post: vi.fn(),
  },
}));

const postMock = vi.mocked(client.post);

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => true,
    canAny: () => true,
    ready: true,
    role: "editor",
    rolesLoaded: true,
  }),
}));

vi.mock("@/hooks/useDataSession", () => ({
  useDataSession: () => ({ accessToken: "test-token" }),
}));

vi.mock("@/hooks/useObjectUrl", () => ({
  useObjectUrl: () => "blob:preview",
}));

vi.mock("../ui/modal", () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function makeForm(patch: Partial<BannerRequestForm> = {}): BannerRequestForm {
  return {
    id: "1",
    image_1: null,
    image_2: null,
    image_3: null,
    image_4: null,
    image_5: null,
    link_1: "",
    link_2: "",
    link_3: "",
    link_4: "",
    link_5: "",
    enabled_1: true,
    enabled_2: true,
    enabled_3: true,
    enabled_4: true,
    enabled_5: true,
    start_date_1: "",
    start_date_2: "",
    start_date_3: "",
    start_date_4: "",
    start_date_5: "",
    end_date_1: "",
    end_date_2: "",
    end_date_3: "",
    end_date_4: "",
    end_date_5: "",
    end_forever_1: true,
    end_forever_2: true,
    end_forever_3: true,
    end_forever_4: true,
    end_forever_5: true,
    ...patch,
  };
}

function SaveHarness({
  initialForm,
  onSaved,
}: {
  initialForm: BannerRequestForm;
  onSaved?: () => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <FormUpdate
      fetchData={onSaved ?? vi.fn()}
      form={form}
      isLoading={isLoading}
      openModal
      setForm={setForm}
      setIsLoading={setIsLoading}
      setOpenModal={vi.fn()}
    />
  );
}

describe("Banner FormUpdate save", () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ data: { message: "Update banner home success" } });
  });

  it("given a new banner file > when Save Changes is clicked > then posts FormData without manual Content-Type", async () => {
    const file = new File(["banner"], "hero.png", { type: "image/png" });
    const onSaved = vi.fn();

    render(<SaveHarness initialForm={makeForm()} onSaved={onSaved} />);

    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledTimes(1);
    });

    const [, body, config] = postMock.mock.calls[0] ?? [];
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("image_1")).toBe(file);
    expect(config?.headers).toEqual({
      Authorization: "Bearer test-token",
    });
    expect(config?.headers).not.toHaveProperty("Content-Type");
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
