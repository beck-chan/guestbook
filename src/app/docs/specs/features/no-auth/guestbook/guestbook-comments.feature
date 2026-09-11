Feature: Standalone guestbook page (`/guestbook`)

    Background:
        Given a user is on the standalone guestbook page of the poetry guestbook

    Rule: Guestbook allows users to submit comments

        Scenario: User submits a valid comment
            When a user enters in a valid display name and comment body
            And they click the `submit` button
            Then their comment displays below the submission form as the topmost entry

        Scenario: User submits an empty display name
            When a user leaves the display name empty
            And they click the `submit` button
            Then the comment is not submitted

        Scenario: User submits an empty comment body
            When a user leaves the comment body empty
            And they click the `submit` button
            Then the comment is not submitted

        Scenario: User submits a comment with an email
            When a user submits a valid comment with a valid email address
            Then their comment displays without their email

        Scenario: User submits a comment with an invalid email
            When a user submits a comment with an invalid email address
            Then the comment is not submitted

        Scenario: User submits a comment with English profanity
            When a user submits a comment
            But it contains English profanity in the comment body
            Then their comment is rejected and not submitted
            And the user is shown an error message

        # Default display name limit is 128 characters
        Scenario: User submits a display name above the character limit
            When a user submits a comment with a display name longer than 128 characters
            Then their comment is rejected and not submitted
            And the user is shown an error message

        # Default email limit is 254 characters
        Scenario: User submits an email above the character limit
            When a user submits a comment with an email longer than 254 characters
            Then their comment is rejected and not submitted
            And the user is shown an error message

        # Default comment body limit is 1k characters; 10k is the maximum allowed configured length                
        Scenario: User submits a comment body above the configured character limit
            When a user submits a comment with a comment body longer than 10000 characters
            Then their comment is rejected and not submitted
            And the user is shown an error message

        # Default rate limit is 1 comment every 5 minutes and 2 comments per 24 hours.
        Scenario: User submissions are rate limited
            When a user submits more than 1 comment within 5 minutes
            Then their comment is rejected and not submitted
            And the user is shown an error message

    Rule: Guestbook entries are paginated

        Scenario: User views the next page of comments
            When a user clicks the `next` button for comment pagination
            Then the next page of comments is displayed

        Scenario: User views the previous page of comments
            When a user clicks the `prev` button for comment pagination
            Then the previous page of comments is displayed
