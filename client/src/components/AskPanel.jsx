import { useEffect, useRef, useState } from 'react'

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function AskPanel({ apiBaseUrl }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const audioRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor()
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return undefined
    }

    setSpeechSupported(true)
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let transcript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript
      }
      setQuestion(transcript.trim())
    }

    recognition.onerror = (speechError) => {
      setIsListening(false)

      if (speechError.error === 'not-allowed') {
        setError('Permissão do microfone negada. Autorize o acesso no navegador.')
        return
      }

      if (speechError.error === 'no-speech') {
        setError('Nenhuma fala detectada. Tente gravar novamente.')
        return
      }

      if (speechError.error !== 'aborted') {
        setError(`Erro no reconhecimento de voz: ${speechError.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.abort()
      recognitionRef.current = null
    }
  }, [])

  const handleToggleRecording = () => {
    const recognition = recognitionRef.current

    if (!recognition) {
      setError('Reconhecimento de voz não suportado. Use o Google Chrome.')
      return
    }

    if (isListening) {
      recognition.stop()
      setIsListening(false)
      return
    }

    setError('')

    try {
      recognition.start()
      setIsListening(true)
    } catch (startError) {
      setIsListening(false)
      setError('Não foi possível iniciar a gravação. Aguarde e tente novamente.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const normalizedQuestion = question.trim()
    if (!normalizedQuestion) {
      setError('Digite ou grave uma pergunta antes de enviar.')
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
        Faça uma pergunta por texto ou voz sobre as chamadas processadas. A resposta será
        gerada com contexto semântico e convertida em áudio.
      </p>

      <form className="ask-form" onSubmit={handleSubmit}>
        <input
          className="ask-input"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ex.: Quais chamadas foram reclamações sobre atraso?"
          disabled={loading || isListening}
        />
        <button
          type="button"
          className="listen-button"
          onClick={handleToggleRecording}
          disabled={loading || !speechSupported}
          style={isListening ? { background: '#b91c1c', borderColor: '#ef4444' } : undefined}
        >
          {isListening ? 'Parar gravação' : 'Gravar pergunta'}
        </button>
        <button type="submit" disabled={loading || isListening || !question.trim()}>
          {loading ? 'Consultando...' : 'Perguntar'}
        </button>
      </form>

      {isListening ? (
        <p className="ask-description" style={{ color: '#93c5fd', marginTop: 10 }}>
          Ouvindo... fale sua pergunta. O texto será preenchido automaticamente.
        </p>
      ) : null}

      {!speechSupported ? (
        <p className="ask-description" style={{ marginTop: 10 }}>
          Gravação por voz disponível no Google Chrome (Web Speech API).
        </p>
      ) : null}

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
