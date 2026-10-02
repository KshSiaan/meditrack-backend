import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import type { Db } from "mongodb";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;
const clientDomain = process.env.CLIENT_DOMAIN;

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long.");
}

if (!baseURL) {
  throw new Error("BETTER_AUTH_URL is required.");
}

if (!clientDomain) {
  throw new Error("CLIENT_DOMAIN is required.");
}

const configuredBaseURL = baseURL;
const configuredClientDomain = clientDomain;

export function createAuth(database: Db) {
  const secureCookies = configuredBaseURL.startsWith("https://");

  return betterAuth({
    appName: "MediTrack",
    baseURL: configuredBaseURL,
    trustedOrigins: [configuredClientDomain],
    advanced: {
      useSecureCookies: secureCookies,
      defaultCookieAttributes: {
        secure: secureCookies,
        sameSite: secureCookies ? "none" : "lax",
      },
    },
    rateLimit: {
      storage: "database",
      enabled: true,
    },

    secret,
    database: mongodbAdapter(database),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
    ],
  });
}
