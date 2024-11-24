const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

// Check if directories exist and create them if necessary
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Set storage engine for image and video files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      const imageDir = "./public/images/uploads";
      ensureDirectoryExists(imageDir);
      cb(null, imageDir); // Set Images folder
    } else if (file.mimetype.startsWith("video")) {
      const videoDir = "./public/videos/uploads";
      ensureDirectoryExists(videoDir);
      cb(null, videoDir); // Set Videos folder
    } else {
      cb(
        new Error("Invalid file type. Only images and videos are allowed."),
        false
      );
    }
  },
  filename: function (req, file, cb) {
    const uniqueName = uuidv4() + path.extname(file.originalname); // Unique filename
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

// Set up Multer with storage engine and file filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 50 }, // 50MB max file size for videos
});

// Middleware to catch Multer errors and prevent server crash
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    return res.status(400).send(err.message);
  } else if (err) {
    // Other errors
    return res.status(400).send(err.message);
  }
  next();
};

module.exports = { upload, handleMulterErrors };
