Feature: Standalone guestbook page navigation (`/guestbook`)

    Background:
        Given a user is on the standalone guestbook page on desktop 

            Rule: Hanging bookmarks work as links

                Scenario: Get Started link works
                When a user clicks the `Get Started` bookmark
                Then a new tab or window opens to the y2k Guestbook Docs Get Started guide

                Scenario: View Docs link works
                When a user clicks the `View Docs` bookmark
                Then a new tab or window opens to the y2k Guestbook Docs main page


    Background:
        Given a user is on the standalone guestbook page on mobile 

            Rule: Drop-down menu serves as navigation on mobile

                Scenario: Drop-down menu works on mobile
                When a user clicks the drop-down `Menu`
                Then the `Menu` opens and show the user navigation links

                Scenario: Get Started link works
                When a user clicks the drop-down `Menu` and selects the `Get Started` link
                Then a new tab or window opens to the y2k Guestbook Docs Get Started guide

                Scenario: View Docs link works
                When a user clicks the drop-down `Menu` and selects the `View Docs` link
                Then a new tab or window opens to the y2k Guestbook Docs

    Rule: Report Issue link takes users to the repo Issues page

        Scenario: Report Issue link works on desktop
        Given a user is on the standalone guestbook page on desktop
        When a user clicks the `Report Issue` link
        Then a new tab or window opens to the Beck's guestbook repo Issues page

        Scenario: Report Issue link works on mobile
        Given a user is on the standalone guestbook page on mobile
        When a user clicks the drop-down `Menu` and selects the `Report Issue` link
        Then a new tab or window opens to the Beck's guestbook repo Issues page