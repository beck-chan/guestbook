Feature: Original Poetry landing page navigation

    Rule: Hanging bookmarks serve as navigation on desktop

        Background:
            Given a user is on the main landing page of the poetry guestbook on desktop

                Scenario: View Docs link works
                When a user clicks the `View Docs` bookmark
                Then a new tab or window opens to the y2k Guestbook Docs

                Scenario: Admin Login link works
                When a user hovers over the hidden Admin Login bookmark
                Then the `Admin Login` link becomes visible
                When users click on the `Admin Login` bookmark 
                Then users are directed to the Google SSO page for the admin dashboard 

                Scenario: Admin Login works with authorization
                When a user has clicked on the `Admin Login` bookmark
                And the user has admin authorization
                Then signing in successfully with Google redirects users to the `/admin` dashboard

                Scenario: Admin Login is gated to admins
                When a user has clicked on the `Admin Login` bookmark
                But the user does not have admin authorization
                Then signing in successfully with Google redirects users to the landing page
                And show the user a message that they do not have admin authorization
                And they can click on the `Boo hiss! Fine` button to close the message

    Rule: Drop-down menu serves as navigation on mobile

        Background:
            Given a user is on the main landing page of the poetry guestbook on mobile

                Scenario: Drop-down menu works on mobile
                When a user clicks the drop-down Menu
                Then the `Menu` opens and show the user navigation links

                Scenario: View Docs link works
                When a user clicks the drop-down `Menu` and selects the `View Docs` link
                Then a new tab or window opens to the y2k Guestbook Docs

                Scenario: Admin Login link works
                When a user clicks the drop-down `Menu` and selects the `Admin Login` link
                Then users are directed to the Google SSO page for the admin dashboard

                Scenario: Admin Login works with authorization
                When a user clicks the drop-down `Menu` and selects the `Admin Login` link
                And the user has admin authorization
                Then signing in successfully with Google redirects users to the `/admin` dashboard

                Scenario: Admin Login is gated to admins
                When a user clicks the drop-down `Menu` and selects the `Admin Login` link
                But the user does not have admin authorization
                Then signing in successfully with Google redirects users to the landing page
                And show the user a message that they do not have admin authorization
                And they can click on the `Boo hiss! Fine` button to close the message

    Rule: Report Issue link takes users to the repo Issues page

        Scenario: Report Issue link works on desktop
        Given a user is on the main landing page of the poetry guestbook on desktop
        When a user clicks the `Report Issue` link
        Then a new tab or window opens to the Beck's guestbook repo Issues page

        Scenario: Report Issue link works on mobile
        Given a user is on the main landing page of the poetry guestbook on mobile
        When a user clicks the drop-down `Menu` and selects the `Report Issue` link
        Then a new tab or window opens to the Beck's guestbook repo Issues page