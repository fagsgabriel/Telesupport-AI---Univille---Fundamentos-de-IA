async function getHealth(req, res) {
  try {
    return res.status(200).json({ status: "ok" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Erro no health check: ${error.message}`
    });
  }
}

module.exports = {
  getHealth
};
