import { UserRole, HelpRequest } from "../models/index.js";

export async function isAdmin(userId) {
  if (!userId) return false;
  const row = await UserRole.findOne({ user_id: userId, role: "admin" }).lean();
  return !!row;
}

/**
 * Returns an extra Mongo filter (ANDed with the caller's own filters) that
 * scopes a SELECT to what this user is allowed to see. Mirrors the RLS
 * SELECT policies from the migrations. `null` means "no extra restriction"
 * (still requires authentication, enforced by the router).
 */
export async function readScope(table, userId, admin) {
  switch (table) {
    case "profiles":
      // "Users can view their own profile" + "Admins can view all profiles"
      if (admin) return {};
      return { _id: userId };

    case "public_profiles":
      // Safe cross-user view — anyone authenticated can read the limited fields.
      return {};

    case "user_roles":
      // "Users can view their own roles"
      return { user_id: userId };

    case "help_requests":
      // "View help requests scoped to user or open"
      if (admin) return {};
      return { $or: [{ status: "open" }, { requester_id: userId }, { accepted_by: userId }] };

    case "request_responses":
      // "Involved parties view responses"
      {
        const myRequestIds = await HelpRequest.find({ requester_id: userId }).select("_id").lean();
        const ids = myRequestIds.map((r) => r._id);
        return { $or: [{ volunteer_id: userId }, { request_id: { $in: ids } }] };
      }

    case "chat_messages":
      // "Involved parties view chat" — requester or accepted volunteer of the request
      {
        const myRequests = await HelpRequest.find({
          $or: [{ requester_id: userId }, { accepted_by: userId }],
        }).select("_id").lean();
        const ids = myRequests.map((r) => r._id);
        return { request_id: { $in: ids } };
      }

    case "volunteer_verifications":
      // "vv_select"
      if (admin) return {};
      return { user_id: userId };

    case "notifications":
      // "notif_select_own"
      return { user_id: userId };

    default:
      return {};
  }
}

/** Mirrors the INSERT WITH CHECK policies. Throws a descriptive error if disallowed. */
export function checkInsert(table, userId, values) {
  switch (table) {
    case "profiles":
      if (String(values.id ?? values._id ?? "") !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"profiles\"");
      }
      return;
    case "help_requests":
      if (String(values.requester_id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"help_requests\"");
      }
      return;
    case "request_responses":
      if (String(values.volunteer_id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"request_responses\"");
      }
      return;
    case "chat_messages":
      if (String(values.sender_id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"chat_messages\"");
      }
      return;
    case "volunteer_verifications":
      if (String(values.user_id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"volunteer_verifications\"");
      }
      return;
    case "notifications":
      if (String(values.user_id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"notifications\"");
      }
      return;
    default:
      return;
  }
}

/**
 * Mirrors the UPDATE USING/WITH CHECK policies. `before` is the existing row
 * (plain lean object), `patch` is the requested change. Throws on violation.
 */
export async function checkUpdate(table, userId, admin, before, patch) {
  switch (table) {
    case "profiles":
      if (String(before._id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"profiles\"");
      }
      return;

    case "help_requests": {
      const isRequester = String(before.requester_id) === String(userId);
      const isResponder = String(before.accepted_by || "") === String(userId);
      const isOpenAcceptAttempt =
        before.status === "open" &&
        !before.accepted_by &&
        String(before.requester_id) !== String(userId) &&
        patch.status === "accepted" &&
        String(patch.accepted_by || "") === String(userId);
      if (admin || isRequester || isResponder || isOpenAcceptAttempt) return;
      throw new Error("new row violates row-level security policy for table \"help_requests\"");
    }

    case "request_responses":
      if (String(before.volunteer_id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"request_responses\"");
      }
      return;

    case "volunteer_verifications":
      if (admin) return;
      if (String(before.user_id) === String(userId) && before.status === "pending") return;
      throw new Error("new row violates row-level security policy for table \"volunteer_verifications\"");

    case "notifications":
      if (String(before.user_id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"notifications\"");
      }
      return;

    default:
      return;
  }
}

export function checkDelete(table, userId, before) {
  switch (table) {
    case "profiles":
      if (String(before._id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"profiles\"");
      }
      return;
    case "help_requests":
      if (String(before.requester_id) !== String(userId)) {
        throw new Error("new row violates row-level security policy for table \"help_requests\"");
      }
      return;
    default:
      return;
  }
}
