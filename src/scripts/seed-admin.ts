import { createAuth } from "../lib/auth.ts";
import { connectToMongoDB, disconnectFromMongoDB } from "../lib/db.ts";

const adminEmail = "meditrack@admin.com";
const adminPassword = "meditrack@admincom";
const adminName = "MediTrack Admin";

const seedAdmin = async () => {
  const database = await connectToMongoDB();
  const auth = createAuth(database);
  const users = database.collection("user");
  const existingUser = await users.findOne({
    email: adminEmail,
  });

  if (existingUser) {
    console.log(
      `Admin account already exists; leaving it unchanged: ${adminEmail}`,
    );
    return;
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
    },
  });

  await users.updateOne({ id: result.user.id }, { $set: { role: "admin" } });
  console.log(`Admin account created: ${adminEmail}`);
};

try {
  await seedAdmin();
} catch (error) {
  console.error("Failed to seed admin account:", error);
  process.exitCode = 1;
} finally {
  await disconnectFromMongoDB();
}
