import { test, expect, type Page } from "@playwright/test";

const base = "http://127.0.0.1:1420/visual-preview.html";

const openView = async (
  page: Page,
  viewport: { width: number; height: number },
  query: string,
) => {
  await page.setViewportSize(viewport);
  await page.goto(`${base}?lang=de&${query}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
};

const expectViewportContained = async (page: Page) => {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    main: (() => {
      const node = document.querySelector("main.content");
      if (!(node instanceof HTMLElement)) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        overflowY: style.overflowY,
      };
    })(),
    settings: (() => {
      const node = document.querySelector("[data-open-settings]");
      if (!(node instanceof HTMLElement)) return null;
      const rect = node.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    })(),
  }));

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.innerWidth + 2);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 2);
  expect(metrics.main).not.toBeNull();
  expect(metrics.main!.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.main!.right).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(["auto", "scroll"]).toContain(metrics.main!.overflowY);

  if (metrics.settings) {
    expect(metrics.settings.top).toBeGreaterThanOrEqual(-1);
    expect(metrics.settings.bottom).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(metrics.settings.left).toBeGreaterThanOrEqual(-1);
    expect(metrics.settings.right).toBeLessThanOrEqual(metrics.innerWidth + 1);
  }
};

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1024, height: 720 },
]) {
  test(`core surfaces stay viewport-contained at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    for (const query of [
      "view=overview",
      "view=steps",
      "view=source-review&section=sources",
      "view=diagnostics",
      "view=settings&section=updates",
    ]) {
      await openView(page, viewport, query);
      await expectViewportContained(page);
    }
  });
}

test("compact Settings owns its scrolling without escaping the viewport", async ({ page }) => {
  await openView(page, { width: 900, height: 700 }, "view=settings&section=updates");

  const modal = page.locator(".settings-modal");
  const content = page.locator(".settings-content");
  await expect(modal).toBeVisible();

  const geometry = await modal.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.bottom).toBeLessThanOrEqual(701);
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.right).toBeLessThanOrEqual(901);

  const scroll = await content.evaluate((node) => {
    const element = node as HTMLElement;
    const before = element.scrollTop;
    element.scrollTop = element.scrollHeight;
    return {
      before,
      after: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overscroll: getComputedStyle(element).overscrollBehavior,
    };
  });
  expect(scroll.scrollHeight).toBeGreaterThanOrEqual(scroll.clientHeight);
  expect(scroll.overscroll).toBe("contain");
  if (scroll.scrollHeight > scroll.clientHeight + 2) expect(scroll.after).toBeGreaterThan(scroll.before);
});

test("Project Brain content scrolls independently while Settings stays visible", async ({ page }) => {
  await openView(page, { width: 1024, height: 720 }, "view=steps");
  const main = page.locator("main.content");
  const before = await page.locator("[data-open-settings]").boundingBox();
  expect(before).not.toBeNull();

  const scroll = await main.evaluate((node) => {
    const element = node as HTMLElement;
    element.scrollTop = element.scrollHeight;
    return { top: element.scrollTop, max: element.scrollHeight - element.clientHeight };
  });
  expect(scroll.top).toBeGreaterThan(0);
  expect(scroll.top).toBeGreaterThanOrEqual(scroll.max - 2);

  const after = await page.locator("[data-open-settings]").boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
});

for (const view of ["steps", "diagnostics"]) {
  test(`re-clicking active ${view} route does not remount the content tree`, async ({ page }) => {
    await openView(page, { width: 1366, height: 768 }, `view=${view}`);
    await page.waitForTimeout(view === "diagnostics" ? 900 : 250);

    const result = await page.evaluate(async (activeView) => {
      const main = document.querySelector("main.content");
      const button = document.querySelector(`nav.nav [data-view="${activeView}"]`);
      if (!(main instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
        return { available: false, childListMutations: -1 };
      }
      let childListMutations = 0;
      const observer = new MutationObserver((records) => {
        childListMutations += records.filter((record) => record.type === "childList").length;
      });
      observer.observe(main, { childList: true, subtree: true });
      for (let i = 0; i < 10; i += 1) button.click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      observer.disconnect();
      return { available: true, childListMutations };
    }, view);

    expect(result.available).toBe(true);
    expect(result.childListMutations).toBe(0);
  });
}

test("route churn does not duplicate shell nodes or grow the DOM", async ({ page }) => {
  await openView(page, { width: 1366, height: 768 }, "view=steps");

  const baseline = await page.locator("*").count();
  for (let i = 0; i < 6; i += 1) {
    await page.locator("nav.nav [data-view='diagnostics']").click();
    await page.waitForTimeout(180);
    await page.locator("nav.nav [data-view='steps']").click();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(300);

  await expect(page.locator(".livariant-global-header")).toHaveCount(1);
  await expect(page.locator(".sidebar")).toHaveCount(1);
  await expect(page.locator("main.content")).toHaveCount(1);
  await expect(page.locator("[data-open-settings]")).toHaveCount(1);

  const after = await page.locator("*").count();
  expect(Math.abs(after - baseline)).toBeLessThanOrEqual(20);
});
