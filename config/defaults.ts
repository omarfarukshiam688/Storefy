export const defaults = {
  currency: "USD",
  locale: "en",
  timezone: "UTC",
  storefrontPath: "/store",
  platformPath: "/platform",
  adminPath: "/admin",
} as const;

export type Defaults = typeof defaults;
