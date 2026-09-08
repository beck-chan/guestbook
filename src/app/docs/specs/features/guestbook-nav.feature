Feature: Standalone guestbook page navigation (`/guestbook`)

    Rule: Hanging bookmarks work as links

        Background:
            Given a user is on the standalone guestbook page on desktop

        Scenario: Get Started link works on desktop
            When a user clicks the `get started` link
            Then a new tab or window opens to the y2k Guestbook Docs Get Started guide

        Scenario: View Docs link works on desktop
            When a user clicks the `view docs` link
            Then a new tab or window opens to the y2k Guestbook Docs main page

    Rule: Drop-down menu serves as navigation on mobile

        Background:
            Given a user is on the standalone guestbook page on mobile

        Scenario: Drop-down menu works on mobile
            When a user clicks the drop-down `menu` button
            Then the `menu` opens and show the user navigation links

        Scenario: Get Started link works on mobile
            When a user clicks the drop-down `menu` button and selects the `get started` link
            Then a new tab or window opens to the y2k Guestbook Docs Get Started guide

        Scenario: View Docs link works on mobile
            When a user clicks the drop-down `menu` button and selects the `view docs` link
            Then a new tab or window opens to the y2k Guestbook Docs

    Rule: Report Issue link takes users to the repo Issues page

        Scenario: Report Issue link works on desktop
            Given a user is on the standalone guestbook page on desktop
            When a user clicks the `report issue` link
            Then a new tab or window opens to the Beck's guestbook repo Issues page

        Scenario: Report Issue link works on mobile
            Given a user is on the standalone guestbook page on mobile
            When a user clicks the drop-down `menu` button and selects the `report issue` link
            Then a new tab or window opens to the Beck's guestbook repo Issues page
