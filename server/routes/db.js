import express from "express";
import mongoose from "mongoose";
import {
  User, Profile, UserRole, HelpRequest, RequestResponse, ChatMessage,
  VolunteerVerification, Notification,
} from "../models/index.js";
import { serialize } from "../lib/serialize.js";
import { requireAuth } from "../lib/auth.js";
import { isAdmin, readScope, checkInsert, checkUpdate, checkDelete } from "../lib/permissions.js";
import { broadcastChange, emitToUser } from "../lib/io.js";
import {
  notifyOnAccept, notifyNearbyVolunteers, notifyVerification, enforceResolveByRequester,
} from "../lib/triggers.js";

const router = express.Router();

const MODELS = {
  profiles: Profile,
  public_profiles: Profile,
  user_roles: UserRole,
  help_requests: HelpRequest,
  request_responses: RequestResponse,
  chat_messages: ChatMessage,
  volunteer_verifications: VolunteerVerification,
  notifications: Notification,
};

const PUBLIC_PROFILE_FIELDS = ["_id", "full_name", "photo_url", "is_volunteer", "is_verified", "skills", "languages", "bio"];

const FK_FIELDS = new Set([
  "user_id", "requester_id", "accepted_by", "volunteer_id", "sender_id",
  "reviewer_id", "request_id",
]);

function isObjectIdLike(v) {
  return typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
}

/** Converts a client-sent filter array into a Mongo query object. Returns `null` if the filters can never match (e.g. a malformed id), so the caller can short-circuit to an empty result instead of throwing. */
function buildMongoFilter(filters = []) {
  const clauses = [];
  for (const f of filters) {
    let { col, op, val } = f;
    let field = col === "id" ? "_id" : col;

    if ((field === "_id" || FK_FIELDS.has(field)) && val != null) {
      if (op === "in") {
        const cast = [];
        for (const v of val) {
          if (v == null) continue;
          if (!isObjectIdLike(v)) return null;
          cast.push(new mongoose.Types.ObjectId(v));
        }
        val = cast;
      } else {
        if (!isObjectIdLike(val)) return null;
        val = new mongoose.Types.ObjectId(val);
      }
    }

    switch (op) {
      case "eq": clauses.push({ [field]: val }); break;
      case "neq": clauses.push({ [field]: { $ne: val } }); break;
      case "is": clauses.push({ [field]: val }); break;
      case "in": clauses.push({ [field]: { $in: val } }); break;
      case "gt": clauses.push({ [field]: { $gt: val } }); break;
      case "gte": clauses.push({ [field]: { $gte: val } }); break;
      case "lt": clauses.push({ [field]: { $lt: val } }); break;
      case "lte": clauses.push({ [field]: { $lte: val } }); break;
      default: break;
    }
  }
  return clauses.length ? { $and: clauses } : {};
}

function projectionFor(table, select) {
  if (table === "public_profiles") {
    const wanted = select && select !== "*" ? select.split(",").map((s) => s.trim()) : PUBLIC_PROFILE_FIELDS.map((f) => (f === "_id" ? "id" : f));
    const proj = {};
    for (const f of wanted) proj[f === "id" ? "_id" : f] = 1;
    return proj;
  }
  return null; // full document
}

function respond(res, data, error = null) {
  if (error) return res.json({ data: null, error: { message: error } });
  return res.json({ data, error: null });
}

router.use(requireAuth);

// Check and block demo admin mutations
async function checkDemoAdminBlock(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (user && user.email === "admin@quickhero.local") {
      return res.json({ data: null, error: { message: "Demo admin is in read-only mode and cannot perform this action." } });
    }
  } catch (err) {
    console.error("Error checking demo admin block:", err);
  }
  next();
}

// ---------------------------------------------------------------------------
// SELECT
// ---------------------------------------------------------------------------
router.post("/:table/select", async (req, res) => {
  const { table } = req.params;
  const Model = MODELS[table];
  if (!Model) return respond(res, null, `Unknown table "${table}"`);

  const { filters = [], order, limit, single, maybeSingle, select } = req.body || {};
  const admin = await isAdmin(req.userId);
  const scope = await readScope(table, req.userId, admin);
  const userFilter = buildMongoFilter(filters);

  if (userFilter === null) return respond(res, single || maybeSingle ? null : []);

  let query = Model.find({ $and: [scope, userFilter] });
  const projection = projectionFor(table, select);
  if (projection) query = query.select(projection);
  if (order?.col) query = query.sort({ [order.col]: order.ascending === false ? -1 : 1 });
  if (single || maybeSingle) query = query.limit(1);
  else if (limit) query = query.limit(limit);

  try {
    const docs = await query.lean();
    const rows = serialize(docs);
    if (single) {
      if (!rows.length) return respond(res, null, "No rows found");
      return respond(res, rows[0]);
    }
    if (maybeSingle) return respond(res, rows[0] ?? null);
    return respond(res, rows);
  } catch (e) {
    return respond(res, null, e.message);
  }
});

