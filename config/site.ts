export const siteConfig = {
  name: "Storefy",
  description: "Multi-tenant SaaS platform for small businesses.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
