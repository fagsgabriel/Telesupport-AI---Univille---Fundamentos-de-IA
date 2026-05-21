const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const databasePath = path.join(__dirname, "calls.db");

const db = new sqlite3.Database(databasePath, (error) => {
  if (error) {
    console.error("[database] erro ao conectar:", error.message);
    return;
  }

  console.log("[database] conectado ao SQLite");
});

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    try {
      db.run(query, params, function onRun(error) {
        if (error) {
          return reject(error);
        }

        resolve({ id: this.lastID, changes: this.changes });
      });
    } catch (error) {
      reject(error);
    }
  });
}

function get(query, params = []) {
  return new Promise((resolve, reject) => {
    try {
      db.get(query, params, (error, row) => {
        if (error) {
          return reject(error);
        }

        resolve(row || null);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    try {
      db.all(query, params, (error, rows) => {
        if (error) {
          return reject(error);
        }

        resolve(rows || []);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function initializeDatabase() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        hash TEXT NOT NULL,
        transcription TEXT,
        summary TEXT,
        category TEXT,
        status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await run(createTableQuery);
    await run("CREATE INDEX IF NOT EXISTS idx_calls_hash ON calls(hash)");
    await run("CREATE INDEX IF NOT EXISTS idx_calls_file_name ON calls(file_name)");
    console.log("[database] tabela calls pronta");
  } catch (error) {
    console.error("[database] erro ao inicializar:", error.message);
    throw error;
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initializeDatabase
};
