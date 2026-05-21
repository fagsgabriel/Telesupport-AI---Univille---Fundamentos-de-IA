const multer = require("multer");
const { processUpload } = require("../services/uploadService");

async function handleUpload(req, res) {
  try {
    const callRecord = await processUpload(req.file);
    return res.status(200).json({
      success: true,
      data: callRecord
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao processar upload."
    });
  }
}

function uploadErrorHandler(error, req, res, next) {
  try {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "Arquivo excede o limite de 10MB."
        });
      }
    }

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro de validação no upload."
      });
    }

    return next();
  } catch (handlerError) {
    return res.status(500).json({
      success: false,
      error: handlerError.message
    });
  }
}

module.exports = {
  handleUpload,
  uploadErrorHandler
};
