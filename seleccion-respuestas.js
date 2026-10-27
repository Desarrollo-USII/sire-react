import {fechaRespuesta} from './fechas.js';
export const esFinalizado=t=>t.estatus?.trim().toLowerCase()==='finalizado';
export const claveTicket=t=>`${t.sistema}:${t.id}`;
export const claveRespuesta=s=>JSON.stringify([s.consecutivo,s.fechaISO??s.fechaTexto,s.personalEnAtencion??'']);
export const ultimasSeis=t=>esFinalizado(t)?[...(t.respuestasEnRango??[])].sort((a,b)=>fechaRespuesta(b)-fechaRespuesta(a)||b.consecutivo-a.consecutivo).slice(0,6):[];
export function aplicarSeleccion(tickets,selecciones={}){
  if(!selecciones||typeof selecciones!=='object'||Array.isArray(selecciones))throw Error('Selección de respuestas inválida.');
  const mapa=new Map(tickets.map(t=>[claveTicket(t),t]));
  for(const [clave,valor] of Object.entries(selecciones)){
    const ticket=mapa.get(clave);
    if(!ticket||!esFinalizado(ticket)||!ultimasSeis(ticket).some(s=>claveRespuesta(s)===valor))throw Error('La respuesta seleccionada ya no está entre las últimas seis que cumplen los filtros. Revisa la selección.');
  }
  return tickets.map(t=>({...t,ultimaRespuesta:selecciones[claveTicket(t)]?ultimasSeis(t).find(s=>claveRespuesta(s)===selecciones[claveTicket(t)]):t.ultimaRespuesta}));
}


