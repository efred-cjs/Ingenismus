async function solicitar(ruta, opciones = {}) {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...opciones.headers }
  });
  const contenido = await respuesta.json();

  if (!respuesta.ok) {
    const detalle = contenido.detalle ? `: ${contenido.detalle}` : '';
    throw new Error(`${contenido.error || 'La solicitud al backend no se completó.'}${detalle}`);
  }
  return contenido;
}

export async function obtenerPanel({ signal } = {}) {
  const contenido = await solicitar('/panel', { signal });
  if (!Array.isArray(contenido.mediciones) || !Array.isArray(contenido.sesiones)) {
    throw new Error('El backend devolvió un panel no válido.');
  }
  return contenido;
}

export function cambiarModo(modo) {
  return solicitar('/modo', { method: 'PUT', body: JSON.stringify({ modo }) });
}

export function iniciarSesion(prueba) {
  return solicitar('/sesiones', {
    method: 'POST',
    body: JSON.stringify(prueba)
  });
}

export function cerrarSesion() {
  return solicitar('/sesiones/cerrar', { method: 'POST' });
}

export function pausarSesion() {
  return solicitar('/sesiones/pausar', { method: 'POST' });
}

export function reanudarSesion() {
  return solicitar('/sesiones/reanudar', { method: 'POST' });
}

export function crearSujeto(edad) {
  return solicitar('/sujetos', { method: 'POST', body: JSON.stringify({ edad }) });
}

export async function obtenerMedicionesSesion(sesionId, { cursor, limite = 500 } = {}) {
  const parametros = new URLSearchParams({ limite: String(limite) });
  if (cursor) parametros.set('cursor', cursor);
  return solicitar(`/sesiones/${encodeURIComponent(sesionId)}/mediciones?${parametros}`);
}

export async function obtenerMedicionesSinSesion({ cursor, limite = 500 } = {}) {
  const parametros = new URLSearchParams({ limite: String(limite) });
  if (cursor) parametros.set('cursor', cursor);
  return solicitar(`/mediciones/sin-sesion?${parametros}`);
}
