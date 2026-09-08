Feature: Standalone guestbook page commenting 

    Background:
        Given a user is on the standalone guestbook page of the poetry guestbook

    Rule: Guestbook allows users to submit comments

        Scenario: User submits a valid comment
        When a user enters in a valid display name and comment body and clicks the `Submit` link
        Then their comment displays below the submission form as the topmost entry
        But if the display name or comment body is empty or above the configured character limit
        Then the comment is rejected and not submitted
        And the user is shown an error message

        Scenario: User submits a comment with an email
        When a user submits a valid comment with an email address 
        Then their comment displays without their email
        But if the email address is invalid
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
        When a user clicks the `prev` or `next` links for comment pagination
        Then a previous or next page of comments is displayed