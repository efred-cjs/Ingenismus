import { useEffect, useMemo, useState } from 'react';
import { obtenerMediciones } from './services/mediciones';
import GraficaLecturas from './components/GraficaLecturas';

const participantes = [
  { code: 'P-0001', group: 'Sin diagnóstico', age: '7 años', status: 'Activo' },
  { code: 'P-0002', group: 'TEA nivel 1', age: '9 años', status: 'Pendiente' },
  { code: 'P-0003', group: 'Referencia indefinida', age: '8 años', status: 'Activo' }
];

const sesiones = [
  { code: 'S-0001', participant: 'P-0001', test: 'TestTactileAudio', state: 'En curso' },
  { code: 'S-0002', participant: 'P-0002', test: 'TestTactileAudio', state: 'Planificada' },
  { code: 'S-0003', participant: 'P-0003', test: 'TestTactileAudio', state: 'Finalizada' }
];

const vistas = [
  ['inicio', 'Inicio'], ['visualizacion', 'Visualización'],
  ['estadisticas', 'Estadísticas'], ['resultados', 'Resultados'],
  ['recoleccion', 'Recolección'], ['configuracion', 'Configuración']
];

function timestampDe(medicion) {
  const fecha = medicion?.fecha_servidor;
  if (typeof fecha === 'number') return fecha;
  if (typeof fecha === 'string') {
    const numero = Number(fecha);
    return Number.isNaN(numero) ? Date.parse(fecha) : numero;
  }
  return Number.NaN;
}

function horaDe(medicion) {
  const timestamp = timestampDe(medicion);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString()
    : 'hora desconocida';
}

function VideoPage({ tipo }) {
  const promedio = tipo === 'promedio';
  const video = promedio
    ? '/videos/ChoColat 쇼콜라 - Black Tinkerbell 블랙팅커벨 MV.mp4'
    : '/videos/TZUYU Run Away M V.mp4';
  const titulo = promedio ? 'Pacientes promedio' : 'Pacientes con TEA';
  return (
    <section className="page-content">
      <div className="page-heading">
        <p className="eyebrow">Prueba</p>
        <h2>{titulo}</h2>
        <p>Registro visual local para la observación del comportamiento de los sensores.</p>
      </div>
      <article className="panel video-panel">
        <h3>Video de {titulo.toLowerCase()}</h3>
        <video controls preload="metadata" src={video}>
          Tu navegador no puede reproducir este video.
        </video>
      </article>
    </section>
  );
}

