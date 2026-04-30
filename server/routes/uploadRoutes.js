const express = require("express");
const { uploadMiddleware } = require("../services/uploadService");
const { handleUpload, uploadErrorHandler } = require("../controllers/uploadController");

const router = express.Router();

router.post("/upload", uploadMiddleware, uploadErrorHandler, handleUpload);

module.exports = router;
