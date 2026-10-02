import mongoose from "mongoose";
import { MongoClient } from "mongodb";

const databaseUrl = process.env.DB_URL;
let authClient: MongoClient | undefined;

if (!databaseUrl) {
  throw new Error("DB_URL is required to connect to MongoDB.");
}

export async function connectToMongoDB() {
  const url = databaseUrl;
  if (!url) {
    throw new Error("DB_URL is required to connect to MongoDB.");
  }

  if (mongoose.connection.readyState === 1 && authClient) {
    return authClient.db();
  }

  await mongoose.connect(url);
  authClient = new MongoClient(url);
  await authClient.connect();
  console.log("Connected to MongoDB.");

  return authClient.db();
}

export function getDatabaseStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];

  return {
    connected: mongoose.connection.readyState === 1,
    state: states[mongoose.connection.readyState] ?? "unknown",
  };
}

export async function disconnectFromMongoDB() {
  await authClient?.close();
  authClient = undefined;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
