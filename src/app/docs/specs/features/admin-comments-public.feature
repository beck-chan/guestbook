Feature: Admin Dashboard comment interactions

    Background:
        Given an authorized admin is signed in with Google SSO
        And they are on the admin dashboard (`/admin`)

    Rule: Admins can interact with comments

        Scenario: Admins can filter comments by read status or date range
            When admins filter comments by read status or date range
            Then comments without the selected criteria are hidden
            And results stack on top of other sorts, filters, or searches

        Scenario: Admins can filter comments by email presence
            When admins filter comments by whether or not they were submitted with an email
            Then comments without the selected criteria are hidden
            And results stack on top of other sorts, filters, or searches

        Scenario: Admins can sort comments
            When admins sort comments by newest or oldest timestamps
            Then the comments sort according to the selected criteria
            And the sort display indicator updates accordingly
            And results stack on top of other sorts, filters, or searches

        Scenario: Admins can search comments
            When admins search comments by keywords
            Then comments not matching submitted keywords are hidden
            And results stack on top of other sorts, filters, or searches

        Scenario: Admins can clear applied filters or sorting
            Given admins have applied search keywords, sorting, or filters to comments
            When they click the `clear all` link or return a sort of filter to default state
            Then search, filter, or sort results are cleared

        Scenario: Admins can change comment read status
            When admins mark comments read or unread individually or all at once
            Then the read status saves automatically
            And the unread count updates accordingly

        Scenario: Admins can edit comments
            When admins click on the `edit` button for a comment
            And they edit the comment body
            And they click away from the text editor
            Then the changes are saved

        Scenario: Admins can delete comments
            When admins click on the `delete` button for a comment
            And they click the `confirm` button
            Then the comment is removed

        Scenario: Admins can cancel deleting a comment
            When admins click on the `delete` button for a comment
            And they click the `cancel` button
            Then the comment is not removed

    Rule: Guestbook comments are paginated

        Scenario: Admin interacts with the guestbook pagination
            When an admin clicks the `prev` or `next` links for comment pagination
            Then a previous or next page of comments displays
