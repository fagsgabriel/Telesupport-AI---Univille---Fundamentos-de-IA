const { semanticSearch } = require("../services/ragService");

async function search(req, res) {
  try {
    const query = req.query.q;
    const limit = req.query.limit;
    const results = await semanticSearch(query, limit);

    return res.status(200).json({
      success: true,
      data: {
        query: String(query || "").trim(),
        results
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Erro na busca semântica."
    });
  }
}

module.exports = {
  search
};
