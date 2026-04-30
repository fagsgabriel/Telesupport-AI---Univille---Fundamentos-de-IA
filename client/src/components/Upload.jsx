import { useState } from 'react'

const ACCEPTED_TYPES = '.mp3,.wav,.m4a,.ogg'

function Upload({ apiBaseUrl, onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0]
    setError('')
    setResult(null)

    if (!selectedFile) {
      setFile(null)
      return
    }

    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    const allowed = ['mp3', 'wav', 'm4a', 'ogg']

    if (!extension || !allowed.includes(extension)) {
      setFile(null)
      setError('Formato inválido. Envie apenas .mp3, .wav, .m4a ou .ogg.')
      return
    }

    setFile(selectedFile)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!file) {
      setError('Selecione um arquivo de áudio antes de enviar.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('audio', file)

      const response = await fetch(`${apiBaseUrl}/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok || data.success !== true) {
        throw new Error(data?.error || 'Erro ao enviar áudio')
      }

      setResult(data.data)
      setFile(null)
      event.target.reset()
      onUploadSuccess()
    } catch (requestError) {
      setError(requestError.message || 'Erro de rede durante o upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card">
      <h2>Upload de áudio</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !file}>
          {loading ? 'Enviando...' : 'Enviar áudio'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {result ? (
        <div className="result">
          <p>
            <strong>Transcription:</strong> {result.transcription}
          </p>
          <p>
            <strong>Summary:</strong> {result.summary}
          </p>
          <p>
            <strong>Category:</strong> {result.category}
          </p>
        </div>
      ) : null}
    </section>
  )
}

export default Upload
