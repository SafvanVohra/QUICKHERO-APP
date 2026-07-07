import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL = "7d";

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.sub;
  } catch {
    return null;
  }
}

/** Express middleware: attaches req.userId if a valid Bearer token is present. Never rejects. */
export function attachUser(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  req.userId = token ? verifyToken(token) : null;
  next();
}

/** Express middleware: rejects with 401 if not authenticated. */
export function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: { message: "Not authenticated" } });
  next();
}
