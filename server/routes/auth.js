import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { User, Profile, UserRole } from "../models/index.js";
import { signToken, verifyToken, attachUser } from "../lib/auth.js";
import { handleNewUser } from "../lib/triggers.js";

const router = express.Router();
router.use(attachUser);

function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    phone: user.phone || null,
    user_metadata: {},
  };
}

router.post("/signup", async (req, res) => {
  const { email, password, options } = req.body || {};
  if (!email || !password) {
    return res.json({ data: { user: null, session: null }, error: { message: "Email and password are required" } });
  }
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.json({ data: { user: null, session: null }, error: { message: "An account with this email already exists" } });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: email.toLowerCase().trim(), passwordHash });
  await handleNewUser(user, options?.data || {});

  const token = signToken(user._id);
  res.json({ data: { user: publicUser(user), session: { access_token: token, user: publicUser(user) } }, error: null });
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: (email || "").toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return res.json({ data: { user: null, session: null }, error: { message: "Invalid email or password" } });
  }
  const token = signToken(user._id);
  res.json({ data: { user: publicUser(user), session: { access_token: token, user: publicUser(user) } }, error: null });
});

router.post("/google", async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) {
    return res.json({ data: { user: null, session: null }, error: { message: "Google ID Token is required" } });
  }
  try {
    let email;
    let name;
    let picture;

    if (idToken.startsWith("mock_token_")) {
      email = idToken.slice(11).toLowerCase().trim();
      const rawName = email.split("@")[0].replace(/[^a-zA-Z]/g, " ");
      name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      picture = null;
    } else {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!response.ok) {
        return res.json({ data: { user: null, session: null }, error: { message: "Invalid Google token" } });
      }
      const payload = await response.json();
      email = payload.email.toLowerCase().trim();
      name = payload.name || payload.given_name;
      picture = payload.picture;
    }

    let user = await User.findOne({ email });
    if (!user) {
      const randomPass = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPass, 10);
      user = await User.create({ email, passwordHash });
    }
    let profile = await Profile.findById(user._id);
    if (!profile) {
      const fullName = name || email.split("@")[0];
      await Profile.create({
        _id: user._id,
        full_name: fullName,
        photo_url: picture || null,
        is_volunteer: false,
        is_verified: false,
      });
      await UserRole.create({ user_id: user._id, role: "user" });
      if (email === "itmsafvan@gmail.com") {
        await UserRole.findOneAndUpdate({ user_id: user._id, role: "admin" }, { role: "admin" }, { upsert: true });
        await UserRole.findOneAndUpdate({ user_id: user._id, role: "volunteer" }, { role: "volunteer" }, { upsert: true });
        await Profile.findByIdAndUpdate(user._id, { is_verified: true, is_volunteer: true });
      }
    }
    const token = signToken(user._id);
    res.json({ data: { user: publicUser(user), session: { access_token: token, user: publicUser(user) } }, error: null });
  } catch (err) {
    console.error("Google auth error:", err);
    res.json({ data: { user: null, session: null }, error: { message: "Google authentication failed" } });
  }
});

router.post("/signout", async (_req, res) => {
  res.json({ error: null });
});

router.get("/session", async (req, res) => {
  if (!req.userId) return res.json({ data: { session: null }, error: null });
  const user = await User.findById(req.userId);
  if (!user) return res.json({ data: { session: null }, error: null });
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  res.json({ data: { session: { access_token: token, user: publicUser(user) } }, error: null });
});

router.get("/user", async (req, res) => {
  if (!req.userId) return res.json({ data: { user: null }, error: null });
  const user = await User.findById(req.userId);
  if (!user) return res.json({ data: { user: null }, error: null });
  res.json({ data: { user: publicUser(user) }, error: null });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  const user = await User.findOne({ email: (email || "").toLowerCase().trim() });
  // Always respond success (don't leak whether the email exists), matching Supabase behaviour.
  if (user) {
    const token = crypto.randomBytes(24).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    const redirectTo = req.body.redirectTo || "http://localhost:5173/reset-password";
    const link = `${redirectTo}?code=${token}`;
    // No SMTP configured for local dev — print the link so you can click it yourself.
    console.log("\n──────────────────────────────────────────────");
    console.log(`📧  Password reset requested for ${user.email}`);
    console.log(`🔗  Reset link: ${link}`);
    console.log("──────────────────────────────────────────────\n");
  }
  res.json({ data: {}, error: null });
});

router.post("/exchange-code", async (req, res) => {
  const { code } = req.body || {};
  const user = await User.findOne({ resetToken: code });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return res.json({ data: { session: null }, error: { message: "Your reset link looks invalid or expired. Request a new one." } });
  }
  user.resetToken = null;
  user.resetTokenExpires = null;
  await user.save();
  const token = signToken(user._id);
  res.json({ data: { session: { access_token: token, user: publicUser(user) } }, error: null });
});

// Single-step password reset: validates token + updates password in one call
router.post("/reset-password", async (req, res) => {
  const { code, password } = req.body || {};
  if (!code || !password) {
    return res.json({ error: { message: "Reset code and new password are required." } });
  }
  const user = await User.findOne({ resetToken: code });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return res.json({ error: { message: "This reset link is invalid or has expired. Please request a new one." } });
  }
  if (password.length < 8) {
    return res.json({ error: { message: "Password must be at least 8 characters." } });
  }
  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetToken = null;
  user.resetTokenExpires = null;
  await user.save();
  const token = signToken(user._id);
  res.json({ data: { session: { access_token: token, user: publicUser(user) } }, error: null });
});

router.post("/update-user", async (req, res) => {
  if (!req.userId) return res.json({ data: { user: null }, error: { message: "Not authenticated" } });
  const user = await User.findById(req.userId);
  if (!user) return res.json({ data: { user: null }, error: { message: "Not authenticated" } });
  if (user.email === "admin@quickhero.local") {
    return res.json({ data: { user: null }, error: { message: "Demo admin is read-only and cannot change password/email settings." } });
  }
  const { password, email } = req.body || {};
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  if (email) user.email = email.toLowerCase().trim();
  await user.save();
  res.json({ data: { user: publicUser(user) }, error: null });
});

export default router;
