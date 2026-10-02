import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import type { Db } from "mongodb";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long.");
}

if (!baseURL) {
  throw new Error("BETTER_AUTH_URL is required.");
}

if (!process.env.CLIENT_DOMAIN) {
  throw new Error("CLIENT_DOMAIN is required.");
}

export function createAuth(database: Db) {
  return betterAuth({
    appName: "MediTrack",
    baseURL,
    trustedOrigins: [process.env.CLIENT_DOMAIN!],
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
