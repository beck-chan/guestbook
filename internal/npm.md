## Build

```bash
npm run build
npm run start
```

## Linter

```bash
npm run lint
npm run lint:a11y
npm run lint:a11y-docs
```

## Versioning

```bash
npm version patch
npm version minor
npm version major
```

## Admin User

```bash
npm run allow-admin -- example@gmail.com
npm run delete-admin -- example@gmail.com
```

## Sync Docs

<!-- here -->

## Deploy Edge Functions

```bash
npx supabase functions deploy notify-admins on-user-created --project-ref yahduqsmchkyapakpvdh --use-api
```

## Cucumber

```bash
npx cucumber-js 
```