import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import http from "node:http";
import mongoose from "mongoose";
import dns from "node:dns";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";
import { User, Profile, UserRole } from "./models/index.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import authRoutes from "./routes/auth.js";
import dbRoutes from "./routes/db.js";
import rpcRoutes from "./routes/rpc.js";
import storageRoutes from "./routes/storage.js";
import etaRoutes from "./routes/eta.js";
import { verifyToken, attachUser } from "./lib/auth.js";
import { setIo } from "./lib/io.js";

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quickhero";

const app = express();
app.use(cors());
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Auth: ${req.headers.authorization ? 'Bearer present' : 'none'}`);
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(attachUser);
app.use("/uploads", express.static(path.resolve(process.cwd(), "server", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/rpc", rpcRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/eta", etaRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: { message: "Internal server error" } });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
setIo(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const userId = token ? verifyToken(token) : null;
  socket.userId = userId;
  next();
});

io.on("connection", (socket) => {
  if (socket.userId) socket.join(`user:${socket.userId}`);
  socket.on("disconnect", () => {});
});

async function ensureAdminAccount() {
  const email = "safvanking1234@gmail.com";
  const password = "safvan@admin";
  const fullName = "Safvan Admin";
  try {
    let user = await User.findOne({ email });
    const passwordHash = await bcrypt.hash(password, 10);
    if (!user) {
      user = await User.create({ email, passwordHash });
      console.log(`👤 Seeded real admin account: ${email}`);
    } else {
      user.passwordHash = passwordHash;
      await user.save();
      console.log(`👤 Verified/Updated real admin account password: ${email}`);
    }
    
    let profile = await Profile.findById(user._id);
    if (!profile) {
      await Profile.create({
        _id: user._id,
        full_name: fullName,
        is_volunteer: true,
        is_verified: true,
        is_available: true,
      });
    } else {
      await Profile.findByIdAndUpdate(user._id, { is_verified: true, is_volunteer: true });
    }

    const roles = ["user", "volunteer", "admin"];
    for (const role of roles) {
      await UserRole.findOneAndUpdate(
        { user_id: user._id, role },
        { role },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("Error ensuring real admin account:", err);
  }
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅  MongoDB connected: ${MONGO_URI}`);
    await ensureAdminAccount();
  } catch (e) {
    console.error("❌  Could not connect to MongoDB.");
    console.error(`    Tried: ${MONGO_URI}`);
    console.error("    Make sure MongoDB is running locally, or set MONGO_URI in .env (e.g. an Atlas connection string).");
    console.error(e.message);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`🚀  QuickHero API + Socket.io listening on http://localhost:${PORT}`);
  });
}

main();
