import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("landing shows Cashish brand and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
    await expect(page.getByText("Cashish").first()).toBeVisible();
  });

  test("login page renders password form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Cashish" })).toBeVisible();
    await expect(page.getByText("Correo")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Entrar \/ registrarme/i }),
    ).toBeVisible();
  });
});
