const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// ─── Local-disk file uploads — no external service required ──────────────────
// Files land in `backend/uploads/<folder>/` and are served back out by
// `express.static` (see app.js) at `${BACKEND_PUBLIC_URL}/uploads/<folder>/…`.
// Replaces the old Cloudinary-backed helpers; every call site
// (`uploadSingle` / `uploadMultiple` / `uploadFields` / `deleteImage`) keeps
// the exact same signature, so routes/controllers didn't need to change.

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

// The origin uploaded files are served from. In production this is the same
// domain nginx already proxies `/api/` and `/uploads/` to; in dev, set
// BACKEND_PUBLIC_URL to your machine's LAN IP (matching mobile/.env's
// EXPO_PUBLIC_API_URL host) so a phone on the same network can load images.
const PUBLIC_URL = (
  process.env.BACKEND_PUBLIC_URL ||
  process.env.CLIENT_URL ||
  `http://localhost:${process.env.PORT || 5000}`
).replace(/\/+$/, '');

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const DOC_EXT = [...IMAGE_EXT, '.pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, same cap the Cloudinary config used
const VIDEO_EXT = ['.mp4', '.webm', '.mov'];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB — short looping clips only

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function storageFor(folder) {
  const dest = path.join(UPLOAD_ROOT, folder);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  });
}

function fileFilterFor(allowedExt) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.includes(ext)) {
      return cb(new Error(`Unsupported file type "${ext || 'unknown'}" — allowed: ${allowedExt.join(', ')}`));
    }
    cb(null, true);
  };
}

// Runs after multer: rewrites `.path` from a local filesystem path to the
// public URL, so controllers that read `req.file.path` / `req.files[...].path`
// keep working unchanged. `.filename` (the on-disk name, still unique) is
// what gets stored as the record's `publicId`.
function publicize(req, res, next) {
  const toPublic = (f) => {
    f.path = `${PUBLIC_URL}/uploads/${path.basename(path.dirname(f.path))}/${f.filename}`;
    return f;
  };
  if (req.file) toPublic(req.file);
  if (Array.isArray(req.files)) req.files.forEach(toPublic);
  else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((arr) => arr.forEach(toPublic));
  }
  next();
}

const uploadSingle = (folder, fieldName = 'image') => [
  multer({ storage: storageFor(folder), fileFilter: fileFilterFor(IMAGE_EXT), limits: { fileSize: MAX_FILE_SIZE } }).single(fieldName),
  publicize,
];

const uploadMultiple = (folder, fieldName = 'images', maxCount = 10) => [
  multer({ storage: storageFor(folder), fileFilter: fileFilterFor(IMAGE_EXT), limits: { fileSize: MAX_FILE_SIZE } }).array(fieldName, maxCount),
  publicize,
];

// A single short video (e.g. the mobile home hero loop)
const uploadVideo = (folder, fieldName = 'video') => [
  multer({ storage: storageFor(folder), fileFilter: fileFilterFor(VIDEO_EXT), limits: { fileSize: MAX_VIDEO_SIZE } }).single(fieldName),
  publicize,
];

// Several named image fields in one request, e.g. restaurant `logo` + `images`
const uploadImageFields = (folder, fields) => [
  multer({ storage: storageFor(folder), fileFilter: fileFilterFor(IMAGE_EXT), limits: { fileSize: MAX_FILE_SIZE } }).fields(fields),
  publicize,
];

// KYC/business documents (FSSAI, PAN, Aadhar, etc.) — accepts photos or scanned PDFs
const uploadFields = (folder, fields) => [
  multer({ storage: storageFor(folder), fileFilter: fileFilterFor(DOC_EXT), limits: { fileSize: MAX_FILE_SIZE } }).fields(fields),
  publicize,
];

// Deletes a previously uploaded file by its stored filename (the record's
// `publicId`). The folder isn't persisted on most records, so — filenames
// being unique — this just checks every upload subfolder for a match.
const deleteImage = async (filename) => {
  if (!filename) return false;
  let folders;
  try {
    folders = await fs.promises.readdir(UPLOAD_ROOT, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const dirent of folders) {
    if (!dirent.isDirectory()) continue;
    const candidate = path.join(UPLOAD_ROOT, dirent.name, filename);
    try {
      await fs.promises.unlink(candidate);
      return true;
    } catch {
      // not in this folder — keep looking
    }
  }
  return false;
};

module.exports = { uploadSingle, uploadMultiple, uploadVideo, uploadImageFields, uploadFields, deleteImage, UPLOAD_ROOT };
