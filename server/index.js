require("dotenv").config();
const app = require("./app");
const { initializeDatabase } = require("./database/database");

async function bootstrap() {
  try {
    await initializeDatabase();

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
