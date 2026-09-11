/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppNav } from "@/components/app-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Tema</button>,
}));

describe("AppNav mobile drawer", () => {
  const signOut = vi.fn(async () => undefined);

  beforeEach(() => {
    signOut.mockClear();
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("opens drawer via portal on body and shows nav + salir", async () => {
    render(<AppNav signOut={signOut} />);

    expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();

    fireEvent.click(screen.getByTestId("mobile-nav-toggle"));

    await waitFor(() => {
      expect(screen.getByTestId("mobile-nav-drawer")).toBeTruthy();
    });

    const drawer = screen.getByTestId("mobile-nav-drawer");
    expect(document.body.contains(drawer)).toBe(true);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(drawer.textContent).toContain("Cuentas");
    expect(screen.getByTestId("mobile-nav-signout")).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes drawer with Cerrar and restores body scroll", async () => {
    render(<AppNav signOut={signOut} />);
    fireEvent.click(screen.getByTestId("mobile-nav-toggle"));
    await waitFor(() => screen.getByTestId("mobile-nav-drawer"));

    fireEvent.click(screen.getByTestId("mobile-nav-close"));

    await waitFor(() => {
      expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();
    });
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes drawer when backdrop is clicked", async () => {
    render(<AppNav signOut={signOut} />);
    fireEvent.click(screen.getByTestId("mobile-nav-toggle"));
    await waitFor(() => screen.getByTestId("mobile-nav-backdrop"));

    fireEvent.click(screen.getByTestId("mobile-nav-backdrop"));

    await waitFor(() => {
      expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();
    });
  });
});
