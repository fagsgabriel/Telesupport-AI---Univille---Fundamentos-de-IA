import { useCallback, useEffect, useState } from 'react'
import Upload from './components/Upload'
import CallList from './components/CallList'
import './App.css'

const API_BASE_URL = 'http://localhost:3000'

function App() {
  const [calls, setCalls] = useState([])
  const [loadingCalls, setLoadingCalls] = useState(false)
  const [callsError, setCallsError] = useState('')

  const fetchCalls = useCallback(async () => {
    setLoadingCalls(true)
    setCallsError('')

    try {
      const response = await fetch(`${API_BASE_URL}/calls`)
      const result = await response.json()

      if (!response.ok || result.success !== true) {
        throw new Error(result?.error || 'Erro ao carregar chamadas')
      }

      const data = Array.isArray(result.data) ? result.data : []
      setCalls(data)
    } catch (error) {
      setCallsError(error.message || 'Erro de rede ao carregar chamadas')
    } finally {
      setLoadingCalls(false)
    }
  }, [])

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  return (
    <main className="app">
      <header className="app-header">
        <h1>TeleSupport AI</h1>
        <p>Análise inteligente de chamadas com transcrição, resumo e classificação.</p>
      </header>
      <Upload apiBaseUrl={API_BASE_URL} onUploadSuccess={fetchCalls} />
      <CallList calls={calls} loading={loadingCalls} error={callsError} />
    </main>
  )
}

export default App
