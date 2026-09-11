Feature: Authorized admin login

    Rule: Allow-listed admins can access the admin dashboard on desktop

        Background:
            Given a user is on the main landing page of the poetry guestbook on desktop
            And the user has admin authorization

        Scenario: Authorized admin reaches the dashboard on desktop
            When a user clicks the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the `/admin` dashboard

    Rule: Allow-listed admins can access the admin dashboard on mobile

        Background:
            Given a user is on the main landing page of the poetry guestbook on mobile
            And the user has admin authorization

        Scenario: Authorized admin reaches the dashboard on mobile
            When a user clicks the drop-down `menu` button and selects the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the `/admin` dashboard
