Feature: Admin Dashboard page navigation

    Rule: Hanging bookmark works as a link on desktop

        Scenario: View Book link works
        Given an authorized admin is signed in with Google SSO
        When they are on the admin dashboard
        When an admin clicks the `View Book` bookmark
        Then they are taken to the Original Poetry landing page

    Background:
        Given an authorized admin is signed in with Google SSO
        When they are on the admin dashboard on mobile  (`/admin`) 

            Rule: Navigation is handled by a button on mobile

                Scenario: Close button works on mobile
                When an admin clicks the `Close` button
                Then they are taken to the Original Poetry landing page
    
            Rule: Comment sort, filter, and search are in a drop-down menu on mobile

                Scenario: Drop-down menu contains comment sort, filter, and search options
                When an admin clicks the drop-down `Comments Menu`
                Then the `Comments Menu` opens showing comment sort, filter, and search options   