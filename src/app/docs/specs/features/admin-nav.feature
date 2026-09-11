Feature: Admin Dashboard page navigation

    Rule: Hanging bookmark works as a link on desktop

        Background:
            Given an authorized admin is signed in with Google SSO
            And they are on the admin dashboard

        Scenario: View Book link works
            When an admin clicks the `view book` link
            Then they are taken to the Original Poetry landing page

    Rule: Navigation is handled by a button on mobile

        Background:
            Given an authorized admin is signed in with Google SSO
            And they are on the admin dashboard on mobile (`/admin`)

        Scenario: Return to book works on mobile
            When an admin clicks the `return to book` link
            Then they are taken to the Original Poetry landing page

    Rule: Comment sort, filter, and search are in a drop-down menu on mobile

        Background:
            Given an authorized admin is signed in with Google SSO
            And they are on the admin dashboard on mobile (`/admin`)

        Scenario: Drop-down menu contains comment sort, filter, and search options
            When an admin clicks the drop-down `comments menu` button
            Then the `comments menu` opens showing comment sort, filter, and search options
