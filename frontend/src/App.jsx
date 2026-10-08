const health = [
  { label: 'Backend', value: 'Conectado', state: 'ok' },
  { label: 'Base de datos', value: 'Simulada', state: 'warn' },
  { label: 'Visión artificial', value: 'No iniciada', state: 'idle' },
  { label: 'ESP32', value: 'No conectado', state: 'idle' }
];

const participants = [
  { code: 'P-0001', group: 'Sin diagnóstico', age: '7 años', status: 'Activo' },
  { code: 'P-0002', group: 'TEA nivel 1', age: '9 años', status: 'Pendiente' },
  { code: 'P-0003', group: 'Referencia indefinida', age: '8 años', status: 'Activo' }
];

const sessions = [
  { code: 'S-0001', participant: 'P-0001', test: 'TestTactileAudio', state: 'En curso' },
  { code: 'S-0002', participant: 'P-0002', test: 'TestTactileAudio', state: 'Planificada' },
  { code: 'S-0003', participant: 'P-0003', test: 'TestTactileAudio', state: 'Finalizada' }
];

const sensors = [
  { id: 'M1', label: 'Muñeca izquierda', value: 'Estable', state: 'ok' },
  { id: 'M2', label: 'Muñeca derecha', value: 'Estable', state: 'ok' },
  { id: 'M3', label: 'Pierna izquierda', value: 'Simulado', state: 'warn' },
  { id: 'M4', label: 'Pierna derecha', value: 'Simulado', state: 'warn' }
];

const timeline = [
  { time: '00:00', phase: 'Línea base', detail: 'Observación inicial' },
  { time: '00:15', phase: 'Estímulo', detail: 'A-001 / audio' },
  { time: '00:25', phase: 'Observación', detail: 'Cambio facial observado' },
  { time: '00:40', phase: 'Recuperación', detail: 'Fin del evento' }
];

const eventFeed = [
  'Inicio de sesión registrado.',
  'Estímulo auditivo A-001 programado.',
  'Movimiento detectado en sensor M2.',
  'Evento manual marcado por observador.',
  'Sesión pausada por control del operador.'
];

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Sistema experimental</p>
          <h1>Ingenismus</h1>
        </div>
        <button className="primary-button">Iniciar nueva sesión</button>
      </header>

      <nav className="main-nav" aria-label="Navegación principal">
        <button className="nav-item active">Inicio</button>
        <button className="nav-item">Participantes</button>
        <button className="nav-item">Prueba</button>
        <button className="nav-item">Recolección</button>
        <button className="nav-item">Resultados</button>
        <button className="nav-item">Configuración</button>
      </nav>

      <main className="layout-grid">
        <section className="panel overview-panel">
          <div className="panel-header">
            <h2>Estado del sistema</h2>
            <span className="badge">Modo simulado</span>
          </div>
          <div className="status-grid">
            {health.map((item) => (
              <div key={item.label} className="status-card">
                <span className={`dot ${item.state}`} aria-hidden="true" />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel stats-panel">
          <div className="panel-header">
            <h2>Resumen</h2>
          </div>
          <div className="metrics">
            <div>
              <span>Participantes</span>
              <strong>24</strong>
            </div>
            <div>
              <span>Sesiones</span>
              <strong>38</strong>
            </div>
            <div>
              <span>Prueba</span>
              <strong>TestTactileAudio</strong>
            </div>
          </div>
        </section>

        <section className="panel participants-panel">
          <div className="panel-header">
            <h2>Participantes</h2>
            <button className="secondary-button">Nuevo participante</button>
          </div>
          <ul className="list-block">
            {participants.map((participant) => (
              <li key={participant.code}>
                <div>
                  <strong>{participant.code}</strong>
                  <span>{participant.group}</span>
                </div>
                <small>{participant.age}</small>
                <span className="tag">{participant.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel session-panel">
          <div className="panel-header">
            <h2>Sesiones</h2>
            <button className="secondary-button">Ver historial</button>
          </div>
          <ul className="list-block compact">
            {sessions.map((session) => (
              <li key={session.code}>
                <div>
                  <strong>{session.code}</strong>
                  <span>{session.participant}</span>
                </div>
                <small>{session.test}</small>
                <span className="tag subtle">{session.state}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel collection-panel">
          <div className="panel-header">
            <h2>Recolección</h2>
            <span className="badge success">Grabando</span>
          </div>

          <div className="video-placeholder">
            <div className="video-overlay">
              <span>Video de la caricatura</span>
              <strong>00:24.8 / 01:32.0</strong>
            </div>
          </div>

          <div className="phase-strip">
            <span className="phase active">Línea base</span>
            <span className="phase">Estímulo</span>
            <span className="phase">Observación</span>
            <span className="phase">Recuperación</span>
          </div>
        </section>

        <aside className="panel side-panel">
          <div className="panel-header">
            <h2>Estado de sensores</h2>
          </div>
          <ul className="sensor-list">
            {sensors.map((sensor) => (
              <li key={sensor.id}>
                <span className={`dot ${sensor.state}`} aria-hidden="true" />
                <div>
                  <strong>{sensor.id}</strong>
                  <small>{sensor.label}</small>
                </div>
                <span>{sensor.value}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="panel timeline-panel">
          <div className="panel-header">
            <h2>Línea temporal</h2>
          </div>
          <div className="timeline-list">
            {timeline.map((step) => (
              <div key={step.time} className="timeline-item">
                <span>{step.time}</span>
                <div>
                  <strong>{step.phase}</strong>
                  <small>{step.detail}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel event-panel">
          <div className="panel-header">
            <h2>Eventos recientes</h2>
            <button className="secondary-button">Marcar evento</button>
          </div>
          <ul className="event-feed">
            {eventFeed.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
