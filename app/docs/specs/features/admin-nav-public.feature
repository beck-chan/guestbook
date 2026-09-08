Feature: Admin Dashboard page navigation

    Background:
        Given an authorized admin is signed in with Google SSO
        When they are on the admin dashboard  (`/admin`) 

            Rule: Navigation is a button

                Scenario: View Guestbook link works
                When an admin clicks the `view guestbook` button
                Then they are taken to the guestbook page
    
            Rule: Comment sort, filter, and search are in a collapsible menu on mobile

                Scenario: Collapsible menu contains comment sort, filter, and search options
                When an admin clicks the collapsible `Comments Menu`
                Then the `Comments Menu` opens showing comment sort, filter, and search options   