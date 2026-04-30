const { get, all, run } = require("../database/database");

async function findExistingCall(hash, fileName) {
  try {
    const query = `
      SELECT id, file_name, hash, transcription, summary, category, status, created_at
      FROM calls
      WHERE hash = ? OR file_name = ?
      ORDER BY id DESC
      LIMIT 1
    `;

    return await get(query, [hash, fileName]);
  } catch (error) {
    throw new Error(`Erro ao buscar chamada existente: ${error.message}`);
  }
}

async function createProcessingCall(fileName, hash) {
  try {
    const insertQuery = `
      INSERT INTO calls (file_name, hash, status)
      VALUES (?, ?, 'processing')
    `;
    const result = await run(insertQuery, [fileName, hash]);

    return await getCallById(result.id);
  } catch (error) {
    throw new Error(`Erro ao criar chamada em processamento: ${error.message}`);
  }
}

async function updateCallCompleted(id, transcription, summary, category) {
  try {
    const updateQuery = `
      UPDATE calls
      SET transcription = ?, summary = ?, category = ?, status = 'completed'
      WHERE id = ?
    `;
    await run(updateQuery, [transcription, summary, category, id]);
    return await getCallById(id);
  } catch (error) {
    throw new Error(`Erro ao finalizar chamada: ${error.message}`);
  }
}

async function updateCallFailed(id) {
  try {
    const updateQuery = `
      UPDATE calls
      SET status = 'failed'
      WHERE id = ?
    `;
    await run(updateQuery, [id]);
    return await getCallById(id);
  } catch (error) {
    throw new Error(`Erro ao marcar chamada como falha: ${error.message}`);
  }
}

async function resetCallToProcessing(id, fileName, hash) {
  try {
    const updateQuery = `
      UPDATE calls
      SET file_name = ?, hash = ?, transcription = NULL, summary = NULL, category = NULL, status = 'processing'
      WHERE id = ?
    `;
    await run(updateQuery, [fileName, hash, id]);
    return await getCallById(id);
  } catch (error) {
    throw new Error(`Erro ao resetar chamada para processamento: ${error.message}`);
  }
}

async function getCallById(id) {
  try {
    const query = `
      SELECT id, file_name, hash, transcription, summary, category, status, created_at
      FROM calls
      WHERE id = ?
      LIMIT 1
    `;
    return await get(query, [id]);
  } catch (error) {
    throw new Error(`Erro ao buscar chamada por id: ${error.message}`);
  }
}

async function listCalls() {
  try {
    const query = `
      SELECT id, file_name, hash, transcription, summary, category, status, created_at
      FROM calls
      ORDER BY datetime(created_at) DESC, id DESC
    `;
    return await all(query);
  } catch (error) {
    throw new Error(`Erro ao listar chamadas: ${error.message}`);
  }
}

module.exports = {
  findExistingCall,
  createProcessingCall,
  updateCallCompleted,
  updateCallFailed,
  resetCallToProcessing,
  listCalls
};
