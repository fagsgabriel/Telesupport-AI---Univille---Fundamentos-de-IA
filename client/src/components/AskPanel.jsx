import { useRef, useState } from 'react'

function AskPanel({ apiBaseUrl }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const audioRef = useRef(null)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedQuestion = question.trim()
    if (!normalizedQuestion) {
      setError('Digite uma pergunta antes de enviar.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(
        `${apiBaseUrl}/ask?q=${encodeURIComponent(normalizedQuestion)}`
      )
      const data = await response.json()

      if (!response.ok || data.success !== true) {
        throw new Error(data?.error || 'Erro ao consultar o RAG')
      }

      setResult(data.data)
    } catch (requestError) {
      setError(requestError.message || 'Erro de rede ao consultar o RAG')
    } finally {
      setLoading(false)
    }
  }

  const handleListen = () => {
    if (!result?.audioUrl) {
      return
    }

    const audioUrl = `${apiBaseUrl}${result.audioUrl}`

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = audioUrl
      audioRef.current.play().catch(() => {
        setError('Não foi possível reproduzir o áudio da resposta.')
      })
      return
    }

    const fallbackAudio = new Audio(audioUrl)
    fallbackAudio.play().catch(() => {
      setError('Não foi possível reproduzir o áudio da resposta.')
    })
  }

  return (
    <section className="card">
      <h2>Consulta RAG com áudio</h2>
      <p className="ask-description">
        Faça uma pergunta sobre as chamadas processadas. A resposta será gerada com
        contexto semântico e convertida em áudio.
      </p>

      <form className="ask-form" onSubmit={handleSubmit}>
        <input
          className="ask-input"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ex.: Quais chamadas foram reclamações sobre atraso?"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? 'Consultando...' : 'Perguntar'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {result ? (
        <div className="ask-result">
          <p>
            <strong>Pergunta:</strong> {result.question}
          </p>
          <p>
            <strong>Resposta:</strong> {result.answer}
          </p>

          <div className="ask-audio-actions">
            <button type="button" className="listen-button" onClick={handleListen}>
              Ouvir resposta
            </button>
            {result.audioUrl ? (
              <audio
                ref={audioRef}
                controls
                src={`${apiBaseUrl}${result.audioUrl}`}
                className="ask-audio-player"
              />
            ) : null}
          </div>

          {Array.isArray(result.sources) && result.sources.length > 0 ? (
            <div className="ask-sources">
              <p>
                <strong>Fontes usadas:</strong>
              </p>
              <ul>
                {result.sources.map((source) => (
                  <li key={`${source.callId}-${source.fileName}`}>
                    Chamada #{source.callId} — {source.fileName} ({source.category})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default AskPanel