function App() {
  const [mediciones, setMediciones] = useState([]);
  const [apiEstado, setApiEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [sensorId, setSensorId] = useState('1');
  const [vista, setVista] = useState('inicio');
  const [menuPrueba, setMenuPrueba] = useState(false);
  const [actualizada, setActualizada] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let activa = true;
    let temporizador;
    let controlador;

    const actualizar = async () => {
      controlador = new AbortController();
      try {
        const respuesta = await obtenerMediciones({ signal: controlador.signal });
        if (!activa) return;
        setMediciones(respuesta.mediciones);
        setApiEstado(respuesta.firebase === 'conectado' ? 'conectado' : 'desconocido');
        setActualizada(Date.now());
        setError(respuesta.firebase === 'conectado' ? '' : 'La API respondió, pero no confirmó la conexión con Firebase.');
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
      controlador?.abort();
    };
  }, [refreshKey]);

  useEffect(() => {
    document.querySelectorAll('video').forEach((video) => video.pause());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [vista]);

  const medicionesSensor = useMemo(
    () => mediciones.filter((dato) => Number(dato.sensor_id) === Number(sensorId)),
    [mediciones, sensorId]
  );
  const ultima = medicionesSensor[0];
  const reciente = (medicion) => {
    const timestamp = timestampDe(medicion);
    return Number.isFinite(timestamp) && Date.now() - timestamp <= 10000;
  };
  const estadoTexto = apiEstado === 'conectado'
    ? 'Conectado'
    : apiEstado === 'cargando' ? 'Conectando…' : apiEstado === 'desconocido' ? 'Sin confirmar' : 'Desconectado';

  const irA = (destino) => {
    setVista(destino);
    setMenuPrueba(false);
  };

  const navegacion = (
    <nav className="main-nav" aria-label="Navegación principal">
      {vistas.slice(0, 3).map(([id, texto]) => (
        <button key={id} className={`nav-item ${vista === id ? 'active' : ''}`} onClick={() => irA(id)}>{texto}</button>
      ))}
      <div className="nav-dropdown">
        <button className={`nav-item ${vista === 'promedio' || vista === 'tea' ? 'active' : ''}`} aria-expanded={menuPrueba} onClick={() => setMenuPrueba(!menuPrueba)}>
          Prueba <span aria-hidden="true">⌄</span>
        </button>
        {menuPrueba && <div className="dropdown-menu">
          <button onClick={() => irA('promedio')}>Pacientes promedio</button>
          <button onClick={() => irA('tea')}>Pacientes con TEA</button>
        </div>}
      </div>
      {vistas.slice(3).map(([id, texto]) => (
        <button key={id} className={`nav-item ${vista === id ? 'active' : ''}`} onClick={() => irA(id)}>{texto}</button>
      ))}
    </nav>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">Sistema de visualización de sensores</p><h1>Ingenismus</h1></div>
        <button className="primary-button" onClick={() => irA('recoleccion')}>Ir a recolección</button>
      </header>
      {navegacion}

      {vista === 'inicio' && <main className="layout-grid">
        <section className="panel overview-panel">
          <div className="panel-header"><h2>Estado del sistema</h2><span className={`badge ${apiEstado === 'conectado' ? 'success' : ''}`}>Firebase: {estadoTexto}</span></div>
          <div className="status-grid">
            {[
              { label: 'API local', value: estadoTexto, state: apiEstado === 'conectado' ? 'ok' : 'idle' },
              { label: 'Firebase', value: estadoTexto, state: apiEstado === 'conectado' ? 'ok' : 'idle' },
              { label: 'Visión artificial', value: 'No conectada', state: 'idle' },
              { label: 'ESP32', value: mediciones.some(reciente) ? 'Recibiendo datos' : 'Sin datos recientes', state: mediciones.some(reciente) ? 'ok' : 'warn' }
            ].map((item) => <div key={item.label} className="status-card"><span className={`dot ${item.state}`} /><div><strong>{item.label}</strong><p>{item.value}</p></div></div>)}
          </div>
          <p className="updated-at">{actualizada ? `Última consulta: ${new Date(actualizada).toLocaleTimeString()}` : 'Consultando el servicio…'}</p>
          {error && <p className="connection-message" role="status">{error}</p>}
        </section>

        <section className="panel stats-panel"><div className="panel-header"><h2>Resumen de lecturas</h2><button className="text-button" onClick={() => irA('estadisticas')}>Ver estadísticas</button></div>
          <div className="metrics"><div><span>Lecturas recibidas</span><strong>{mediciones.length}</strong></div><div><span>Última del sensor {sensorId}</span><strong className="metric-time">{ultima ? horaDe(ultima) : 'Sin datos'}</strong></div><div><span>Registro actual</span><strong>{ultima ? `MPU6050 ${ultima.sensor_id}` : 'Esperando'}</strong></div></div>
        </section>

        <section className="panel participants-panel"><div className="panel-header"><h2>Participantes</h2><span className="badge">Datos de demostración</span></div>
          <ul className="list-block">{participantes.map((p) => <li key={p.code}><div><strong>{p.code}</strong><span>{p.group}</span></div><small>{p.age}</small><span className="tag">{p.status}</span></li>)}</ul>
        </section>
        <section className="panel session-panel"><div className="panel-header"><h2>Sesiones</h2><span className="badge">Datos de demostración</span></div>
          <ul className="list-block compact">{sesiones.map((s) => <li key={s.code}><div><strong>{s.code}</strong><span>{s.participant}</span></div><small>{s.test}</small><span className="tag subtle">{s.state}</span></li>)}</ul>
        </section>

        <section className="panel side-panel"><div className="panel-header"><h2>Estado de sensores</h2><span className="badge">Consulta cada 2 s</span></div>
          <ul className="sensor-list">{[1, 2].map((id) => { const dato = mediciones.find((m) => Number(m.sensor_id) === id); return <li key={id}><span className={`dot ${dato && reciente(dato) ? 'ok' : 'warn'}`} /><div className="sensor-reading"><strong>MPU6050 {id}</strong><small>{dato ? horaDe(dato) : 'Sin lecturas'}</small><small>{dato ? `Acel. X ${dato.aceleracion_x} · Y ${dato.aceleracion_y} · Z ${dato.aceleracion_z}` : 'Esperando datos del sensor'}</small></div></li>; })}</ul>
        </section>
        <section className="panel event-panel"><div className="panel-header"><h2>Mediciones recientes</h2><button className="text-button" onClick={() => irA('resultados')}>Ver todas</button></div>
          {mediciones.length ? <ul className="event-feed">{mediciones.slice(0, 5).map((m) => <li key={m.id}>Sensor {m.sensor_id} · {horaDe(m)}</li>)}</ul> : <p className="empty-state">Las mediciones aparecerán cuando el ESP32 envíe datos.</p>}
        </section>
      </main>}

      {vista === 'visualizacion' && <main className="page-content">
        <div className="page-heading"><p className="eyebrow">Datos en vivo · últimos {mediciones.length} registros cargados</p><h2>Visualización</h2><p>Lecturas reales entregadas por la API desde Firebase Realtime Database.</p></div>
        <section className="panel chart-controls"><label htmlFor="sensor-select">Seleccionar sensor</label><select id="sensor-select" value={sensorId} onChange={(event) => setSensorId(event.target.value)}><option value="1">Sensor 1</option><option value="2">Sensor 2</option></select><span>{medicionesSensor.length} lecturas · actualización automática cada 2 s</span><button className="secondary-button" onClick={() => setRefreshKey((key) => key + 1)}>Actualizar datos</button></section>
        <section className="chart-grid"><GraficaLecturas mediciones={medicionesSensor} tipo="aceleracion"/><GraficaLecturas mediciones={medicionesSensor} tipo="giroscopio"/></section>
        <section className="panel readings-table"><div className="panel-header"><h3>Lecturas del sensor {sensorId}</h3><span className="badge">Fecha del servidor Firebase</span></div><div className="table-scroll"><table><thead><tr><th>Hora</th><th>Acel. X</th><th>Acel. Y</th><th>Acel. Z</th><th>Giro. X</th><th>Giro. Y</th><th>Giro. Z</th></tr></thead><tbody>{medicionesSensor.slice(0, 20).map((m) => <tr key={m.id}><td>{horaDe(m)}</td><td>{m.aceleracion_x}</td><td>{m.aceleracion_y}</td><td>{m.aceleracion_z}</td><td>{m.giroscopio_x}</td><td>{m.giroscopio_y}</td><td>{m.giroscopio_z}</td></tr>)}</tbody></table>{!medicionesSensor.length && <p className="empty-state">No hay lecturas para este sensor todavía.</p>}</div></section>
      </main>}

      {vista === 'estadisticas' && <main className="page-content"><div className="page-heading"><p className="eyebrow">Lecturas almacenadas</p><h2>Estadísticas</h2><p>Resumen calculado con los registros recibidos; no se muestran datos simulados.</p></div><section className="metrics stat-cards"><div><span>Total cargado</span><strong>{mediciones.length}</strong></div><div><span>Sensor 1</span><strong>{mediciones.filter((m) => Number(m.sensor_id) === 1).length}</strong></div><div><span>Sensor 2</span><strong>{mediciones.filter((m) => Number(m.sensor_id) === 2).length}</strong></div><div><span>Última lectura</span><strong className="metric-time">{mediciones[0] ? horaDe(mediciones[0]) : 'Sin datos'}</strong></div></section><section className="chart-grid"><GraficaLecturas mediciones={mediciones.filter((m) => Number(m.sensor_id) === 1)} tipo="aceleracion" titulo="Acelerómetro · Sensor 1"/><GraficaLecturas mediciones={mediciones.filter((m) => Number(m.sensor_id) === 2)} tipo="aceleracion" titulo="Acelerómetro · Sensor 2"/></section></main>}

      {vista === 'promedio' && <main><VideoPage tipo="promedio"/></main>}
      {vista === 'tea' && <main><VideoPage tipo="tea"/></main>}

      {vista === 'resultados' && <main className="page-content"><div className="page-heading"><p className="eyebrow">Datos de Firebase</p><h2>Resultados</h2><p>Registros más recientes recibidos por la API.</p></div><section className="panel readings-table"><div className="table-scroll"><table><thead><tr><th>Hora</th><th>Sensor</th><th>Acel. X</th><th>Acel. Y</th><th>Acel. Z</th><th>Giro. X</th><th>Giro. Y</th><th>Giro. Z</th></tr></thead><tbody>{mediciones.map((m) => <tr key={m.id}><td>{horaDe(m)}</td><td>{m.sensor_id}</td><td>{m.aceleracion_x}</td><td>{m.aceleracion_y}</td><td>{m.aceleracion_z}</td><td>{m.giroscopio_x}</td><td>{m.giroscopio_y}</td><td>{m.giroscopio_z}</td></tr>)}</tbody></table>{!mediciones.length && <p className="empty-state">No hay registros disponibles.</p>}</div></section></main>}

      {vista === 'recoleccion' && <main className="page-content"><div className="page-heading"><p className="eyebrow">Sesiones</p><h2>Recolección</h2><p>La captura de lecturas está activa mientras el ESP32 envía datos a la API.</p></div><section className="panel"><h3>Estado de la captura</h3><p className="connection-message">API: {estadoTexto} · ESP32: {mediciones.some(reciente) ? 'recibiendo lecturas' : 'sin lecturas recientes'}</p><button className="secondary-button" onClick={() => irA('visualizacion')}>Consultar lecturas</button></section></main>}

      {vista === 'configuracion' && <main className="page-content"><div className="page-heading"><p className="eyebrow">Conexión</p><h2>Configuración</h2><p>La configuración de red y Firebase se administra en el backend y el archivo de firmware.</p></div><section className="panel config-list"><div><strong>API del frontend</strong><code>/api/mediciones</code></div><div><strong>Proxy de desarrollo</strong><code>http://127.0.0.1:5000</code></div><div><strong>Puerto API</strong><code>HTTP_PORT (por defecto 5000)</code></div><div><strong>Base de datos</strong><code>FIREBASE_DATABASE_URL</code></div><div><strong>Credencial Firebase</strong><code>FIREBASE_SERVICE_ACCOUNT_FILE</code></div></section></main>}

      <footer className="app-footer">Ingenismus · Monitoreo de sensores MPU6050 · Firebase Realtime Database</footer>
    </div>
  );
}

export default App;
