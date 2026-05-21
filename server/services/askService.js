const { generateRagAnswer } = require("./aiService");
const { semanticSearch } = require("./ragService");
const {
  synthesizeToFile,
  getPublicAudioUrl,
  cleanupOldTtsFiles
} = require("./ttsService");

async function askQuestion(question) {
  try {
    const normalizedQuestion = String(question || "").trim();
    if (!normalizedQuestion) {
      throw new Error("Parâmetro de pergunta q é obrigatório.");
    }

    console.log("[ask] pergunta recebida");
    const sources = await semanticSearch(normalizedQuestion, 5);
    console.log(`[ask] fontes encontradas: ${sources.length}`);

    if (sources.length === 0) {
      throw new Error(
        "Nenhuma chamada indexada no RAG. Envie e processe um áudio antes de perguntar."
      );
    }

    const answer = await generateRagAnswer(normalizedQuestion, sources);
    await cleanupOldTtsFiles();

    const { fileName } = await synthesizeToFile(answer);
    const audioUrl = getPublicAudioUrl(fileName);

    return {
      question: normalizedQuestion,
      answer,
      audioUrl,
      sources: sources.map((source) => ({
        callId: source.callId,
        fileName: source.fileName,
        category: source.category,
        summary: source.summary,
        distance: source.distance
      }))
    };
  } catch (error) {
    throw new Error(`Erro ao processar pergunta: ${error.message}`);
  }
}

module.exports = {
  askQuestion
};
