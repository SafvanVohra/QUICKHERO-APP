import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { requireAuth } from "../lib/auth.js";

const router = express.Router();
router.use(requireAuth);

const UPLOAD_ROOT = path.resolve(process.cwd(), "server", "uploads");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const bucket = req.params.bucket;
    const dir = path.join(UPLOAD_ROOT, bucket);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Client sends the desired relative path (e.g. "<userId>/id-doc-123.png") as `objectPath`.
    const objectPath = (req.body.objectPath || file.originalname).replace(/\.\.+/g, "");
    const safe = objectPath.replace(/[^a-zA-Z0-9/_.-]/g, "_");
    const dir = path.dirname(safe);
    if (dir !== ".") fs.mkdirSync(path.join(UPLOAD_ROOT, req.params.bucket, dir), { recursive: true });
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/:bucket/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.json({ data: null, error: { message: "No file uploaded" } });
  const objectPath = req.body.objectPath || req.file.filename;
  res.json({ data: { path: objectPath }, error: null });
});

router.post("/:bucket/signed-url", async (req, res) => {
  const { path: objectPath } = req.body || {};
  if (!objectPath) return res.json({ data: null, error: { message: "path is required" } });
  const full = path.join(UPLOAD_ROOT, req.params.bucket, objectPath);
  if (!fs.existsSync(full)) {
    return res.json({ data: null, error: { message: "File not found" } });
  }
  // No real signing needed for local dev — the static file server already
  // requires an authenticated app session to have gotten this far.
  const host = req.get("host") || "";
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const baseUrl = `${proto}://${host}`;
  res.json({ data: { signedUrl: `${baseUrl}/uploads/${req.params.bucket}/${objectPath}` }, error: null });
});

export default router;
