const { ChromaClient } = require("chromadb");
const { listCalls } = require("./callService");

const COLLECTION_NAME = "telesupport_calls";
const fallbackIndex = new Map();

let chromaClient = null;
let chromaCollection = null;
let chromaEnabled = false;

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function scoreDocument(queryTokens, documentText) {
  const documentTokens = tokenize(documentText);
  if (documentTokens.length === 0) {
    return 0;
  }

  const querySet = new Set(queryTokens);
  let overlap = 0;

  for (const token of documentTokens) {
    if (querySet.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.sqrt(documentTokens.length);
}

function mapCallToSource(call, distance = null) {
  return {
    callId: call.callId ?? call.id,
    fileName: call.fileName ?? call.file_name,
    category: call.category,
    summary: call.summary,
    transcription: call.transcription,
    distance
  };
}

function upsertFallback(call) {
  const callId = Number(call.id);
  if (!callId || !call.transcription) {
    return;
  }

  fallbackIndex.set(`call-${callId}`, {
    id: `call-${callId}`,
    document: call.transcription,
    metadata: {
      callId,
      fileName: call.file_name,
      category: call.category || "",
      summary: call.summary || ""
    }
  });
}

async function indexCallInChroma(call) {
  const callId = Number(call.id);
  if (!callId || !call.transcription || !chromaCollection) {
    return;
  }

  await chromaCollection.upsert({
    ids: [`call-${callId}`],
    documents: [call.transcription],
    metadatas: [
      {
        callId,
        fileName: call.file_name,
        category: call.category || "",
        summary: call.summary || ""
      }
    ]
  });
}

async function indexCall(call) {
  try {
    if (!call?.id || !call.transcription) {
      console.warn("[rag] indexação ignorada: id ou transcrição ausente");
      return;
    }

    if (call.status && call.status !== "completed") {
      console.warn("[rag] indexação ignorada: status não é completed", call.id, call.status);
      return;
    }

    upsertFallback(call);

    if (chromaEnabled) {
      await indexCallInChroma(call);
    }

    console.log("[rag] chamada indexada:", call.id);
  } catch (error) {
    throw new Error(`Erro ao indexar chamada no RAG: ${error.message}`);
  }
}

function buildSearchableText(entry) {
  const summary = entry.metadata?.summary || "";
  const category = entry.metadata?.category || "";
  return `${entry.document} ${summary} ${category}`.trim();
}

async function searchFallback(query, limit) {
  const entries = Array.from(fallbackIndex.values());
  if (entries.length === 0) {
    return [];
  }

  const queryTokens = tokenize(query);
  const ranked = entries
    .map((entry) => ({
      entry,
      score: scoreDocument(queryTokens, buildSearchableText(entry))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map((item) =>
    mapCallToSource({
      id: item.entry.metadata.callId,
      file_name: item.entry.metadata.fileName,
      category: item.entry.metadata.category,
      summary: item.entry.metadata.summary,
      transcription: item.entry.document
    }, 1 - item.score)
  );
}

async function searchInChroma(query, limit) {
  const result = await chromaCollection.query({
    queryTexts: [query],
    nResults: limit
  });

  const ids = result.ids?.[0] || [];
  const documents = result.documents?.[0] || [];
  const metadatas = result.metadatas?.[0] || [];
  const distances = result.distances?.[0] || [];

  return ids.map((id, index) =>
    mapCallToSource(
      {
        id: metadatas[index]?.callId,
        file_name: metadatas[index]?.fileName,
        category: metadatas[index]?.category,
        summary: metadatas[index]?.summary,
        transcription: documents[index]
      },
      distances[index] ?? null
    )
  );
}

async function semanticSearch(query, limit = 5) {
  try {
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery) {
      throw new Error("Parâmetro de busca q é obrigatório.");
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 10));

    if (chromaEnabled) {
      try {
        const chromaResults = await searchInChroma(normalizedQuery, safeLimit);
        if (chromaResults.length > 0) {
          console.log(`[rag] busca ChromaDB: ${chromaResults.length} resultado(s)`);
          return chromaResults;
        }
        console.warn("[rag] ChromaDB sem resultados, usando índice local");
      } catch (error) {
        console.error("[rag] falha na busca ChromaDB, usando fallback local:", error.message);
      }
    }

    const fallbackResults = await searchFallback(normalizedQuery, safeLimit);
    console.log(
      `[rag] busca local: ${fallbackIndex.size} indexada(s), ${fallbackResults.length} resultado(s)`
    );
    return fallbackResults;
  } catch (error) {
    throw new Error(`Erro na busca semântica: ${error.message}`);
  }
}

async function syncAllCallsToIndex() {
  const calls = await listCalls();
  const completedCalls = calls.filter((call) => call.status === "completed" && call.transcription);

  fallbackIndex.clear();

  for (const call of completedCalls) {
    upsertFallback(call);
    if (chromaEnabled) {
      try {
        await indexCallInChroma(call);
      } catch (error) {
        console.error("[rag] erro ao sincronizar chamada", call.id, error.message);
      }
    }
  }

  console.log(`[rag] índice sincronizado com ${completedCalls.length} chamada(s)`);
}

async function initializeRag() {
  try {
    const chromaUrl = process.env.CHROMA_URL || "http://127.0.0.1:8000";
    chromaClient = new ChromaClient({ path: chromaUrl });
    await chromaClient.heartbeat();
    chromaCollection = await chromaClient.getOrCreateCollection({
      name: COLLECTION_NAME
    });
    chromaEnabled = true;
    console.log("[rag] ChromaDB conectado em", chromaUrl);
  } catch (error) {
    chromaEnabled = false;
    chromaClient = null;
    chromaCollection = null;
    console.warn("[rag] ChromaDB indisponível, usando índice local:", error.message);
  }

  await syncAllCallsToIndex();
}

module.exports = {
  initializeRag,
  indexCall,
  semanticSearch,
  syncAllCallsToIndex
};
