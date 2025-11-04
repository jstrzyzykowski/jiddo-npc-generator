import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Jiddo NPC Generator | Community Driven Open Tibia NPC Generator/);
});

test("explore all npcs link", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Explore all NPCs" }).click();

  await expect(page).toHaveURL(/.*npcs/);
});
