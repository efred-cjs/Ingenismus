const EJES = ['x', 'y', 'z'];
const COLORES = ['#FF8422', '#00B4FB', '#436C34'];

function fechaDe(dato) {
  const valor = Number(dato.fecha_servidor);
  return Number.isFinite(valor) ? new Date(valor).toLocaleTimeString() : '—';
}

export default function GraficaLecturas({ mediciones, tipo, titulo }) {
  const campo = tipo === 'aceleracion' ? 'aceleracion' : 'giroscopio';
  const nombre = tipo === 'aceleracion' ? 'Acelerómetro' : 'Giroscopio';
  const datos = [...mediciones].reverse();
  const ancho = 720;
  const alto = 280;
  const margen = { arriba: 20, derecha: 18, abajo: 42, izquierda: 56 };
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;
  const valores = datos.flatMap((dato) => EJES.map((eje) => Number(dato[`${campo}_${eje}`])).filter(Number.isFinite));
  let minimo = valores.length ? Math.min(...valores) : -1;
  let maximo = valores.length ? Math.max(...valores) : 1;
  if (minimo === maximo) { minimo -= 1; maximo += 1; }
  const extension = (maximo - minimo) * 0.08;
  minimo -= extension;
  maximo += extension;
  const x = (indice) => margen.izquierda + (datos.length <= 1 ? anchoUtil / 2 : indice * anchoUtil / (datos.length - 1));
  const y = (valor) => margen.arriba + (maximo - valor) * altoUtil / (maximo - minimo);
  const ticks = Array.from({ length: 5 }, (_, i) => maximo - i * (maximo - minimo) / 4);
  const etiqueta = titulo || `${nombre} · Sensor`;

  return (
    <article className="panel chart-panel">
      <div className="panel-header"><div><h3>{etiqueta}</h3><p>Cuentas (raw counts) · eje X, Y y Z</p></div><span className="badge">{datos.length} puntos</span></div>
      {datos.length ? <div className="chart-scroll">
        <svg className="sensor-chart" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`${nombre}, series de los ejes X Y Z`}>
          {ticks.map((tick, i) => <g key={i}><line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y(tick)} y2={y(tick)} className="chart-gridline"/><text x={margen.izquierda - 9} y={y(tick) + 4} textAnchor="end" className="chart-label">{Math.round(tick)}</text></g>)}
          {EJES.map((eje, serie) => {
            const points = datos.map((dato, indice) => `${x(indice)},${y(Number(dato[`${campo}_${eje}`]))}`).join(' ');
            return <polyline key={eje} points={points} fill="none" stroke={COLORES[serie]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>;
          })}
          {datos.filter((_, indice) => indice === 0 || indice === datos.length - 1 || indice % Math.ceil(datos.length / 5) === 0).map((dato, indice) => <text key={`${dato.id}-${indice}`} x={x(datos.indexOf(dato))} y={alto - 12} textAnchor="middle" className="chart-label">{fechaDe(dato)}</text>)}
        </svg>
      </div> : <div className="chart-empty">Las gráficas se actualizarán cuando lleguen lecturas del sensor.</div>}
      <div className="chart-legend">{EJES.map((eje, i) => <span key={eje}><i style={{ backgroundColor: COLORES[i] }} />Eje {eje.toUpperCase()}</span>)}</div>
    </article>
  );
}
