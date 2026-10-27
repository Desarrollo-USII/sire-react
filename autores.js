export const esUSII = nombre => ['clientes','usii'].includes(String(nombre??'').trim().toLowerCase());
export const autorRespuesta = nombre => esUSII(nombre) ? 'USII' : nombre;
export const normalizarTicket = t => ({...t,seguimiento:(t.seguimiento??[]).map(s=>({...s,personalEnAtencion:autorRespuesta(s.personalEnAtencion)}))});
export const normalizarDatos = d => d ? {...d,tickets:d.tickets.map(normalizarTicket)} : null;
