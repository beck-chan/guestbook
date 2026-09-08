Feature: Admin dashboard login

    Background:
        Given a user is on the guestbook page 

            Rule: Admin Login link takes users to the repo Issues page

                Scenario: Admin Login works with authorization
                When a user clicks on the `admin login` link
                Then users are directed to the Google SSO page for the admin dashboard 
                And the user has admin authorization
                Then signing in successfully with Google redirects users to the `/admin` dashboard

                Scenario: Admin Login is gated to admins
                When a user has clicked on the `admin login` link
                But the user does not have admin authorization
                Then signing in successfully with Google redirects users to the landing page
                And show the user a message that they do not have admin authorization
                And they can click on the `Close` button to dismiss the message