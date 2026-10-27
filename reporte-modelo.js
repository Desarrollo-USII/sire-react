import {fechaRespuesta} from './fechas.js';
import {coincideRespuesta,hayFiltrosRespuesta} from './respuestas-filtros.js';
export function diaLocal(texto) {
  const m = String(texto ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
export function validarRangos(f = {}) {
  for (const [a,b,label] of [['ticketDesde','ticketHasta','números de ticket'],['creacionDesde','creacionHasta','fechas de creación'],['respuestaDesde','respuestaHasta','fechas de respuesta']]) {
    if(f[a] && f[b] && (a.startsWith('ticket') ? Number(f[a]) > Number(f[b]) : f[a] > f[b])) throw new Error(`El inicio del rango de ${label} no puede ser mayor que el final.`);
  }
}
const enRango = (v,a,b) => (!a && !b) || (!!v && (!a || v >= a) && (!b || v <= b));
export function seleccionarTickets(tickets, f = {}) {
  validarRangos(f);
  if(f.sistemas!==undefined && (!Array.isArray(f.sistemas)||f.sistemas.some(s=>typeof s!=='string')))throw Error('Selección de sistemas inválida.');
  if(f.excluirTickets!==undefined&&(!Array.isArray(f.excluirTickets)||f.excluirTickets.some(k=>typeof k!=='string')))throw Error('Exclusión de tickets inválida.');
  const excluidos=new Set(f.excluirTickets??[]);
  return tickets.filter(t => !excluidos.has(`${t.sistema}:${t.id}`) && (f.sistemas===undefined ? (!f.sistema || t.sistema === f.sistema) : f.sistemas.includes(t.sistema)) &&
    (!f.ticketDesde || Number(t.id) >= Number(f.ticketDesde)) && (!f.ticketHasta || Number(t.id) <= Number(f.ticketHasta)) &&
    enRango(diaLocal(t.fechaRegistroTexto),f.creacionDesde,f.creacionHasta))
    .map(t => ({...t, respuestasEnRango:(t.seguimiento ?? []).filter(s => enRango(diaLocal(s.fechaTexto),f.respuestaDesde,f.respuestaHasta) && coincideRespuesta(s,f))}))
    .filter(t => (!f.respuestaDesde && !f.respuestaHasta && !hayFiltrosRespuesta(f)) || t.respuestasEnRango.length)
    .map(t => ({...t,ultimaRespuesta:[...t.respuestasEnRango].sort((a,b) => fechaRespuesta(b) - fechaRespuesta(a) || b.consecutivo-a.consecutivo)[0] ?? null}));
}
export function resumir(tickets) {
  const finalizados=tickets.filter(t=>t.estatus.trim().toLowerCase()==='finalizado').length;
  return {total:tickets.length,finalizados,nuevoSistema:tickets.length-finalizados};
}





