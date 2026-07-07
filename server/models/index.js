import mongoose from "mongoose";

const { Schema } = mongoose;

// ---------------------------------------------------------------------------
// User (auth) — mirrors Supabase's auth.users, minimal fields only.
// ---------------------------------------------------------------------------
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: null },
  emailConfirmed: { type: Boolean, default: true }, // no real email sending locally
  resetToken: { type: String, default: null },
  resetTokenExpires: { type: Date, default: null },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);

// ---------------------------------------------------------------------------
// user_roles
// ---------------------------------------------------------------------------
const userRoleSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["user", "volunteer", "admin"], required: true },
}, { timestamps: { createdAt: "created_at", updatedAt: false } });
userRoleSchema.index({ user_id: 1, role: 1 }, { unique: true });

export const UserRole = mongoose.model("UserRole", userRoleSchema);

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------
const profileSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, ref: "User" }, // profile.id === user.id
  full_name: { type: String, default: null },
  phone: { type: String, default: null },
  gender: { type: String, default: null },
  blood_group: { type: String, default: null },
  age: { type: Number, default: null },
  address: { type: String, default: null },
  current_lat: { type: Number, default: null },
  current_lng: { type: Number, default: null },
  emergency_contact: { type: String, default: null },
  skills: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  bio: { type: String, default: null },
  photo_url: { type: String, default: null },
  is_volunteer: { type: Boolean, default: false },
  is_available: { type: Boolean, default: false },
  is_verified: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const Profile = mongoose.model("Profile", profileSchema);

// ---------------------------------------------------------------------------
// help_requests
// ---------------------------------------------------------------------------
const helpRequestSchema = new Schema({
  requester_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: null },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  status: { type: String, enum: ["open", "accepted", "in_progress", "resolved", "cancelled"], default: "open" },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, default: null },
  accepted_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resolved_at: { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const HelpRequest = mongoose.model("HelpRequest", helpRequestSchema);

// ---------------------------------------------------------------------------
// request_responses
// ---------------------------------------------------------------------------
const requestResponseSchema = new Schema({
  request_id: { type: Schema.Types.ObjectId, ref: "HelpRequest", required: true },
  volunteer_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, default: null },
  eta_minutes: { type: Number, default: null },
  status: { type: String, default: "pending" },
}, { timestamps: { createdAt: "created_at", updatedAt: false } });
requestResponseSchema.index({ request_id: 1, volunteer_id: 1 }, { unique: true });

export const RequestResponse = mongoose.model("RequestResponse", requestResponseSchema);

// ---------------------------------------------------------------------------
// chat_messages
// ---------------------------------------------------------------------------
const chatMessageSchema = new Schema({
  request_id: { type: Schema.Types.ObjectId, ref: "HelpRequest", required: true },
  sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

// ---------------------------------------------------------------------------
// volunteer_verifications
// ---------------------------------------------------------------------------
const volunteerVerificationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  full_name: { type: String, required: true },
  id_type: { type: String, required: true },
  id_number: { type: String, required: true },
  id_document_url: { type: String, default: null },
  selfie_url: { type: String, default: null },
  skills: { type: [String], default: [] },
  notes: { type: String, default: null },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewer_id: { type: Schema.Types.ObjectId, ref: "User", default: null },
  reviewer_notes: { type: String, default: null },
  reviewed_at: { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

export const VolunteerVerification = mongoose.model("VolunteerVerification", volunteerVerificationSchema);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
const notificationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: null },
  link: { type: String, default: null },
  read_at: { type: Date, default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

export const Notification = mongoose.model("Notification", notificationSchema);
