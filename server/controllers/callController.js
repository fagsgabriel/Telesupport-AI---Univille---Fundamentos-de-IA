const { listCalls } = require("../services/callService");

async function getCalls(req, res) {
  try {
    const calls = await listCalls();
    return res.status(200).json({
      success: true,
      data: calls
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao listar chamadas."
    });
  }
}

module.exports = {
  getCalls
};
