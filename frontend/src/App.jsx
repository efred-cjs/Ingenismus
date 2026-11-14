import { useEffect, useMemo, useState } from 'react';
import { cambiarModo, cerrarSesion, iniciarSesion, obtenerPanel } from './services/mediciones';
import GraficaLecturas from './components/GraficaLecturas';

const vistas = [
  ['inicio', 'Inicio'], ['visualizacion', 'Visualización'], ['estadisticas', 'Estadísticas'],
  ['resultados', 'Resultados'], ['recoleccion', 'Recolección'], ['configuracion', 'Configuración']
];

function timestampDe(medicion) {
  const fecha = medicion?.fecha_servidor;
  if (typeof fecha === 'number') return fecha;
  if (typeof fecha === 'string') return Number.isNaN(Number(fecha)) ? Date.parse(fecha) : Number(fecha);
  return Number.NaN;
}

function horaDe(medicion) {
  const timestamp = timestampDe(medicion);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Hora desconocida';
}

function VideoPage({ tipo, sesion, lecturas, modo, apiEstado, accionando, error, onIniciar }) {
  const promedio = tipo === 'promedio';
  const titulo = promedio ? 'Pacientes promedio' : 'Pacientes con TEA';
  const pruebaActiva = sesion?.prueba === tipo;
  return <main className="page-content"><div className="page-heading"><p className="eyebrow">Prueba visual</p><h2>{titulo}</h2><p>Video local de referencia conservado del sitio anterior.</p></div>
    <section className="panel video-panel"><h3>{titulo}</h3><video controls preload="metadata" src="/videos/CaricaturaPruebas.mp4">Tu navegador no puede reproducir este video.</video>
      <div className="test-controls"><button className="primary-button" disabled={accionando || apiEstado !== 'conectado' || Boolean(sesion)} onClick={() => onIniciar(tipo)}>{pruebaActiva ? 'Prueba en curso' : 'Iniciar prueba'}</button>
        <p>{pruebaActiva ? `Sesión ${sesion.id}: ${lecturas} lecturas recibidas del ESP32.` : sesion ? `Hay otra sesión activa (${sesion.prueba || 'recolección'}). Ciérrala en Recolección para iniciar esta prueba.` : modo !== 'esp32' ? 'Al iniciar, el sistema cambiará a ESP32 real y abrirá una sesión para esta prueba.' : 'Al iniciar, se abrirá una sesión y el backend empezará a guardar las lecturas que envíe el ESP32.'}</p>
      </div>{error && <p className="connection-message" role="alert">{error}</p>}
    </section></main>;
}

