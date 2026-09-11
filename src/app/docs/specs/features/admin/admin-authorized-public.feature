Feature: Authorized admin login

    Background:
        Given a user is on the guestbook page
        And the user has admin authorization

    Scenario: Authorized admin reaches the dashboard
        When a user clicks the `admin login` link
        And they sign in successfully with Google
        Then they are redirected to the `/admin` dashboard
