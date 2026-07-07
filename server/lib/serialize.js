// Converts a Mongoose document (or plain object from .lean()) into the
// snake_case, `id`-keyed shape the frontend expects (matching what
// supabase-js used to return from Postgres).
export function serialize(doc) {
  if (doc == null) return null;
  if (Array.isArray(doc)) return doc.map(serialize);
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "_id") {
      out.id = String(value);
      continue;
    }
    if (key === "__v") continue;
    if (key === "passwordHash" || key === "resetToken" || key === "resetTokenExpires") continue;
    out[key] = serializeValue(value);
  }
  return out;
}

function serializeValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value instanceof Date) return value.toISOString();
  // Mongoose ObjectId
  if (value?._bsontype === "ObjectID" || value?.constructor?.name === "ObjectId") {
    return String(value);
  }
  return value;
}
