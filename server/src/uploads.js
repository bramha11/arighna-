// File uploads: blog images (public) and resumes (private, admin download only).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { config } = require("./config");

for (const dir of [config.publicUploads, path.join(config.publicUploads, "blog"), config.privateUploads, path.join(config.privateUploads, "resumes")]) {
  fs.mkdirSync(dir, { recursive: true });
}

function storage(folder) {
  return multer.diskStorage({
    destination: folder,
    filename: (req, file, cb) => cb(null, Date.now() + "-" + crypto.randomBytes(8).toString("hex") + path.extname(file.originalname).toLowerCase()),
  });
}
function only(exts, mimes, label) {
  return (req, file, cb) => {
    const ok = exts.includes(path.extname(file.originalname).toLowerCase()) && mimes.includes(file.mimetype);
    if (ok) cb(null, true);
    else { const e = new Error("Only " + label + " files are allowed."); e.status = 400; cb(e); }
  };
}

const imageUpload = multer({
  storage: storage(path.join(config.publicUploads, "blog")),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: only([".jpg", ".jpeg", ".png", ".webp", ".gif"], ["image/jpeg", "image/png", "image/webp", "image/gif"], "JPG, PNG, WEBP or GIF image"),
});

const resumeUpload = multer({
  storage: storage(path.join(config.privateUploads, "resumes")),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: only([".pdf", ".doc", ".docx"],
    ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
    "PDF or Word"),
});

module.exports = { imageUpload, resumeUpload };
