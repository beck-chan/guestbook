import {
  IWorldOptions,
  setWorldConstructor,
  World,
} from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "playwright";

export class PlaywrightWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  baseUrl: string;
  postedName?: string;

  constructor(options: IWorldOptions) {
    super(options);
    const fromEnv = process.env.BASE_URL;
    const fromConfig = options.parameters.baseUrl;
    this.baseUrl = String(fromEnv ?? fromConfig ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
  }
}

setWorldConstructor(PlaywrightWorld);