export async function obtenerMediciones({ signal } = {}) {
  const respuesta = await fetch('/api/mediciones?limite=20', { signal });
  const contenido = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(contenido.error || 'No se pudieron cargar las mediciones.');
  }

  if (!Array.isArray(contenido.mediciones)) {
    throw new Error('La API devolvio una respuesta de mediciones no valida.');
  }

  return contenido;
}
