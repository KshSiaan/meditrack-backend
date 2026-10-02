import { createApp } from "../src/app.ts";
import { createAuth } from "../src/lib/auth.ts";
import { connectToMongoDB } from "../src/lib/db.ts";

const database = await connectToMongoDB();
const app = createApp(createAuth(database));

export default app;
