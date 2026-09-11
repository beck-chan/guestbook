Feature: Guestbook page 

    Background:
        Given a user is on the guestbook page

    Rule: Guestbook allows users to submit comments

        Scenario: User submits a valid comment
            When a user enters in a valid display name and comment body 
            And they click the `submit` button
            Then their comment displays below the submission form as the topmost entry

        Scenario: User submits an empty comment
            When a user enters a display name or comment body that is empty
            And they click the `submit` button
            Then the comment is rejected and not submitted
            And the user is shown an error message

        Scenario: User submits a comment with an email
            When a user submits a valid comment with an email address
            Then their comment displays without their email

        Scenario: User submits a comment with an invalid email
            When a user submits a comment with an invalid email address
            Then the comment is rejected and not submitted
            And the user is shown an error message

        Scenario: User submits a comment with English profanity
            When a user submits a comment
            But it contains English profanity in the display name or comment body
            Then their comment is rejected and not submitted
            And the user is shown an error message

        Scenario: User submits a comment above the configured character limit
            When a user submits a comment with a display name and comment and optional email
            But the character counts are above the configured character limit
            Then their comment is rejected and not submitted
            And the user is shown an error message

        Scenario: User submissions are rate limited
            When a user submits too many comments within a specified time period as configured
            Then their comment is rejected and not submitted
            And the user is shown an error message

    Rule: Guestbook entries are paginated

        Scenario: User interacts with the guestbook pagination
            When a user clicks the `prev` or `next` buttons for comment pagination
            Then a previous or next page of comments is displayed
