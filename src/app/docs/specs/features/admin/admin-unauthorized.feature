Feature: Unauthorized admin login

    Rule: Visitors without admin authorization are denied the dashboard on desktop

        Background:
            Given the user does not have admin authorization
            And a user is on the guestbook page

        Scenario: Unauthorized user is denied the dashboard on desktop
            When a user clicks the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the landing page
            And they are shown a message that they do not have admin authorization

        Scenario: Unauthorized visitor message can be dismissed on desktop
            Given the user is shown a message that they do not have admin authorization
            When they click the `Boo hiss! Fine.` button
            Then the message closes

    Rule: Visitors without admin authorization are denied the dashboard on mobile

        Background:
            Given the user does not have admin authorization
            And a user is on the guestbook page on mobile

        Scenario: Unauthorized user is denied the dashboard on mobile
            When a user clicks the drop-down `menu` button and selects the `admin login` link
            And they sign in successfully with Google
            Then they are redirected to the landing page
            And they are shown a message that they do not have admin authorization

        Scenario: Unauthorized visitor message can be dismissed on mobile
            Given the user is shown a message that they do not have admin authorization
            When they click the `Boo hiss! Fine.` button
            Then the message closes