// ---------------------------------------------------------------------------
// INSERT
// ---------------------------------------------------------------------------
router.post("/:table/insert", checkDemoAdminBlock, async (req, res) => {
  const { table } = req.params;
  const Model = MODELS[table];
  if (!Model) return respond(res, null, `Unknown table "${table}"`);

  const { values, select, single, maybeSingle } = req.body || {};
  const rowsIn = Array.isArray(values) ? values : [values];

  try {
    for (const v of rowsIn) checkInsert(table, req.userId, v);

    const created = [];
    for (const v of rowsIn) {
      const doc = new Model(v);
      await doc.save();
      created.push(doc);
    }
    const rows = serialize(created);

    for (let i = 0; i < created.length; i++) {
      if (table === "notifications") {
        emitToUser(rows[i].user_id, "notifications", "INSERT", rows[i]);
      } else {
        broadcastChange(table, "INSERT", rows[i]);
      }
      if (table === "help_requests") {
        await notifyNearbyVolunteers(created[i]);
      }
    }

    if (single) return respond(res, rows[0]);
    if (maybeSingle) return respond(res, rows[0] ?? null);
    return respond(res, rows);
  } catch (e) {
    return respond(res, null, e.message);
  }
});

// ---------------------------------------------------------------------------
// UPSERT (only pattern used: request_responses on request_id+volunteer_id)
// ---------------------------------------------------------------------------
router.post("/:table/upsert", checkDemoAdminBlock, async (req, res) => {
  const { table } = req.params;
  const Model = MODELS[table];
  if (!Model) return respond(res, null, `Unknown table "${table}"`);
  const { values, select, single, maybeSingle } = req.body || {};

  try {
    checkInsert(table, req.userId, values);
    let key = {};
    if (table === "request_responses") {
      key = { request_id: values.request_id, volunteer_id: values.volunteer_id };
    } else {
      key = { _id: values.id ?? values._id };
    }
    const filter = buildMongoFilter(
      Object.entries(key).map(([col, val]) => ({ col: col === "_id" ? "id" : col, op: "eq", val })),
    );
    const doc = await Model.findOneAndUpdate(filter, { $set: values }, { upsert: true, new: true });
    const row = serialize(doc);
    broadcastChange(table, "UPSERT", row);
    if (single || maybeSingle) return respond(res, row);
    return respond(res, [row]);
  } catch (e) {
    return respond(res, null, e.message);
  }
});

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------
router.post("/:table/update", checkDemoAdminBlock, async (req, res) => {
  const { table } = req.params;
  const Model = MODELS[table];
  if (!Model) return respond(res, null, `Unknown table "${table}"`);

  const { filters = [], values, select, single, maybeSingle } = req.body || {};
  const mongoFilter = buildMongoFilter(filters);
  if (mongoFilter === null) return respond(res, single || maybeSingle ? null : []);

  try {
    const admin = await isAdmin(req.userId);
    const candidates = await Model.find(mongoFilter);

    const updated = [];
    for (const doc of candidates) {
      const before = doc.toObject();

      if (table === "help_requests") {
        const violation = enforceResolveByRequester(req.userId, before, values);
        if (violation) return respond(res, null, violation);
      }

      try {
        await checkUpdate(table, req.userId, admin, before, values);
      } catch {
        continue; // RLS-style silent skip — mirrors Postgres filtering out disallowed rows
      }

      Object.assign(doc, values);
      await doc.save();
      updated.push({ before, after: doc.toObject() });
    }

    const rows = serialize(updated.map((u) => u.after));

    for (let i = 0; i < updated.length; i++) {
      if (table === "notifications") {
        emitToUser(rows[i].user_id, "notifications", "UPDATE", rows[i]);
      } else {
        broadcastChange(table, "UPDATE", rows[i]);
      }
      if (table === "help_requests") {
        await notifyOnAccept(updated[i].before, updated[i].after);
      }
      if (table === "volunteer_verifications") {
        await notifyVerification(updated[i].before, updated[i].after);
      }
    }

    if (single) {
      if (!rows.length) return respond(res, null, "No rows found");
      return respond(res, rows[0]);
    }
    if (maybeSingle) return respond(res, rows[0] ?? null);
    return respond(res, rows);
  } catch (e) {
    return respond(res, null, e.message);
  }
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
router.post("/:table/delete", checkDemoAdminBlock, async (req, res) => {
  const { table } = req.params;
  const Model = MODELS[table];
  if (!Model) return respond(res, null, `Unknown table "${table}"`);
  const { filters = [] } = req.body || {};
  const mongoFilter = buildMongoFilter(filters);
  if (mongoFilter === null) return respond(res, []);

  try {
    const candidates = await Model.find(mongoFilter);
    const deleted = [];
    for (const doc of candidates) {
      const before = doc.toObject();
      try {
        checkDelete(table, req.userId, before);
      } catch {
        continue;
      }
      await doc.deleteOne();
      deleted.push(before);
    }
    const rows = serialize(deleted);
    for (const row of rows) broadcastChange(table, "DELETE", null, row);
    return respond(res, rows);
  } catch (e) {
    return respond(res, null, e.message);
  }
});

export default router;
