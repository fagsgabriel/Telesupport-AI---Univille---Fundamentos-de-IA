# TeleSupport AI

Sistema fullstack para análise de chamadas de call center com IA.

## Features

- Upload de áudio (`.mp3`, `.wav`, `.m4a`, `.ogg`)
- Transcrição automática da chamada
- Resumo da conversa (curto)
- Classificação da chamada (`reclamacao`, `duvida`, `elogio`)
- Listagem de chamadas processadas
- Persistência em SQLite

## Stack

- Backend: Node.js + Express
- Frontend: React + Vite
- Banco: SQLite
- IA: Groq (STT + análise textual)

## Estrutura

```text
/server
/client
```

## API

### `GET /health`

Retorna status da API:

```json
{ "status": "ok" }
```

### `POST /upload`

Recebe áudio via `form-data` no campo `audio`.

Resposta de sucesso:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "file_name": "audio.mp3",
    "transcription": "...",
    "summary": "...",
    "category": "duvida",
    "status": "completed",
    "created_at": "..."
  }
}
```

Resposta de erro:

```json
{
  "success": false,
  "error": "mensagem"
}
```

### `GET /calls`

Retorna lista de chamadas processadas:

```json
{
  "success": true,
  "data": []
}
```

## Como rodar

### 1) Backend

```bash
cd server
npm install
```

Crie `server/.env`:

```env
PORT=3000
GROQ_API_KEY=sua_chave_aqui
GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo
GROQ_CHAT_MODEL=llama-3.1-8b-instant
```

Inicie:

```bash
npm run dev
```

### 2) Frontend

```bash
cd client
npm install
npm run dev
```

Frontend local: `http://localhost:5173`  
Backend local: `http://localhost:3000`

## Observações

- Nunca commitar chaves de API ou arquivos `.env`.
- O diretório `server/uploads` é temporário; os arquivos são removidos após processamento.
