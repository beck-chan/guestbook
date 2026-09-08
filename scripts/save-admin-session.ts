import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { adminAuthFile } from "../features/support/auth-file";
import {
  guestbookAdminLoginPath,
  guestbookAdminPath,
} from "../lib/guestbookPaths";

const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

async function main() {
  const adminPath = guestbookAdminPath();
  const loginUrl = `${baseUrl}${guestbookAdminLoginPath()}`;

  console.log("Opening Google sign-in. Log in with an allow-listed account.");
  console.log(`Waiting until the address bar is ${baseUrl}${adminPath} …`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(loginUrl);

  await page.waitForURL(
    (url) => {
      const pathname = url.pathname.replace(/\/$/, "") || "/";
      return url.searchParams.get("admin_error") === "1" || pathname === adminPath;
    },
    { timeout: 5 * 60 * 1000 },
  );

  if (new URL(page.url()).searchParams.get("admin_error") === "1") {
    console.error(
      "Google signed in, but this account is not allow-listed. Run npm run allow-admin first.",
    );
    await browser.close();
    process.exit(1);
  }

  await mkdir(path.dirname(adminAuthFile), { recursive: true });
  await context.storageState({ path: adminAuthFile });
  await browser.close();
  console.log(`Saved signed-in session to ${adminAuthFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
