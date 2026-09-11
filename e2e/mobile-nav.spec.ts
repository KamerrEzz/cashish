import { expect, test } from "@playwright/test";

test.describe("mobile nav drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens full-height portal drawer over blurred header", async ({
    page,
  }) => {
    await page.goto("/e2e/nav");

    // Harness disabled in production builds without the flag
    const notFound = page.getByText("Not found");
    if (await notFound.isVisible().catch(() => false)) {
      test.skip(true, "E2E harness disabled (NEXT_PUBLIC_E2E_HARNESS!=1)");
    }

    await expect(page.getByRole("heading", { name: /Harness/i })).toBeVisible();

    await page.getByTestId("mobile-nav-toggle").click();
    const drawer = page.getByTestId("mobile-nav-drawer");
    await expect(drawer).toBeVisible();

    const box = await drawer.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThan(viewport.height * 0.85);
    expect(box!.y).toBeLessThanOrEqual(2);

    const salir = page.getByTestId("mobile-nav-signout");
    const salirBox = await salir.boundingBox();
    const titleBox = await page
      .getByRole("heading", { name: /Harness/i })
      .boundingBox();
    expect(salirBox).toBeTruthy();
    expect(titleBox).toBeTruthy();
    const overlapsTitle =
      salirBox!.y < titleBox!.y + titleBox!.height &&
      salirBox!.y + salirBox!.height > titleBox!.y;
    expect(overlapsTitle).toBe(false);

    await expect(page.getByRole("link", { name: "Cuentas" })).toBeVisible();
    await page.getByTestId("mobile-nav-close").click();
    await expect(drawer).toHaveCount(0);
  });
});
