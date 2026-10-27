import { useEffect, useState } from 'react';
import { obtenerMediciones } from './services/mediciones';

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

const timestampDe = (medicion) => {
  const fecha = medicion?.fecha_servidor;
  if (typeof fecha === 'number') return fecha;
  if (typeof fecha === 'string') {
    const numero = Number(fecha);
    return Number.isNaN(numero) ? Date.parse(fecha) : numero;
  }
  return Number.NaN;
};

const horaDe = (medicion) => {
  const timestamp = timestampDe(medicion);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleTimeString()
    : 'hora desconocida';
};

function App() {
  const [mediciones, setMediciones] = useState([]);
  const [apiEstado, setApiEstado] = useState('cargando');
  const [error, setError] = useState('');

  useEffect(() => {
    let activa = true;
    let temporizador;
    const controlador = new AbortController();

    const actualizar = async () => {
      try {
        const respuesta = await obtenerMediciones({ signal: controlador.signal });
        if (!activa) return;
        setMediciones(respuesta.mediciones);
        setApiEstado('conectado');
        setError('');
      } catch (errorCarga) {
        if (!activa || errorCarga.name === 'AbortError') return;
        setApiEstado('desconectado');
        setError(errorCarga.message);
      } finally {
        if (activa) temporizador = window.setTimeout(actualizar, 2000);
      }
    };

    actualizar();
    return () => {
      activa = false;
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, []);

  const obtenerSensor = (id) => mediciones.find((medicion) => medicion.sensor_id === id);
  const sensorReciente = (medicion) => {
    const timestamp = timestampDe(medicion);
    return Number.isFinite(timestamp) && Date.now() - timestamp <= 10000;
  };
  const estadoTexto = apiEstado === 'conectado'
    ? 'Conectado'
    : apiEstado === 'cargando'
      ? 'Conectando...'
      : 'Sin conexión';
  const health = [
    { label: 'API local', value: estadoTexto, state: apiEstado === 'conectado' ? 'ok' : 'idle' },
    { label: 'Firebase', value: estadoTexto, state: apiEstado === 'conectado' ? 'ok' : 'idle' },
    { label: 'Visión artificial', value: 'No iniciada', state: 'idle' },
    {
      label: 'ESP32',
      value: mediciones.some(sensorReciente) ? 'Recibiendo datos' : 'Sin datos recientes',
      state: mediciones.some(sensorReciente) ? 'ok' : 'warn'
    }
  ];
  const sensores = [1, 2].map((id) => {
    const medicion = obtenerSensor(id);
    const estado = medicion && sensorReciente(medicion);
    return {
      id,
      label: `MPU6050 ${id}`,
      value: medicion
        ? `Acel. X ${medicion.aceleracion_x} · Y ${medicion.aceleracion_y} · Z ${medicion.aceleracion_z}`
        : 'Esperando mediciones',
      state: estado ? 'ok' : 'warn',
      hora: medicion ? horaDe(medicion) : ''
    };
  });

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
            <span className={`badge ${apiEstado === 'conectado' ? 'success' : ''}`}>
              {apiEstado === 'conectado' ? 'Firebase conectado' : 'Esperando conexión'}
            </span>
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
          {error && <p className="connection-message" role="status">{error}</p>}
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
            <span className="badge">Vista de demostración</span>
          </div>
          <div className="video-placeholder">
            <div className="video-overlay">
              <span>Espacio reservado para video</span>
              <strong>Video no conectado</strong>
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
            <span className="badge">Actualiza cada 2 s</span>
          </div>
          <ul className="sensor-list">
            {sensores.map((sensor) => (
              <li key={sensor.id}>
                <span className={`dot ${sensor.state}`} aria-hidden="true" />
                <div className="sensor-reading">
                  <strong>Sensor {sensor.id}</strong>
                  <small>{sensor.label} · {sensor.hora || 'sin lecturas'}</small>
                  <small>{sensor.value}</small>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="panel timeline-panel">
          <div className="panel-header">
            <h2>Línea temporal</h2>
          </div>
          <p className="empty-state">La línea temporal de sesiones aún no está conectada.</p>
        </section>

        <section className="panel event-panel">
          <div className="panel-header">
            <h2>Mediciones recientes</h2>
          </div>
          {mediciones.length > 0 ? (
            <ul className="event-feed">
              {mediciones.slice(0, 5).map((medicion) => (
                <li key={medicion.id}>
                  Sensor {medicion.sensor_id} · {horaDe(medicion)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Las mediciones aparecerán cuando el ESP32 o el simulador envíen datos.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
