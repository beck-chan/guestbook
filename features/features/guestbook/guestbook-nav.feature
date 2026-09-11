Feature: Guestbook page navigation

    Background:
        Given a user is on the guestbook page

    Scenario: Admin login link is on the guestbook page
        When a user clicks the `admin login` link
        Then they are directed to the Google SSO page for the admin dashboard
