const express = require("express");
const healthRoutes = require("./routes/healthRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const callRoutes = require("./routes/callRoutes");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());
app.use("/", healthRoutes);
app.use("/", uploadRoutes);
app.use("/", callRoutes);

app.use((error, req, res, next) => {
  try {
    console.error("[server] erro não tratado:", error.message);
    return res.status(500).json({
      success: false,
      error: "Erro interno no servidor."
    });
  } catch (handlerError) {
    return res.status(500).json({
      success: false,
      error: handlerError.message
    });
  }
});

module.exports = app;
