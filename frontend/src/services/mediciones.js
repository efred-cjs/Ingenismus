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
    body: JSON.stringify(prueba ? { prueba } : {})
  });
}

export function cerrarSesion() {
  return solicitar('/sesiones/cerrar', { method: 'POST' });
}
