# Next.js New Project Setup

To setup a base Next.js project to test the instructions in "Install with npm" in Windows:

1. Once you've installed `fnm`, plunk the directory in your Program Files, then open up `~/.bashrc`:

    ```bash
    code  ~/.bashrc

    ```

2. Tell bash where to look for `fnm`:

    ```bash
    export PATH="/c/Program Files/fnm-windows:$PATH"
    ```

2. Refresh your bash terminal so the changes are picked up:

    ```bash
    source ~/.bashrc
    ```

3. In the directory that is going to be your guestbook application:

    ```bash
    npx create-next-app@latest .
    # Install dependencies
    npm install
    ```

4. When prompted with "? Would you like to use the recommended Next.js defaults? » - Use arrow-keys. Return to submit.", choose:

    ```bash
    >   Yes, use recommended defaults - ...
    ```

5. Proceed with following the instructions in [Install with npm](https://y2k-guestbook.vercel.app/docs/install).



