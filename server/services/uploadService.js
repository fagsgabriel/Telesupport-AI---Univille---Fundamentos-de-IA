const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const {
  findExistingCall,
  createProcessingCall,
  updateCallCompleted,
  updateCallFailed,
  resetCallToProcessing
} = require("./callService");
const { transcribeAudio, analyzeTranscription } = require("./aiService");
const { indexCall } = require("./ragService");

const allowedExtensions = new Set([".mp3", ".wav", ".m4a", ".ogg"]);
const allowedMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/ogg",
  "application/ogg"
]);

function sanitizeFileName(fileName) {
  return path
    .basename(fileName)
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_");
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename(req, file, callback) {
    try {
      const sanitized = sanitizeFileName(file.originalname);
      const extension = path.extname(sanitized).toLowerCase();
      const baseName = path.basename(sanitized, extension);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, `${baseName}-${uniqueSuffix}${extension}`);
    } catch (error) {
      callback(error);
    }
  }
});

function uploadFileFilter(req, file, callback) {
  try {
    const sanitized = sanitizeFileName(file.originalname);
    const extension = path.extname(sanitized).toLowerCase();

    const extensionValid = allowedExtensions.has(extension);
    const mimeTypeValid = allowedMimeTypes.has(file.mimetype);

    if (!extensionValid || !mimeTypeValid) {
      return callback(new Error("Tipo de arquivo inválido. Use mp3, wav, m4a ou ogg."));
    }

    file.sanitizedOriginalName = sanitized;
    return callback(null, true);
  } catch (error) {
    return callback(error);
  }
}

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: uploadFileFilter
}).single("audio");

async function generateFileHash(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (error) {
    throw new Error(`Erro ao gerar hash do arquivo: ${error.message}`);
  }
}

function normalizeCategory(category) {
  const normalized = String(category || "").toLowerCase().trim();
  const allowed = new Set(["reclamacao", "duvida", "elogio"]);
  return allowed.has(normalized) ? normalized : "duvida";
}

async function removeUploadedFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[upload] erro ao remover arquivo:", error.message);
    }
  }
}

function buildRagIndexPayload(callRecord) {
  return {
    id: callRecord.id,
    status: "completed",
    transcription: callRecord.transcription,
    file_name: callRecord.file_name,
    category: callRecord.category,
    summary: callRecord.summary
  };
}

async function indexCompletedCallInRag(callRecord) {
  if (!callRecord?.id || !callRecord.transcription) {
    console.error(
      "[upload] RAG não indexado: chamada sem id ou transcrição",
      callRecord?.id ?? "sem id"
    );
    return;
  }

  const indexPayload = buildRagIndexPayload(callRecord);

  try {
    await indexCall(indexPayload);
    console.log("[upload] chamada indexada no RAG:", indexPayload.id);
  } catch (indexError) {
    console.error("[upload] erro ao indexar no RAG:", indexError.message);
  }
}

async function processUpload(file) {
  let processingRecord = null;

  try {
    if (!file) {
      throw new Error("Arquivo de áudio é obrigatório.");
    }

    console.log("[upload] upload recebido");

    const fileName = file.sanitizedOriginalName || sanitizeFileName(file.originalname);
    const hash = await generateFileHash(file.path);

    const existingRecord = await findExistingCall(hash, fileName);
    if (existingRecord) {
      if (existingRecord.status === "completed") {
        await indexCompletedCallInRag(existingRecord);
        return existingRecord;
      }

      // Permite reprocessar chamadas que ficaram em failed/processing.
      processingRecord = await resetCallToProcessing(existingRecord.id, fileName, hash);
    } else {
      processingRecord = await createProcessingCall(fileName, hash);
    }

    const transcription = await transcribeAudio(file.path);
    const analysis = await analyzeTranscription(transcription);
    const summary = String(analysis.summary).trim();
    const category = normalizeCategory(analysis.category);

    const completedRecord = await updateCallCompleted(
      processingRecord.id,
      transcription,
      summary,
      category
    );

    await indexCompletedCallInRag(completedRecord);

    return completedRecord;
  } catch (error) {
    console.error("[upload] erro:", error.message);

    if (processingRecord?.id) {
      try {
        await updateCallFailed(processingRecord.id);
      } catch (statusError) {
        console.error("[upload] erro ao atualizar status para failed:", statusError.message);
      }
    }

    throw error;
  } finally {
    await removeUploadedFile(file?.path);
  }
}

module.exports = {
  uploadMiddleware,
  processUpload
};
