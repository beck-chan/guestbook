import { After, AfterAll, Before, BeforeAll } from "@cucumber/cucumber";
import { chromium, type Browser } from "playwright";
import { PlaywrightWorld } from "./world";

let browser: Browser;

BeforeAll(async function () {
  browser = await chromium.launch({
    headless: process.env.HEADED !== "1",
  });
});

Before(async function (this: PlaywrightWorld) {
  this.browser = browser;
  this.context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  this.page = await this.context.newPage();
});

After(async function (this: PlaywrightWorld) {
  await this.context.close();
});

AfterAll(async function () {
  await browser.close();
});
