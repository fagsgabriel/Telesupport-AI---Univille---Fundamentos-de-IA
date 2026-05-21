const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const gTTS = require("gtts");

const TTS_OUTPUT_DIR = path.join(__dirname, "..", "tts-output");
const MAX_TTS_CHARS = 500;
const TTS_LANG = process.env.TTS_LANG || "pt";

async function ensureTtsDirectory() {
  await fs.mkdir(TTS_OUTPUT_DIR, { recursive: true });
}

function truncateForSpeech(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= MAX_TTS_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_TTS_CHARS - 3)}...`;
}

async function synthesizeToFile(text) {
  try {
    await ensureTtsDirectory();

    const speechText = truncateForSpeech(text);
    if (!speechText) {
      throw new Error("Texto vazio para síntese de voz.");
    }

    const fileName = `answer-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.mp3`;
    const filePath = path.join(TTS_OUTPUT_DIR, fileName);

    await new Promise((resolve, reject) => {
      const tts = new gTTS(speechText, TTS_LANG);
      tts.save(filePath, (error) => {
        if (error) {
          return reject(error);
        }
        return resolve();
      });
    });

    console.log("[tts] áudio gerado:", fileName);
    return { fileName, filePath };
  } catch (error) {
    throw new Error(`Erro no TTS (gTTS): ${error.message}`);
  }
}

function getPublicAudioUrl(fileName) {
  return `/tts/${fileName}`;
}

async function cleanupOldTtsFiles(maxAgeMs = 60 * 60 * 1000) {
  try {
    await ensureTtsDirectory();
    const entries = await fs.readdir(TTS_OUTPUT_DIR, { withFileTypes: true });
    const now = Date.now();

    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".mp3"))
        .map(async (entry) => {
          const filePath = path.join(TTS_OUTPUT_DIR, entry.name);
          const stats = await fs.stat(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.unlink(filePath);
          }
        })
    );
  } catch (error) {
    console.error("[tts] erro na limpeza de arquivos antigos:", error.message);
  }
}

module.exports = {
  synthesizeToFile,
  getPublicAudioUrl,
  cleanupOldTtsFiles
};
