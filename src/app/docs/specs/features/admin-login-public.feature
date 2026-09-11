Feature: Admin login link

    Background:
        Given a user is on the guestbook page

    Rule: Only allow-listed admins can access the admin dashboard

        Scenario: Authorized admin reaches the dashboard
            Given the user has admin authorization
            When a user clicks the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the `/admin` dashboard

        Scenario: Unauthorized user is denied the dashboard
            Given the user does not have admin authorization
            When a user clicks the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the landing page
            And they are shown a message that they do not have admin authorization

        Scenario: Unauthorized visitor message can be dismissed
            Given the user is shown a message that they do not have admin authorization
            When they click the `Boo hiss! Fine.` button
            Then the message closes
