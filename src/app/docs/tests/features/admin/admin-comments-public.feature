Feature: Admin Dashboard comment interactions

    Background:
        Given an authorized admin is signed in with Google SSO
        And they are on the admin dashboard (`/admin`)

    @manage-comments
    Rule: Admins can interact with comments

        Scenario: Admins can filter comments by read status
            When admins filter comments by read status
            Then comments without the selected criteria are hidden

        Scenario: Admins can filter comments by date range
            When admins filter comments by date range
            Then comments without the selected criteria are hidden

        Scenario: Admins can filter comments by email presence
            When admins filter comments by whether they were submitted with an email
            Then comments without the selected criteria are hidden

        Scenario: Admins can sort comments by newest
            When admins sort comments by newest timestamps
            Then the comments sort according to the selected criteria
            And the sort display indicator updates accordingly

        Scenario: Admins can sort comments by oldest
            When admins sort comments by oldest timestamps
            Then the comments sort according to the selected criteria
            And the sort display indicator updates accordingly

        Scenario: Admins can search comments
            When admins search comments by keywords
            Then comments not matching submitted keywords are hidden

        Scenario: Filter, sort, and search results stack
            Given admins have applied a sort, a filter, and a search to comments
            Then results stack on top of other sorts, filters, or searches

        Scenario: Admins can clear applied filters or sorting
            Given admins have applied search keywords, sorting, or filters to comments
            When they click the `clear all` link
            Then search, filter, or sort results are cleared

        Scenario: Admins can change a comment's read status
            When admins mark a comment read or unread
            Then the read status saves automatically
            And the unread count updates accordingly

        Scenario: Admins can mark all comments read
            When admins click the `mark all read` button
            Then all comments are marked read
            And the unread count updates accordingly

        Scenario: Admins can mark all comments unread
            When admins click the `mark all unread` button
            Then all comments are marked unread
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

    @pagination
    # Admin always shows 10 comments per page; seed only if fewer than 11 exist
    Rule: Guestbook comments are paginated

        Background:
            Given there are enough comments to trigger pagination

        Scenario: Admin views the next page of comments
            When an admin clicks the `next` link for comment pagination
            Then the next page of comments displays

        Scenario: Admin views the previous page of comments
            When an admin clicks the `prev` link for comment pagination
            Then the previous page of comments displays
