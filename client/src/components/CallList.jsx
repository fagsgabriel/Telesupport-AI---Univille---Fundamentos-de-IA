function CallList({ calls, loading, error }) {
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
          {calls.map((call) => (
            <li key={call.id || call.file_name} className="call-item">
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
                <strong>Status:</strong> {call.status}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default CallList
