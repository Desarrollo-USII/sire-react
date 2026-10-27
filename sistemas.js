import {normalizarDatos} from './autores.js';
import registro from './sistemas.json';
import dcbmi from './tickets.json';
const archivos = { './tickets.json':dcbmi, ...import.meta.glob('./datos/*.json',{eager:true,import:'default'}) };
export const sesiones = Object.keys(registro);
export const datosPorSistema = Object.fromEntries(sesiones.map(nombre => [nombre, registro[nombre] ? normalizarDatos(archivos[`./${registro[nombre]}`] ?? null) : null]));
export let todosLosTickets = sesiones.flatMap(nombre => (datosPorSistema[nombre]?.tickets ?? []).map(t => ({...t,sistema:nombre})));
export let sistemasCargados = sesiones.filter(nombre => datosPorSistema[nombre]);


export function actualizarDatosSistema(nombre,datos){
 if(!sesiones.includes(nombre)||!Array.isArray(datos?.tickets))throw Error('Datos de sesión inválidos.');
 datosPorSistema[nombre]=normalizarDatos(datos);
 todosLosTickets=sesiones.flatMap(sistema=>(datosPorSistema[sistema]?.tickets??[]).map(t=>({...t,sistema})));
 sistemasCargados=sesiones.filter(s=>datosPorSistema[s]);
}
