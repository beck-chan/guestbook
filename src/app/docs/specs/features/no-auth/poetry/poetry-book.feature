Feature: Original Poetry volume 

    Rule: Original Poetry volume behaves as a book on desktop

        Scenario: Original Poetry book opens flat
            Given a user is on the main landing page of the poetry guestbook on desktop (`/`)
            When a user clicks the `Open Book` button
            Then the Original Poetry book opens flat

        Scenario: Original Poetry book closes
            Given the Original Poetry book is opened flat on desktop
            When a user clicks the `Close Book` button
            Then the Original Poetry book closes to its original first load state

    Rule: Original Poetry volume scrolls on mobile

        Scenario: Original Poetry book opens on mobile by scrolling
            Given a user is on the main landing page of the poetry guestbook on mobile (`/`)
            When a user scrolls down
            Then the introduction page of the Original Poetry book reveals

        Scenario: Original Poetry book opens on mobile with Open Book
            Given a user is on the main landing page of the poetry guestbook on mobile
            When a user clicks the `Open Book` button
            Then the introduction page of the Original Poetry book reveals

        Scenario: Original Poetry book closes on mobile
            Given the user is on the introduction page of the Original Poetry book on mobile
            When a user clicks the `Close Book` button
            Then they are taken back up to the cover page of the Original Poetry book

        Scenario: Original Poetry book poem pages turn
            Given the user is on the introduction page of the Original Poetry book on mobile
            When a user clicks the `Turn Page` button
            Then they are taken to the poem page of the Original Poetry book

    Rule: Book pages are interactive

        Background:
            Given the Original Poetry book is opened on desktop

        Scenario: Portfolio link works
            Given the user is on the introduction page of the Original Poetry book
            When a user clicks the `Visit Beck's Portfolio` link
            Then a new tab or window opens to Beck's portfolio

        Scenario: Original Poetry heart function
            When a user clicks the `Like This Poem` button
            Then the heart fills with colour
            And the count of likes increases by 1

        Scenario: Original Poetry unlike function
            Given the heart is filled with colour
            When a user clicks the `Like This Poem` button
            Then the heart is no longer filled with colour
            And the count of likes decreases by 1

        Scenario: Poem page turn
            When a user clicks the `Turn Page` button on a poem page
            Then the poem text on the page changes

    Rule: Poem font size can be changed on mobile

        Background:
            Given a user is interacting with a poem page on mobile

        Scenario: Users can increase poem font size
            When they click the `Increase font size` button
            Then the poem page font increases in size

        Scenario: Users can decrease poem font size
            When they click the `Decrease font size` button
            Then the poem page font decreases in size
