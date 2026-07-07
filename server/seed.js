import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dns from "node:dns";
import { User, Profile, UserRole } from "./models/index.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quickhero";

const DEMO_USERS = [
  { email: "safvanking1234@gmail.com", password: "safvan@admin", full_name: "Safvan Admin", roles: ["user", "volunteer", "admin"], is_volunteer: true, is_verified: true, is_available: true, current_lat: 28.6139, current_lng: 77.2090 },
  { email: "admin@quickhero.local", password: "password123", full_name: "Admin Aisha", roles: ["user", "volunteer", "admin"], is_volunteer: true, is_verified: true, is_available: true, current_lat: 28.6139, current_lng: 77.2090 },
  { email: "volunteer@quickhero.local", password: "password123", full_name: "Volunteer Vikram", roles: ["user", "volunteer"], is_volunteer: true, is_verified: true, is_available: true, current_lat: 28.62, current_lng: 77.21, skills: ["first_aid", "driving"] },
  { email: "user@quickhero.local", password: "password123", full_name: "Regular Riya", roles: ["user"] },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}`);

  for (const u of DEMO_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`↷ ${u.email} already exists, skipping`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await User.create({ email: u.email, passwordHash });
    await Profile.create({
      _id: user._id,
      full_name: u.full_name,
      is_volunteer: !!u.is_volunteer,
      is_verified: !!u.is_verified,
      is_available: !!u.is_available,
      current_lat: u.current_lat ?? null,
      current_lng: u.current_lng ?? null,
      skills: u.skills ?? [],
    });
    for (const role of u.roles) {
      await UserRole.create({ user_id: user._id, role });
    }
    console.log(`✅ Created ${u.email} / ${u.password}`);
  }

  console.log("\nDone. Sign in with any of the accounts above.");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
