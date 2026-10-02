import type { RequestHandler } from "express";

import { createApp } from "./app.ts";
import { createAuth } from "./lib/auth.ts";
import { connectToMongoDB } from "./lib/db.ts";

let appPromise: Promise<RequestHandler> | undefined;

const getApp = () => {
  appPromise ??= connectToMongoDB().then((database) =>
    createApp(createAuth(database)),
  );
  return appPromise;
};

const handler: RequestHandler = async (req, res, next) => {
  try {
    const app = await getApp();
    app(req, res, next);
  } catch (error) {
    next(error);
  }
};

export default handler;
