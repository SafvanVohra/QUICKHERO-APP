import { Profile, UserRole, Notification, HelpRequest } from "../models/index.js";
import { serialize } from "./serialize.js";
import { emitToUser, broadcastChange } from "./io.js";
import { haversineKm } from "./geo.js";

const KNOWN_ADMIN_EMAIL = "itmsafvan@gmail.com";

/** Mirrors handle_new_user() + grant_admin_for_known_email() triggers. */
export async function handleNewUser(user, meta = {}) {
  const fullName = meta.full_name || meta.name || user.email.split("@")[0];
  await Profile.create({
    _id: user._id,
    full_name: fullName,
    photo_url: meta.avatar_url || null,
    phone: user.phone || null,
  });
  await UserRole.create({ user_id: user._id, role: "user" });

  if (user.email.toLowerCase() === KNOWN_ADMIN_EMAIL) {
    await UserRole.findOneAndUpdate(
      { user_id: user._id, role: "admin" },
      { user_id: user._id, role: "admin" },
      { upsert: true },
    );
    await UserRole.findOneAndUpdate(
      { user_id: user._id, role: "volunteer" },
      { user_id: user._id, role: "volunteer" },
      { upsert: true },
    );
    await Profile.findByIdAndUpdate(user._id, { is_verified: true, is_volunteer: true });
  }
}

async function createNotification(userId, type, title, body, link) {
  const n = await Notification.create({ user_id: userId, type, title, body, link });
  const row = serialize(n);
  emitToUser(userId, "notifications", "INSERT", row);
  return row;
}

/** Mirrors tg_notify_on_accept() — fires after a help_requests UPDATE. */
export async function notifyOnAccept(before, after) {
  if (String(before.accepted_by || "") !== String(after.accepted_by || "") && after.accepted_by) {
    await createNotification(
      after.requester_id,
      "request_accepted",
      "Help is on the way",
      `A volunteer accepted your alert: ${after.title}`,
      `/requests/${after._id}`,
    );
  }
  if (after.status === "resolved" && before.status !== "resolved" && after.accepted_by) {
    await createNotification(
      after.accepted_by,
      "request_resolved",
      "Alert resolved",
      `${after.title} was marked resolved.`,
      `/requests/${after._id}`,
    );
  }
}

/** Mirrors tg_notify_nearby_volunteers() — fires after a help_requests INSERT. */
export async function notifyNearbyVolunteers(request) {
  const RADIUS_KM = 15;
  const volunteers = await Profile.find({
    is_volunteer: true,
    _id: { $ne: request.requester_id },
    current_lat: { $ne: null },
    current_lng: { $ne: null },
  }).lean();

  for (const v of volunteers) {
    const dist = haversineKm(v.current_lat, v.current_lng, request.lat, request.lng);
    if (dist > RADIUS_KM) continue;
    const urgent = request.severity === "critical" || request.severity === "high";
    const title =
      request.severity === "critical" ? "🚨 Urgent alert nearby" :
      request.severity === "high" ? "⚠️ High-priority alert nearby" :
      "New alert nearby";
    await createNotification(
      v._id,
      urgent ? "urgent_nearby" : "nearby_alert",
      title,
      `${request.title} — about ${dist.toFixed(1)} km away`,
      `/requests/${request._id}`,
    );
  }
}

/** Mirrors tg_notify_verification() — fires after a volunteer_verifications UPDATE. */
export async function notifyVerification(before, after) {
  if (before.status === after.status) return;
  if (after.status !== "approved" && after.status !== "rejected") return;

  await createNotification(
    after.user_id,
    `verification_${after.status}`,
    after.status === "approved" ? "Volunteer approved 🎉" : "Verification update",
    after.reviewer_notes ||
      (after.status === "approved"
        ? "You are now a verified volunteer."
        : "Your verification was not approved."),
    "/profile",
  );

  if (after.status === "approved") {
    await UserRole.findOneAndUpdate(
      { user_id: after.user_id, role: "volunteer" },
      { user_id: after.user_id, role: "volunteer" },
      { upsert: true },
    );
    await Profile.findByIdAndUpdate(after.user_id, { is_volunteer: true, is_verified: true });
  }
}

/** Mirrors tg_enforce_resolve_by_requester() — validated before a help_requests UPDATE is applied. */
export function enforceResolveByRequester(userId, before, patch) {
  const nextStatus = patch.status;
  if (!nextStatus) return null;
  if (nextStatus === "resolved" && before.status !== "resolved") {
    if (String(userId) !== String(before.requester_id)) {
      return "Only the requester can mark this alert as resolved";
    }
  }
  if (nextStatus === "cancelled" && before.status !== "cancelled") {
    if (String(userId) !== String(before.requester_id)) {
      return "Only the requester can cancel this alert";
    }
  }
  return null;
}

export function broadcastHelpRequestChange(eventType, row, oldRow) {
  broadcastChange("help_requests", eventType, row, oldRow);
}
