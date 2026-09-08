Feature: Original Poetry landing page guestbook 

    Rule: Guestbook allows users to submit comments

        Background:
            Given a user is interacting with the guestbook on the poetry landing Page

        Scenario: User submits a valid comment
            When a user enters in a valid display name and comment body
            And clicks the `submit` button
            Then their comment displays as the topmost guestbook entry

        Scenario: User submits an empty or over-long comment
            When a user enters a display name or comment body that is empty or above the configured character limit
            And they click the `submit` button
            Then the comment is rejected and not submitted
            And the user is shown an error message

        Scenario: User submits a comment with an email
            When a user submits a valid comment with a valid email address
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

    Rule: Guestbook is hidden on mobile by default

        Background:
            Given a user is on the main landing page of the poetry guestbook on mobile

        Scenario: Guestbook can be opened on mobile using the commenting button
            Given a user is interacting with the poetry book
            When a user clicks the comment bubble button
            Then the guestbook opens and show the user the commenting form

        Scenario: Guestbook can be closed on mobile using the Close button
            Given a user has clicked on the comment bubble button to show the guestbook
            When they click the `close` button
            Then the guestbook closes and reveal the poetry book again

    Rule: Guestbook entries are paginated

        Background:
            Given a user is interacting with the guestbook on the poetry landing Page

        Scenario: User interacts with the guestbook pagination
            When a user clicks the `prev` or `next` buttons for guestbook comment pagination
            Then a previous or next page of comments displays
