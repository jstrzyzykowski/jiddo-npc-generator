import { test, expect } from "@playwright/test";

test.describe("Homepage for unauthenticated user", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should not display user avatar in the header", async ({ page }) => {
    const userAvatar = page.getByTestId("user-avatar");
    await expect(userAvatar).not.toBeVisible();
  });
});
