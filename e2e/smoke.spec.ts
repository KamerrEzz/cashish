import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("landing shows Cashish brand and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
    await expect(page.getByText("Cashish").first()).toBeVisible();
  });

  test("login page renders password form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
    await expect(page.getByText("Correo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toBeVisible();
  });

  test("register page renders signup form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();
    await expect(page.getByText("Confirmar contraseña")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Crear cuenta" }),
    ).toBeVisible();
  });
});
