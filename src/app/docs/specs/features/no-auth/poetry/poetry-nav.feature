Feature: Original Poetry landing navigation (`/`)

    Rule: Hanging bookmarks serve as navigation on desktop

        Background:
            Given a user is on the poetry landing page on desktop

        Scenario: View Docs link works on desktop
            When a user clicks the `view docs` link
            Then a new tab or window opens to the y2k Guestbook Docs

        Scenario: Admin Login link becomes visible on hover on desktop
            When a user hovers over the hidden `admin login` link
            Then the `admin login` link becomes visible

        Scenario: Admin Login link works on desktop
            When a user clicks the `admin login` link
            Then they are directed to the Google SSO page for the admin dashboard

    Rule: Drop-down menu serves as navigation on mobile

        Background:
            Given a user is on the poetry landing page on mobile

        Scenario: View Docs link works on mobile
            When a user clicks the drop-down `menu` button and selects the `view docs` link
            Then a new tab or window opens to the y2k Guestbook Docs

        Scenario: Admin Login link works on mobile
            When a user clicks the drop-down `menu` button and selects the `admin login` link
            Then they are directed to the Google SSO page for the admin dashboard

    Rule: Report Issue link takes users to the repo Issues page

        Scenario: Report Issue link works on desktop
            Given a user is on the poetry landing page on desktop
            When a user clicks the `report issue` link
            Then a new tab or window opens to `https://github.com/beck-chan/guestbook/issues`

        Scenario: Report Issue link works on mobile
            Given a user is on the poetry landing page on mobile
            When a user clicks the drop-down `menu` button and selects the `report issue` link
            Then a new tab or window opens to `https://github.com/beck-chan/guestbook/issues`
