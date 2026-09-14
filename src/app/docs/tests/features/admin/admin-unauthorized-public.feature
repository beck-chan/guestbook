Feature: Unauthorized admin login

    Background:
        Given the user does not have admin authorization
        And a user is on the guestbook page

    Scenario: Unauthorized user is denied the dashboard
        When a user clicks the `admin login` link
        And they sign in successfully with Google
        Then they are redirected to the guestbook page
        And they are shown a message that they do not have admin authorization

    Scenario: Unauthorized visitor message can be dismissed
        Given the user is shown a message that they do not have admin authorization
        When they click the `Close` button
        Then the message closes
