export const PUBLIC_API_SERVERS = [
  {
    url: "https://{projectRef}.supabase.co/rest/v1",
    description: "Set your project ID",
    variables: {
      projectRef: {
        default: "your-database-url",
        description:
          "Project ID from NEXT_PUBLIC_SUPABASE_URL (the subdomain before .supabase.co).",
      },
    },
  },
  {
    url: "https://your-database-url.supabase.co/rest/v1",
    description:
      "Test call URL — select this, then replace your-database-url with your project ID",
  },
];
