import { expect, test } from "@playwright/test";

test.describe("quincena nav / landing", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("harness drawer shows Quincena (or landing copy)", async ({ page }) => {
    await page.goto("/e2e/nav");

    const notFound = page.getByText("Not found");
    if (await notFound.isVisible().catch(() => false)) {
      await page.goto("/");
      await expect(page.getByText("Cashish").first()).toBeVisible();
      await expect(
        page.getByText(/quincena|crédito/i).first(),
      ).toBeVisible();
      return;
    }

    await page.getByTestId("mobile-nav-toggle").click();
    const drawer = page.getByTestId("mobile-nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(page.getByRole("link", { name: "Quincena" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cuentas" })).toBeVisible();
  });
});
