Feature: Guestbook page navigation

    Background:
        Given a user is on the guestbook page on mobile

    Rule: Admin Login is a button

        Scenario: Admin Login link works
            When a user clicks on the `admin login` button
            Then they are directed to the Google SSO page for the admin dashboard

        Scenario: Admin Login works with authorization
            Given the user has admin authorization
            When a user clicks on the `admin login` button
            And they sign in successfully with Google
            Then they are redirected to the `/admin` dashboard

        Scenario: Admin Login is gated to admins
            Given the user does not have admin authorization
            When a user clicks on the `admin login` button
            And they sign in successfully with Google
            Then they are redirected to the landing page
            And show the user a message that they do not have admin authorization

        Scenario: Unauthorized admin message can be dismissed
            Given the user is shown a message that they do not have admin authorization
            When they click the `Close` button
            Then the message closes
