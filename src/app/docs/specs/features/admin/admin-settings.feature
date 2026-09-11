Feature: Admin Dashboard settings

    Rule: Admin Dashboard settings apply changes

        Background:
            Given an authorized admin is signed in with Google SSO
            And they are on the admin dashboard (`/admin`)

        Scenario: Admin can update the guestbook title
            When an admin updates the `title` setting
            And they click the `save changes` button
            Then those changes are applied to the admin dashboard
            And those changes are applied to the guestbook page

        Scenario: Admin can undo changes to guestbook settings
            When an admin updates the `title` setting
            And they click the `undo changes` button
            Then those changes are not applied to the admin dashboard
            And the settings revert to the previously entered values

        Scenario: Admin can update the comment placeholder
            When an admin updates the `placeholder` setting
            And they click the `save changes` button
            Then those changes are applied to the guestbook page

        Scenario: Admin can turn off the title marquee
            When an admin sets the `marquee` setting to `off`
            And they click the `save changes` button
            Then the guestbook title displays without a marquee

        Scenario: Admin can set the main font and size
            When an admin updates the `main font` and its `font size`
            And they click the `save changes` button
            Then those changes are applied to the guestbook page

        Scenario: Admin can set the accent font and size
            When an admin updates the `accent font` and its `font size`
            And they click the `save changes` button
            Then those changes are applied to the guestbook page

        Scenario: Admin can set comments per page
            When an admin updates the `comments per page` setting
            And they click the `save changes` button
            Then the guestbook page paginates at that page size

        Scenario: Admin can turn off email capture
            When an admin sets the `capture email` setting to `off`
            And they click the `save changes` button
            Then the email field is not shown on the guestbook page

        Scenario: Admin can set a custom comment length
            When an admin adjusts the `comment length` setting to an allowed limit
            And they click the `save changes` button
            Then those changes are applied to the guestbook page

        Scenario: Admin can set custom rate limits
            When an admin adjusts the `rate limits` settings to allowed limits
            And they click the `save changes` button
            Then those changes are applied to the guestbook page

        Scenario: Admin can allow-list profanity
            When an admin enters comma-separated values in the `profanity allow-list`
            And they click the `save changes` button
            Then those changes are applied to the guestbook page

        Scenario: Admin can view custom CSS example file
            When an admin clicks on the `view example` link for the `custom theme` setting
            Then a new tab or window opens to the custom CSS example file