function App() {
  const [panel, setPanel] = useState({ mediciones: [], sesiones: [], modo: 'esp32', sesion_activa: null });
  const [apiEstado, setApiEstado] = useState('cargando');
  const [error, setError] = useState('');
  const [vista, setVista] = useState('inicio');
  const [menuPrueba, setMenuPrueba] = useState(false);
  const [sensorId, setSensorId] = useState('1');
  const [sesionId, setSesionId] = useState('actual');
  const [actualizada, setActualizada] = useState(null);
  const [accionando, setAccionando] = useState(false);

  useEffect(() => {
    let activa = true;
    let temporizador;
    let controlador;
    const actualizar = async () => {
      controlador = new AbortController();
      try {
        const datos = await obtenerPanel({ signal: controlador.signal });
        if (!activa) return;
        setPanel(datos);
        setApiEstado(datos.firebase === 'conectado' ? 'conectado' : 'desconocido');
        setActualizada(Date.now());
        setError(datos.firebase === 'conectado' ? '' : 'El backend no confirmó Firebase.');
      } catch (fallo) {
        if (!activa || fallo.name === 'AbortError') return;
        setApiEstado('desconectado');
        setError(fallo.message);
      } finally {
        if (activa) temporizador = window.setTimeout(actualizar, 2000);
      }
    };
    actualizar();
    return () => { activa = false; window.clearTimeout(temporizador); controlador?.abort(); };
  }, []);

  useEffect(() => {
    document.querySelectorAll('video').forEach((video) => video.pause());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [vista]);

  const modo = panel.modo === 'simulado' ? 'simulado' : 'esp32';
  const activa = panel.sesion_activa;
  const sesionSeleccionada = sesionId === 'actual'
    ? activa
    : (panel.sesiones || []).find((sesion) => sesion.id === sesionId);
  const modoDatos = sesionSeleccionada?.modo || modo;
  const registrosModo = useMemo(
    () => panel.mediciones.filter((dato) => dato.fuente === modoDatos || (!dato.fuente && modoDatos === 'esp32')),
    [panel.mediciones, modoDatos]
  );
  const sesiones = panel.sesiones || [];
  const registrosSesion = useMemo(() => {
    if (sesionId === 'sin-sesion') return registrosModo.filter((dato) => !dato.sesion_id);
    return sesionSeleccionada?.id
      ? registrosModo.filter((dato) => dato.sesion_id === sesionSeleccionada.id)
      : [];
  }, [registrosModo, sesionSeleccionada, sesionId]);
  const medicionesSensor = useMemo(
    () => registrosSesion.filter((dato) => Number(dato.sensor_id) === Number(sensorId)),
    [registrosSesion, sensorId]
  );
  const reciente = (dato) => {
    const timestamp = timestampDe(dato);
    return Number.isFinite(timestamp) && Date.now() - timestamp <= 10000;
  };
  const estadoTexto = apiEstado === 'conectado' ? 'Conectado'
    : apiEstado === 'cargando' ? 'Conectando…'
      : apiEstado === 'desconocido' ? 'Sin confirmar' : 'Desconectado';
  const datosRecientes = panel.mediciones.some((dato) =>
    (dato.fuente === modo || (!dato.fuente && modo === 'esp32')) && reciente(dato)
  );
  const lecturasPrueba = activa
    ? panel.mediciones.filter((dato) => dato.sesion_id === activa.id).length
    : 0;

  async function ejecutarAccion(accion) {
    setAccionando(true);
    setError('');
    try {
      await accion();
      const datos = await obtenerPanel();
      setPanel(datos);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setAccionando(false);
    }
  }

  async function iniciarPrueba(tipo) {
    await ejecutarAccion(async () => {
      if (activa) throw new Error('Cierra la sesión activa antes de iniciar otra prueba.');
      if (modo !== 'esp32') await cambiarModo('esp32');
      await iniciarSesion(tipo);
    });
  }

  function irA(destino) { setVista(destino); }

  return <div className="app-shell">
    <header className="topbar">
      <div><p className="eyebrow">Sistema de visualización de sensores</p><h1>Ingenismus</h1></div>
      <button className="primary-button" onClick={() => irA('recoleccion')}>Ir a recolección</button>
    </header>
    <nav className="main-nav" aria-label="Navegación principal">
      {vistas.slice(0, 3).map(([id, texto]) => <button key={id} className={`nav-item ${vista === id ? 'active' : ''}`} onClick={() => irA(id)}>{texto}</button>)}
      <div className="nav-dropdown"><button className={`nav-item ${['promedio', 'tea'].includes(vista) ? 'active' : ''}`} aria-expanded={menuPrueba} onClick={() => setMenuPrueba(!menuPrueba)}>Prueba</button>
        {menuPrueba && <div className="dropdown-menu"><button onClick={() => { setVista('promedio'); setMenuPrueba(false); }}>Pacientes promedio</button><button onClick={() => { setVista('tea'); setMenuPrueba(false); }}>Pacientes con TEA</button></div>}
      </div>
      {vistas.slice(3).map(([id, texto]) => <button key={id} className={`nav-item ${vista === id ? 'active' : ''}`} onClick={() => irA(id)}>{texto}</button>)}
    </nav>

    {vista === 'inicio' && <main className="layout-grid">
      <section className="panel overview-panel">
        <div className="panel-header"><h2>Estado del sistema</h2><span className={`badge ${apiEstado === 'conectado' ? 'success' : ''}`}>API y Firebase: {estadoTexto}</span></div>
        <div className="status-grid">
          <Status label="Modo activo" value={modo === 'simulado' ? 'Simulación' : 'ESP32 real'} state="ok" />
          <Status label="Firebase" value={estadoTexto} state={apiEstado === 'conectado' ? 'ok' : 'warn'} />
          <Status label="Visión artificial" value="No configurada" state="idle" />
          <Status label={modo === 'simulado' ? 'Simulador' : 'ESP32'} value={datosRecientes ? 'Recibiendo lecturas' : 'Sin lecturas recientes'} state={datosRecientes ? 'ok' : 'warn'} />
        </div>
        <p className="updated-at">{actualizada ? `Última consulta: ${new Date(actualizada).toLocaleTimeString()}` : 'Consultando al backend…'}</p>
        {error && <p className="connection-message" role="status">{error}</p>}
      </section>
      <section className="panel stats-panel"><div className="panel-header"><h2>Resumen de la fuente activa</h2><button className="text-button" onClick={() => irA('estadisticas')}>Ver estadísticas</button></div>
        <div className="metrics"><div><span>Lecturas de esta sesión</span><strong>{registrosSesion.length}</strong></div><div><span>Última lectura</span><strong className="metric-time">{registrosSesion[0] ? horaDe(registrosSesion[0]) : 'Sin datos'}</strong></div><div><span>Sesión actual</span><strong className="metric-time">{activa ? activa.id : 'Sin sesión'}</strong></div></div>
      </section>
      <section className="panel session-panel"><div className="panel-header"><h2>Sesiones registradas</h2><span className="badge">Historial de Firebase</span></div>
        {sesiones.length ? <ul className="list-block compact">{sesiones.slice(0, 6).map((s) => <li key={s.id}><div><strong>{s.id}</strong><span>{s.modo === 'simulado' ? 'Simulación' : 'ESP32 real'}</span></div><small>{new Date(s.inicio).toLocaleString()}</small><span className="tag subtle">{s.estado}</span></li>)}</ul> : <p className="empty-state">No hay sesiones guardadas.</p>}
      </section>
      <section className="panel side-panel"><div className="panel-header"><h2>Estado de sensores</h2><span className="badge">Consulta cada 2 s</span></div>
        <ul className="sensor-list">{[1, 2].map((id) => { const dato = registrosModo.find((item) => Number(item.sensor_id) === id); return <li key={id}><span className={`dot ${dato && reciente(dato) ? 'ok' : 'warn'}`} /><div className="sensor-reading"><strong>MPU6050 {id}</strong><small>{dato ? horaDe(dato) : 'Sin lecturas'}</small><small>{dato ? `Acel. X ${dato.aceleracion_x} · Y ${dato.aceleracion_y} · Z ${dato.aceleracion_z}` : 'Esperando datos del modo activo'}</small></div></li>; })}</ul>
      </section>
      <section className="panel event-panel"><div className="panel-header"><h2>Lecturas recientes</h2><button className="text-button" onClick={() => irA('resultados')}>Ver registros</button></div>
        {registrosSesion.length ? <ul className="event-feed">{registrosSesion.slice(0, 5).map((dato) => <li key={dato.id}>Sensor {dato.sensor_id} · {horaDe(dato)}</li>)}</ul> : <p className="empty-state">Inicia una sesión y espera lecturas del modo activo.</p>}
      </section>
    </main>}

    {vista === 'visualizacion' && <main className="page-content">
      <div className="page-heading"><p className="eyebrow">Modo {modoDatos} · {registrosSesion.length} registros</p><h2>Visualización</h2><p>Gráficas, mediciones y tabla consumen el mismo conjunto filtrado por modo y sesión.</p></div>
      <section className="panel chart-controls"><label htmlFor="sensor-select">Sensor</label><select id="sensor-select" value={sensorId} onChange={(event) => setSensorId(event.target.value)}><option value="1">MPU6050 1</option><option value="2">MPU6050 2</option></select><label htmlFor="session-select">Sesión</label><SessionSelect id="session-select" sesiones={sesiones} value={sesionId} onChange={setSesionId} activa={activa} haySinSesion={registrosModo.some((dato) => !dato.sesion_id)} /><span>{medicionesSensor.length} lecturas</span></section>
      <section className="chart-grid"><GraficaLecturas mediciones={medicionesSensor} tipo="aceleracion" titulo={`Acelerómetro · Sensor ${sensorId}`} /><GraficaLecturas mediciones={medicionesSensor} tipo="giroscopio" titulo={`Giroscopio · Sensor ${sensorId}`} /></section>
      <ReadingsTable mediciones={medicionesSensor} sensor />
    </main>}

    {vista === 'estadisticas' && <main className="page-content"><div className="page-heading"><p className="eyebrow">Modo {modoDatos} · misma sesión seleccionada</p><h2>Estadísticas</h2><p>Conteos calculados sobre los registros visibles de la sesión.</p></div>
      <section className="panel chart-controls"><label htmlFor="stats-session">Sesión</label><SessionSelect id="stats-session" sesiones={sesiones} value={sesionId} onChange={setSesionId} activa={activa} haySinSesion={registrosModo.some((dato) => !dato.sesion_id)} /></section>
      <section className="metrics stat-cards"><div><span>Total de lecturas</span><strong>{registrosSesion.length}</strong></div><div><span>MPU6050 1</span><strong>{registrosSesion.filter((m) => Number(m.sensor_id) === 1).length}</strong></div><div><span>MPU6050 2</span><strong>{registrosSesion.filter((m) => Number(m.sensor_id) === 2).length}</strong></div><div><span>Última lectura</span><strong className="metric-time">{registrosSesion[0] ? horaDe(registrosSesion[0]) : 'Sin datos'}</strong></div></section>
      <section className="chart-grid"><GraficaLecturas mediciones={registrosSesion.filter((m) => Number(m.sensor_id) === 1)} tipo="aceleracion" titulo="Acelerómetro · Sensor 1" /><GraficaLecturas mediciones={registrosSesion.filter((m) => Number(m.sensor_id) === 2)} tipo="aceleracion" titulo="Acelerómetro · Sensor 2" /></section></main>}

    {vista === 'resultados' && <main className="page-content"><div className="page-heading"><p className="eyebrow">Modo {modoDatos} · registros conservados en Firebase</p><h2>Resultados</h2><p>El historial conserva las mediciones de cada sesión.</p></div>
      <section className="panel chart-controls"><label htmlFor="results-session">Sesión</label><SessionSelect id="results-session" sesiones={sesiones} value={sesionId} onChange={setSesionId} activa={activa} haySinSesion={registrosModo.some((dato) => !dato.sesion_id)} /></section>
      <ReadingsTable mediciones={registrosSesion} /></main>}

    {vista === 'recoleccion' && <main className="page-content"><div className="page-heading"><p className="eyebrow">Fuente de datos centralizada</p><h2>Recolección</h2><p>El backend acepta solo lecturas de la fuente activa y las vincula a la sesión abierta.</p></div>
      <section className="panel collection-controls"><div className="panel-header"><h3>Modo de operación</h3><span className="badge">{modo === 'simulado' ? 'Datos ficticios' : 'Sensores físicos'}</span></div>
        <label htmlFor="mode-select">Fuente de lecturas</label><select id="mode-select" value={modo} disabled={accionando || Boolean(activa)} onChange={(event) => ejecutarAccion(() => cambiarModo(event.target.value))}><option value="esp32">ESP32 real</option><option value="simulado">Simulación</option></select>
        <p>{modo === 'simulado' ? 'Inicia el simulador del backend después de abrir una sesión.' : 'El ESP32 debe enviar lecturas al backend por Wi-Fi.'}</p>
        <div className="session-actions">{activa ? <><p>Sesión <code>{activa.id}</code> · iniciada {new Date(activa.inicio).toLocaleString()}</p><button className="secondary-button" disabled={accionando} onClick={() => ejecutarAccion(cerrarSesion)}>Cerrar sesión</button></> : <><p>No hay sesión activa. Las nuevas lecturas se rechazan hasta iniciarla.</p><button className="primary-button" disabled={accionando || apiEstado !== 'conectado'} onClick={() => ejecutarAccion(iniciarSesion)}>Iniciar sesión</button></>}</div>
        <p className="connection-message">API/Firebase: {estadoTexto} · Fuente: {datosRecientes ? 'recibiendo datos' : 'sin lecturas recientes'}</p>{error && <p role="alert" className="connection-message">{error}</p>}
      </section>
      <section className="panel readings-table"><div className="panel-header"><h3>Historial de sesiones</h3><span className="badge">No se borra al cerrar</span></div>{sesiones.length ? <ul className="list-block compact">{sesiones.map((s) => <li key={s.id}><div><strong>{s.id}</strong><span>{s.modo === 'simulado' ? 'Simulación' : 'ESP32 real'}</span></div><small>{new Date(s.inicio).toLocaleString()} – {s.fin ? new Date(s.fin).toLocaleString() : 'En curso'}</small><span className="tag subtle">{s.estado}</span></li>)}</ul> : <p className="empty-state">Aún no hay sesiones.</p>}</section>
    </main>}

    {vista === 'configuracion' && <main className="page-content"><div className="page-heading"><p className="eyebrow">Conexión</p><h2>Configuración</h2><p>La red Wi-Fi del ESP32 y Firebase se configuran en el backend y el firmware.</p></div><section className="panel config-list"><div><strong>Snapshot compartido</strong><code>GET /api/panel</code></div><div><strong>Cambio de modo</strong><code>PUT /api/modo</code></div><div><strong>Sesiones</strong><code>POST /api/sesiones · POST /api/sesiones/cerrar</code></div><div><strong>Proxy</strong><code>{import.meta.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000'}</code></div><div><strong>Base de datos</strong><code>Firebase Realtime Database</code></div></section></main>}

    {vista === 'promedio' && <VideoPage tipo="promedio" sesion={activa} lecturas={lecturasPrueba} modo={modo} apiEstado={apiEstado} accionando={accionando} error={error} onIniciar={iniciarPrueba} />}
    {vista === 'tea' && <VideoPage tipo="tea" sesion={activa} lecturas={lecturasPrueba} modo={modo} apiEstado={apiEstado} accionando={accionando} error={error} onIniciar={iniciarPrueba} />}

    <footer className="app-footer">Ingenismus · MPU6050 · Fuente: {modo === 'simulado' ? 'simulación' : 'ESP32 real'} · Firebase</footer>
  </div>;
}

function Status({ label, value, state }) {
  return <div className="status-card"><span className={`dot ${state}`} /><div><strong>{label}</strong><p>{value}</p></div></div>;
}

function SessionSelect({ id, sesiones, value, onChange, activa, haySinSesion }) {
  return <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="actual">{activa ? 'Sesión activa' : 'Sin sesión activa'}</option>
    {haySinSesion && <option value="sin-sesion">Histórico sin sesión (sin asignar)</option>}
    {sesiones.map((sesion) => <option key={sesion.id} value={sesion.id}>{sesion.modo === 'simulado' ? 'Simulación' : 'ESP32'} · {new Date(sesion.inicio).toLocaleString()} · {sesion.estado}</option>)}
  </select>;
}

function ReadingsTable({ mediciones, sensor = false }) {
  return <section className="panel readings-table"><div className="panel-header"><h3>{sensor ? 'Lecturas del sensor' : 'Registros de la sesión'}</h3><span className="badge">{mediciones.length} registros</span></div><div className="table-scroll"><table><thead><tr><th>Hora</th>{!sensor && <><th>Sensor</th><th>Fuente</th></>}<th>Acel. X</th><th>Acel. Y</th><th>Acel. Z</th><th>Giro. X</th><th>Giro. Y</th><th>Giro. Z</th></tr></thead><tbody>{mediciones.map((m) => <tr key={m.id}><td>{horaDe(m)}</td>{!sensor && <><td>{m.sensor_id}</td><td>{m.fuente || 'ESP32 (histórico)'}</td></>}<td>{m.aceleracion_x}</td><td>{m.aceleracion_y}</td><td>{m.aceleracion_z}</td><td>{m.giroscopio_x}</td><td>{m.giroscopio_y}</td><td>{m.giroscopio_z}</td></tr>)}</tbody></table>{!mediciones.length && <p className="empty-state">No hay lecturas en esta selección.</p>}</div></section>;
}

export default App;
