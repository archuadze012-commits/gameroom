import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  
  await page.goto("http://localhost:3000/");
  await page.waitForLoadState("networkidle");

  const layoutInfo = await page.evaluate(() => {
    // Find the section that wraps the post feed
    const section = document.querySelector("section.grid");
    if (!section) return { error: "No section.grid found" };

    const children = Array.from(section.children).map((c, i) => {
      const rect = c.getBoundingClientRect();
      return {
        index: i,
        tagName: c.tagName,
        className: c.className,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
      };
    });

    const parentRect = section.getBoundingClientRect();

    return {
      parent: {
        className: section.className,
        width: parentRect.width,
        left: parentRect.left,
      },
      children,
    };
  });

  console.log(JSON.stringify(layoutInfo, null, 2));
  await browser.close();
}

main().catch(console.error);
