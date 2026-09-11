

Example for the guestbook page (`/`):

```typescript
import { Given } from "@cucumber/cucumber";
import type { PlaywrightWorld } from "../support/world";

Given("a user is on the guestbook page", async function (this: PlaywrightWorld) {
  await this.page.goto(this.baseUrl + "/");
});

Given(
  "a user is on the guestbook page on mobile",
  async function (this: PlaywrightWorld) {
    await this.page.setViewportSize({ width: 390, height: 844 });
    await this.page.goto(this.baseUrl + "/");
  },
);
```


Example for the standalone guestbook (`/guestbook`):

```typescript
import { Given } from "@cucumber/cucumber";
import type { PlaywrightWorld } from "../support/world";

Given(
  "a user is on the standalone guestbook page of the poetry guestbook",
  async function (this: PlaywrightWorld) {
    await this.page.goto(this.baseUrl + "/guestbook");
  },
);

Given(
  "a user is on the standalone guestbook page on mobile",
  async function (this: PlaywrightWorld) {
    await this.page.setViewportSize({ width: 390, height: 844 });
    await this.page.goto(this.baseUrl + "/guestbook");
  },
);
```


 Keep the `Given` functions in the same file as the comment steps:

```typescript
import { Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { PlaywrightWorld } from "../support/world";

When(
  "a user enters in a valid display name and comment body and clicks the `Submit` link",
  async function (this: PlaywrightWorld) {
    const name = `cucumber-${Date.now()}`;
    this.postedName = name;
    await this.page.getByLabel("display name").fill(name);
    await this.page.locator('textarea[name="comment"]').fill("hello from cucumber");
    await this.page.getByRole("button", { name: "submit" }).click();
  },
);

Then(
  "their comment displays below the submission form as the topmost entry",
  async function (this: PlaywrightWorld) {
    const name = this.postedName ?? "";
    const top = this.page.getByRole("figure").first();
    await top.waitFor();
    assert.match(await top.innerText(), new RegExp(name));
    assert.match(await top.innerText(), /hello from cucumber/);
  },
);
``` 

The hooks open a desktop-sized window (`1280` by `720`). Specs that say *on mobile* use a different UI (drop-down menu instead of hanging bookmarks). Those `Given` steps should shrink the viewport (for example `390` by `844`) *before* `goto`, or the test is still looking at the desktop layout. 


Fill in each stub with Playwright methods on `this.page`. Import `Given`, `When`, and `Then` from `@cucumber/cucumber`, type `this` as `PlaywrightWorld` so TypeScript knows about `page` and `baseUrl`, and check results with `node:assert/strict`.

::: {.tabset}

# Given

`Given` opens the page the rest of the scenario will use:

::: {.public}

```typescript
import { Given } from "@cucumber/cucumber";
import type { PlaywrightWorld } from "../support/world";

Given("a user is on the guestbook page", async function (this: PlaywrightWorld) {
  await this.page.goto(this.baseUrl + "/");
});
```

:::

::: {.private}

```typescript
import { Given } from "@cucumber/cucumber";
import type { PlaywrightWorld } from "../support/world";

Given(
  "a user is on the standalone guestbook page of the poetry guestbook",
  async function (this: PlaywrightWorld) {
    await this.page.goto(this.baseUrl + "/guestbook");
  },
);
```

:::

# When

`When` acts like a guest: fill fields, then click. A unique display name keeps live-database runs from colliding:

```typescript
import { When } from "@cucumber/cucumber";
import type { PlaywrightWorld } from "../support/world";

When(
  "a user enters in a valid display name and comment body and clicks the `submit` button",
  async function (this: PlaywrightWorld) {
    const name = `cucumber-${Date.now()}`;
    this.postedName = name;
    await this.page.getByLabel("display name").fill(name);
    await this.page.locator('textarea[name="comment"]').fill("hello from cucumber");
    await this.page.getByRole("button", { name: "submit" }).click();
  },
);
```

# Then

`Then` waits for the result and asserts on the visible text:

```typescript
import { Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { PlaywrightWorld } from "../support/world";

Then(
  "their comment displays below the submission form as the topmost entry",
  async function (this: PlaywrightWorld) {
    const name = this.postedName ?? "";
    const top = this.page.getByRole("figure").first();
    await top.waitFor();
    assert.match(await top.innerText(), new RegExp(name));
    assert.match(await top.innerText(), /hello from cucumber/);
  },
);
```

:::

The hooks open a desktop-sized window (`1280` by `720`). Specs that say *on mobile* use a different layout. Those `Given` steps should shrink the viewport (for example `390` by `844`) *before* `goto`, or the test is still looking at the desktop layout:

::: {.public}

```typescript
Given(
  "a user is on the guestbook page on mobile",
  async function (this: PlaywrightWorld) {
    await this.page.setViewportSize({ width: 390, height: 844 });
    await this.page.goto(this.baseUrl + "/");
  },
);
```

:::

::: {.private}

```typescript
Given(
  "a user is on the standalone guestbook page on mobile",
  async function (this: PlaywrightWorld) {
    await this.page.setViewportSize({ width: 390, height: 844 });
    await this.page.goto(this.baseUrl + "/guestbook");
  },
);
```

:::

Pagination needs enough comments in the DB; there is no Given for that. Public page size defaults to 6, admin is fixed at 10.
Email scenarios assume capture email is on (y2k default). The settings scenario that turns it off persists in the live DB.
Admin filters at 1280px are inside comments menu. Keep those Whens abstract so the step can open the menu when needed.
Title on admin: the comments heading stays comments; the setting updates the public title (and document title). applied to the admin dashboard is the saved field, not a visible board title.