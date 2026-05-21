const { askQuestion } = require("../services/askService");

async function ask(req, res) {
  try {
    const question = req.query.q || req.body?.q;
    const data = await askQuestion(question);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Erro ao processar pergunta."
    });
  }
}

module.exports = {
  ask
};
