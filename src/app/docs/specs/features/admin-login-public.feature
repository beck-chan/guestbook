Feature: Admin login link

    Rule: Only allow-listed admins can access the admin dashboard on desktop

        Background:
            Given a user is on the main landing page of the poetry guestbook on desktop

        Scenario: Authorized admin reaches the dashboard on desktop
            Given the user has admin authorization
            When a user clicks the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the `/admin` dashboard

        Scenario: Unauthorized user is denied the dashboard on desktop
            Given the user does not have admin authorization
            When a user clicks the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the landing page
            And they are shown a message that they do not have admin authorization

        Scenario: Unauthorized visitor message can be dismissed on desktop
            Given the user is shown a message that they do not have admin authorization
            When they click the `Boo hiss! Fine.` button
            Then the message closes

    Rule: Only allow-listed admins can access the admin dashboard on mobile

        Background:
            Given a user is on the main landing page of the poetry guestbook on mobile

        Scenario: Authorized admin reaches the dashboard on mobile
            Given the user has admin authorization
            When a user clicks the drop-down `menu` button and selects the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the `/admin` dashboard

        Scenario: Unauthorized user is denied the dashboard on mobile
            Given the user does not have admin authorization
            When a user clicks the drop-down `menu` button and selects the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the landing page
            And they are shown a message that they do not have admin authorization

        Scenario: Unauthorized visitor message can be dismissed on mobile
            Given the user is shown a message that they do not have admin authorization
            When they click the `Boo hiss! Fine.` button
            Then the message closes
