Feature: Admin Dashboard settings 

    Rule: Admin Dashboard settings apply changes

        Background:
            Given an authorized admin is signed in with Google SSO
            When they are on the admin dashboard (`/admin`)

                Scenario: Admin can configure guestbook settings
                When an admin updates any guestbook settings
                And they click the `Save Changes` link
                Then those changes are applied to the admin dashboard
                And the standalone guestbook page

                Scenario: Admin can undo changes to guestbook settings
                When an admin updates any guestbook settings
                And they click the `Undo Changes` link
                Then those changes are not applied to the admin dashboard
                And the settings revert to the previously entered values

                Scenario: Admin can set custom comment lengths and rate limits
                When an admin adjusts the Comment Length or Rate Limits settings to allowed limits
                And they click the `Save Changes` link
                Then those new limits are applied to both the standalone guestbook 
                And the main Original Poetry landing guestbook

                Scenario: Admin can allow-list profanity
                When an admin enters a comma-separated values in the Profanity Allow-List 
                And they click the `Save Changes` link
                Then those new allowances are applied to both the standalone guestbook 
                And the main Original Poetry landing guestbook

                Scenario: Admin can view custom CSS example file
                When an admin clicks on the `View Example` link for the custom theme setting
                Then a new tab or window opens to the custom CSS example file