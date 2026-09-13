import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const result = { errors: [], steps: [] };

function log(step, data) {
  result.steps.push({ step, ...data });
}

async function withPage(viewport, fn) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  try {
    await fn(page, errors);
  } catch (error) {
    result.steps.push({ step: "failed", viewport, error: String(error).slice(0, 500) });
  } finally {
    result.errors.push(...errors);
    await page.close();
  }
}

await withPage({ width: 1280, height: 900 }, async (page, errors) => {
  const home = await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".desk-desktop .book-scene", { timeout: 30000 });
  await page.waitForTimeout(700);
  const fonts = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const root = getComputedStyle(document.documentElement);
    return {
      bodyFont: body.fontFamily,
      peony: root.getPropertyValue("--peony-font").trim(),
      futura: root.getPropertyValue("--futura-font").trim(),
      desk: root.getPropertyValue("--desk").trim(),
      peonyColor: root.getPropertyValue("--peony").trim(),
      link: root.getPropertyValue("--link").trim(),
    };
  });
  log("home desktop", {
    status: home?.status(),
    url: page.url(),
    fonts,
    comicSans: /comic sans/i.test(`${fonts.bodyFont} ${fonts.peony} ${fonts.futura}`),
    bookOpen: await page.locator(".book-scene").getAttribute("data-open"),
    coverTitle: (await page.locator(".desk-desktop .cover-title").first().textContent())?.trim(),
    comments: await page.locator(".desk-desktop .comment-thread .comment-bubble").count(),
    emailField: await page.locator(".desk-desktop .comment-email").count(),
    submit: await page.locator(".desk-desktop form.comment-compose button[type=submit]").count(),
    pageErrors: errors.filter((e) => !/favicon|hmr/i.test(e)).slice(0, 5),
  });

  await page.locator(".desk-desktop .comment-name-input").fill("desk-check");
  await page.locator(".desk-desktop .comment-input").fill("compose still types");
  log("home compose types", {
    name: await page.locator(".desk-desktop .comment-name-input").inputValue(),
  });
});

await withPage({ width: 390, height: 844 }, async (page, errors) => {
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mobile-shell .mobile-reading", { timeout: 30000 });
  await page.waitForTimeout(800);
  log("home mobile", {
    url: page.url(),
    mobileReading: await page.locator(".mobile-reading").count(),
    heart: await page.locator(".mobile-reading .poem-heart").count(),
    heartLabel: await page.locator(".mobile-reading .poem-heart").getAttribute("aria-label"),
    commentsButton: await page.locator(".mobile-shell button, .mobile-comments-open, .mobile-comments-bubble").count(),
    pageErrors: errors.filter((e) => !/favicon|hmr/i.test(e)).slice(0, 5),
  });
  const commentsBtn = page.locator(".mobile-shell > button").first();
  if (await commentsBtn.count()) {
    await commentsBtn.click();
    await page.waitForTimeout(500);
    log("home mobile comments panel", {
      open: await page.locator(".mobile-comments.is-open").count(),
      compose: await page.locator(".mobile-comments form.comment-compose").count(),
      comments: await page.locator(".mobile-comments .comment-thread .comment-bubble").count(),
    });
  }
});

await withPage({ width: 1280, height: 900 }, async (page, errors) => {
  const res = await page.goto("http://localhost:3000/guestbook", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".guestbook-themed", { timeout: 30000 });
  await page.waitForTimeout(500);
  log("guestbook board", {
    status: res?.status(),
    url: page.url(),
    title: (await page.locator(".guestbook-themed").first().innerText()).split("\n")[0].slice(0, 80),
    comments: await page.locator(".comment-thread .comment-bubble").count(),
    emailField: await page.locator(".comment-email").count(),
    pageStatus: await page.locator(".comment-page.is-status").first().innerText(),
    pageErrors: errors.filter((e) => !/favicon|hmr/i.test(e)).slice(0, 5),
  });
});

await withPage({ width: 1280, height: 900 }, async (page, errors) => {
  const landing = await page.goto("http://localhost:3000/docs", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".docs-shell", { timeout: 30000 });
  log("docs landing", {
    status: landing?.status(),
    hasApiNav: await page.locator("nav.docs-api-nav").count(),
    guideLinks: await page.locator(".docs-sidenav-panel a, .docs-index a").count(),
  });

  await page.locator(".docs-sidenav-panel button.docs-search").click();
  await page.waitForSelector(".docs-search-dialog", { timeout: 10000 });
  const overlay = page.locator(".docs-search-dialog");
  await overlay.locator("input").fill("quickstart");
  await page.waitForTimeout(1500);
  const hit = overlay.locator("a").first();
  log("docs search", {
    overlay: await overlay.isVisible(),
    overlayText: (await overlay.innerText()).replace(/\s+/g, " ").slice(0, 180),
    hits: await overlay.locator("a").count(),
    firstHit: (await hit.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 100),
  });
  if (await hit.count()) {
    await hit.click();
    await page.waitForTimeout(600);
    log("docs search navigate", { url: page.url() });
  }

  for (const path of ["/docs/quickstart", "/docs/admin", "/docs/settings"]) {
    const res = await page.goto(`http://localhost:3000${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".docs-article, .docs-main", { timeout: 20000 });
    log(`docs ${path}`, {
      status: res?.status(),
      hasApiNav: await page.locator("nav.docs-api-nav").count(),
      heading: (await page.locator("h1, .docs-title").first().innerText().catch(() => "")).slice(0, 80),
      articleLen: (await page.locator(".docs-main").innerText()).length,
    });
  }
  log("docs errors", { pageErrors: errors.filter((e) => !/favicon|hmr|mermaid|playwright/i.test(e)).slice(0, 8) });
});

await withPage({ width: 390, height: 844 }, async (page) => {
  await page.goto("http://localhost:3000/docs/quickstart", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".docs-menu-toggle", { timeout: 20000 });
  await page.locator(".docs-menu-toggle").click();
  await page.waitForTimeout(300);
  log("docs mobile menu", {
    open: await page.locator(".docs-sidenav.is-open").count(),
    links: await page.locator(".docs-sidenav-panel a").count(),
  });
});

const probe = await browser.newPage();
const admin = await probe.goto("http://localhost:3000/admin", {
  waitUntil: "domcontentloaded",
  timeout: 20000,
}).catch((error) => error);
log("admin", {
  url: probe.url(),
  status: admin && typeof admin.status === "function" ? admin.status() : String(admin).slice(0, 200),
});
const missing = await probe.goto("http://localhost:3000/definitely-not-a-page-xyz", {
  waitUntil: "domcontentloaded",
});
log("404", {
  status: missing?.status(),
  url: probe.url(),
  text: (await probe.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 140),
});
await probe.close();

result.errors = [...new Set(result.errors.filter((e) => !/hmr|favicon/i.test(e)))].slice(0, 12);
console.log(JSON.stringify(result, null, 2));
await browser.close();
