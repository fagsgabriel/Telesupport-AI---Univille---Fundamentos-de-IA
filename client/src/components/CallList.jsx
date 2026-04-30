import { useState } from 'react'

function CallList({ calls, loading, error }) {
  const [expandedCallId, setExpandedCallId] = useState(null)

  const toggleCallDetails = (callId) => {
    setExpandedCallId((currentId) => (currentId === callId ? null : callId))
  }

  return (
    <section className="card">
      <h2>Chamadas processadas</h2>

      {loading ? <p>Carregando chamadas...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && calls.length === 0 ? (
        <p>Nenhuma chamada encontrada.</p>
      ) : null}

      {!loading && !error && calls.length > 0 ? (
        <ul className="call-list">
          {calls.map((call, index) => {
            const callId = call.id ?? `${call.file_name}-${index}`
            const isExpanded = expandedCallId === callId

            return (
            <li
              key={callId}
              className={`call-item ${isExpanded ? 'call-item-expanded' : ''}`}
              onClick={() => toggleCallDetails(callId)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggleCallDetails(callId)
                }
              }}
            >
              <p>
                <strong>Arquivo:</strong> {call.file_name}
              </p>
              <p>
                <strong>Resumo:</strong> {call.summary}
              </p>
              <p>
                <strong>Categoria:</strong> {call.category}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`status-badge status-${call.status || "unknown"}`}>
                  {call.status || "unknown"}
                </span>
              </p>

              {isExpanded ? (
                <div className="call-context">
                  <p>
                    <strong>Contexto do áudio:</strong>
                  </p>
                  <p>{call.transcription || 'Sem transcrição disponível.'}</p>
                </div>
              ) : (
                <p className="call-context-hint">Clique para ver o contexto do áudio</p>
              )}
            </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

export default CallList
