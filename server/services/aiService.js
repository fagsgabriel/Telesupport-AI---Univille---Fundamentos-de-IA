const fs = require("fs");
const OpenAI = require("openai");

const groqApiKey = process.env.GROQ_API_KEY;
const groqClient = groqApiKey
  ? new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 45_000,
      maxRetries: 0
    })
  : null;

function ensureGroqConfigured() {
  if (!groqClient) {
    throw new Error("GROQ_API_KEY não configurada.");
  }
}

function stripJsonCodeBlock(content) {
  return String(content || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractJsonObject(rawContent) {
  const content = stripJsonCodeBlock(rawContent);
  const startIndex = content.indexOf("{");
  const endIndex = content.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Resposta da IA não contém JSON válido.");
  }

  return content.slice(startIndex, endIndex + 1);
}

async function transcribeAudio(filePath) {
  try {
    ensureGroqConfigured();
    console.log("[upload] transcrição iniciada");

    const model = process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo";
    const response = await groqClient.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model
    });

    const transcription = String(response?.text || "").trim();
    if (!transcription) {
      throw new Error("Transcrição vazia retornada pela IA.");
    }

    console.log("[upload] transcrição finalizada");
    return transcription;
  } catch (error) {
    throw new Error(`Erro na transcrição (Groq): ${error.message}`);
  }
}

async function analyzeTranscription(transcription) {
  try {
    ensureGroqConfigured();
    console.log("[upload] análise iniciada");

    const model = process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant";
    const completion = await groqClient.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Voce analisa chamadas de call center. Retorne apenas JSON valido com as chaves summary e category."
        },
        {
          role: "user",
          content:
            "Resuma em ate 3 linhas e classifique em reclamacao, duvida ou elogio.\n\nTexto:\n" + transcription
        }
      ]
    });

    const rawContent = completion.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(extractJsonObject(rawContent));

    if (!parsed.summary || !parsed.category) {
      throw new Error("JSON da análise incompleto.");
    }

    console.log("[upload] análise finalizada");
    return parsed;
  } catch (error) {
    throw new Error(`Erro na análise (Groq): ${error.message}`);
  }
}

module.exports = {
  transcribeAudio,
  analyzeTranscription
};
