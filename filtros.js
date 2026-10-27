export const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export {fechaRespuesta} from './fechas.js';
import {fechaRespuesta} from './fechas.js';
export function filtrarOrdenar(tickets, { buscar = '', ticket = '', respuesta = '', estado = '', orden = 'ticket-desc', ordenRespuesta = 'fecha-desc' } = {}) {
  const texto = normalizar(buscar), numero = ticket.trim(), consulta = normalizar(respuesta);
  const filas = tickets.filter(t => (!estado || t.estatus === estado) &&
    (!numero || String(t.id).includes(numero)) &&
    (!texto || normalizar(`${t.id} ${t.descripcionBreve} ${t.descripcionDetallada}`).includes(texto)) &&
    (!consulta || (t.seguimiento ?? []).some(s => normalizar(s.comentario).includes(consulta))))
    .map(t => ({ ...t, respuestasVisibles: (t.seguimiento ?? []).filter(s => !consulta || normalizar(s.comentario).includes(consulta)).slice().sort((a, b) => {
      if (ordenRespuesta.startsWith('texto')) return normalizar(a.comentario).localeCompare(normalizar(b.comentario), 'es') * (ordenRespuesta === 'texto-asc' ? 1 : -1) || fechaRespuesta(a) - fechaRespuesta(b);
      return (fechaRespuesta(a) - fechaRespuesta(b)) * (ordenRespuesta === 'fecha-asc' ? 1 : -1) || a.consecutivo - b.consecutivo;
    }) }));
  const ultima = t => Math.max(0, ...t.respuestasVisibles.map(fechaRespuesta));
  return filas.sort((a, b) => {
    if (orden.startsWith('respuesta')) {
      if (!a.respuestasVisibles.length || !b.respuestasVisibles.length) return Number(!a.respuestasVisibles.length) - Number(!b.respuestasVisibles.length) || b.id - a.id;
      return (ultima(a) - ultima(b)) * (orden === 'respuesta-asc' ? 1 : -1) || b.id - a.id;
    }
    return (a.id - b.id) * (orden === 'ticket-asc' ? 1 : -1);
  });
}

