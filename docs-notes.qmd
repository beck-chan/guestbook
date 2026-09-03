# Prerequisites

- Supabase
- Google Cloud Platform
- Node.js/npm

# Articles

## Quickstart

GitHub template (simplest for a whole app)
Mark the repo as a template. Someone clicks “Use this template,” copies .env.example, runs schema.sql on their Supabase, and npm run dev. They get the same frontend + wiring. That is how most Next.js starters ship. Env vars, Google OAuth, and the allowlist stay their secrets — you never ship keys.

## Installation

- Prerequisites
- Install with Node Package Manager (`npm`)
- Add hit counter with PostHog

## Administration

- Set up your admin user
- Moderate comments

## Configuration

- Define basic display options
- Modify advanced display options

## API Reference

*** 

# notes

npm package (if they already have a Next.js app)
You extract guestbook UI + server actions into something like @you/guestbook with peer deps on next, react, and @supabase/supabase-js. They install it and mount routes. This is harder here: styles live in a large globals.css, the poetry desk is mixed in, and App Router needs their middleware, callback route, and env. You would split “guestbook kit” from the poetry site first.

create-next-app example
Same as a template, but people run npx create-next-app -e your-example. Still a full app, not a drop-in component.

What does not really exist: a single “export the frontend” button. Next.js is the product. The backend contract (tables, RLS, NEXT_PUBLIC_*) has to travel with it as docs + schema.sql + .env.example, even if you only care about the UI.

For “others run a guestbook site,” use a template repo. For “others embed this in their own Next app,” plan a component package after the poetry desk is separated from the guestbook.