const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

// Ensure directory exists
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage engine for images and videos in "work_upload" folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const workUploadDir = "./work_upload"; // Path to "work_upload" folder
    ensureDirectoryExists(workUploadDir);
    cb(null, workUploadDir); // All files go to "work_upload" folder
  },
  filename: function (req, file, cb) {
    const uniqueName = uuidv4() + path.extname(file.originalname); // Unique file name
    cb(null, uniqueName);
  },
});

// File filter to accept only image and video files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "video/mp4",
    "video/quicktime", // For MOV files
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only images and videos are allowed."),
      false
    );
  }
};

// Set up Multer with the new storage engine
const workUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 50 }, // 50MB max file size for videos
});

// Middleware to catch Multer errors and prevent server crash
const handleMulterErrorstwo = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).send(err.message);
  } else if (err) {
    return res.status(400).send(err.message);
  }
  next();
};

module.exports = { workUpload, handleMulterErrorstwo };
