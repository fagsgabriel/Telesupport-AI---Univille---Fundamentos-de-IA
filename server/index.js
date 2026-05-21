require("dotenv").config();
const app = require("./app");
const { initializeDatabase } = require("./database/database");
const { initializeRag } = require("./services/ragService");

async function bootstrap() {
  try {
    await initializeDatabase();
    await initializeRag();

    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
      console.log(`[server] rodando na porta ${port}`);
    });
  } catch (error) {
    console.error("[server] falha ao iniciar:", error.message);
    process.exit(1);
  }
}

bootstrap();
