Feature: Admin Dashboard page navigation

    @navigation
    Rule: Navigation is a button

        Background:
            Given an authorized admin is signed in with Google SSO
            And they are on the admin dashboard (`/admin`)

        Scenario: View Guestbook link works
            When an admin clicks the `view guestbook` link
            Then they are taken to the guestbook page

    @mobile-menu
    Rule: Comment sort, filter, and search are in a collapsible menu on mobile

        Background:
            Given an authorized admin is signed in with Google SSO
            And they are on the admin dashboard on mobile (`/admin`)

        Scenario: Collapsible menu contains comment sort, filter, and search options
            When an admin clicks the collapsible `comments menu` button
            Then the `comments menu` opens showing comment sort, filter, and search options
