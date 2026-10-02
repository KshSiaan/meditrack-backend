import { createAuth } from "./lib/auth.ts";
import { connectToMongoDB, disconnectFromMongoDB } from "./lib/db.ts";

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  const database = await connectToMongoDB();
  const { createApp } = await import("./app.ts");
  const app = createApp(createAuth(database));
  const server = app.listen(port, () => {
    console.log(`MediTrack API listening at http://localhost:${port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectFromMongoDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
