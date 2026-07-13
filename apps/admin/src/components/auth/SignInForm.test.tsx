// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import SignInForm from "./SignInForm";

const authMock = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: authMock.signIn,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("callbackUrl=%2Fquest"),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority: _priority,
    src,
    ...props
  }: {
    alt: string;
    priority?: boolean;
    src: string;
  } & Record<string, unknown>) => (
    <span aria-label={alt} data-src={src} role="img" {...props} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("SignInForm", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    cleanup();
    authMock.signIn.mockReset();
    if (originalApiUrl == null) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it("given the admin sign-in page > then credentials fields are accessible and named", () => {
    render(<SignInForm />);

    expect(screen.getByLabelText(/email \/ username/i)).toHaveAttribute(
      "name",
      "email",
    );
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute(
      "name",
      "password",
    );
    expect(
      screen.getByRole("checkbox", { name: /keep me logged in/i }),
    ).toHaveAttribute("name", "remember");
  });

  it("given quick access is clicked > then it submits local mock credentials", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    authMock.signIn.mockResolvedValue({ ok: true });

    render(<SignInForm />);

    await userEvent.click(
      screen.getByRole("button", { name: /sign in with mock account/i }),
    );

    await waitFor(() => {
      expect(authMock.signIn).toHaveBeenCalledWith("credentials", {
        email: "admin@gogocash.co",
        password: "1234",
        redirect: false,
      });
    });
  });

  it("given mock quick access fails > then shows a plain demo-unavailable message that never leaks env vars", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    authMock.signIn.mockResolvedValue({ error: "CredentialsSignin" });

    render(<SignInForm />);

    await userEvent.click(
      screen.getByRole("button", { name: /sign in with mock account/i }),
    );

    const message = await screen.findByText(
      "Demo sign-in isn't available here. Please sign in with your email and password.",
    );
    expect(message).toBeTruthy();
    expect(screen.queryByText(/ALLOW_MOCK_ADMIN_PASSWORD/)).toBeNull();
    expect(screen.queryByText(/development/)).toBeNull();
  });

  it("given sign in throws > then shows a plain, actionable error message", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    authMock.signIn.mockRejectedValue(new Error("boom"));

    render(<SignInForm />);

    await userEvent.type(
      screen.getByLabelText(/email \/ username/i),
      "admin@gogocash.co",
    );
    await userEvent.type(screen.getByLabelText(/^password/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    const message = await screen.findByText(
      "Something went wrong during sign in. Please try again.",
    );
    expect(message).toBeTruthy();
  });

  it("given a real API is configured > then mock quick access is hidden", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.gogocash.co";

    render(<SignInForm />);

    expect(
      screen.queryByRole("button", { name: /sign in with mock account/i }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeTruthy();
  });
});
