{/* ::: {.public}

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

::: */}

{/* ::: {.private}

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

::: */}

{/* Keep the `Given` functions in the same file as the comment steps:

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
``` */}
