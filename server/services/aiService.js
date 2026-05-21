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

async function generateRagAnswer(question, sources) {
  try {
    ensureGroqConfigured();
    console.log("[ask] geração de resposta iniciada");

    const contextBlock = sources
      .map((source, index) => {
        return (
          `Fonte ${index + 1} (chamada ${source.callId}, arquivo ${source.fileName}, categoria ${source.category}):\n` +
          `Resumo: ${source.summary || "sem resumo"}\n` +
          `Transcrição: ${source.transcription}`
        );
      })
      .join("\n\n");

    const model = process.env.GROQ_CHAT_MODEL || "llama-3.1-8b-instant";
    const completion = await groqClient.chat.completions.create({
      model,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "Voce e assistente da TeleSupport Angola. As fontes abaixo ja foram recuperadas como relevantes para a pergunta.\n\n" +
            "Instrucoes:\n" +
            "- Responda usando SOMENTE fatos presentes nas transcricoes e resumos fornecidos.\n" +
            "- Extraia da transcricao o maximo de detalhe util: motivo do contato, pedido do cliente, problema, categoria e conclusao.\n" +
            "- Se a pergunta for ampla (ex.: o que aconteceu, resumo, detalhes), sintetize o conteudo das fontes de forma clara.\n" +
            "- NAO seja conservador: se houver texto nas fontes, responda com base nele.\n" +
            "- Evite frases como 'nao encontrei informacao suficiente' quando as fontes contiverem transcricao ou resumo utilizavel.\n" +
            "- So diga que falta informacao se as fontes estiverem vazias ou nao mencionarem nada relacionado a pergunta.\n" +
            "- Responda em portugues, tom profissional, direto, em ate 5 frases."
        },
        {
          role: "user",
          content:
            `Pergunta do usuario: ${question}\n\n` +
            `Fontes recuperadas pelo RAG (use estas informacoes para responder):\n${contextBlock}\n\n` +
            "Com base nas fontes acima, responda a pergunta de forma direta e completa."
        }
      ]
    });

    const answer = String(completion.choices?.[0]?.message?.content || "").trim();
    if (!answer) {
      throw new Error("Resposta vazia retornada pela IA.");
    }

    console.log("[ask] geração de resposta finalizada");
    return answer;
  } catch (error) {
    throw new Error(`Erro na geração de resposta RAG (Groq): ${error.message}`);
  }
}

module.exports = {
  transcribeAudio,
  analyzeTranscription,
  generateRagAnswer
};
