export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "default_secret_shhh", // Use JWT_SECRET for signing
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  allowedEmails: (process.env.ALLOWED_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean),
  allowedDomains: (process.env.ALLOWED_DOMAINS ?? "").split(",").map(d => d.trim().toLowerCase()).filter(Boolean),
};
