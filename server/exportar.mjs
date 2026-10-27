import {leerCacheSire} from './sire.mjs';
import {ajustarValidaciones} from './validar-filas.mjs';
import {esUSII,normalizarTicket} from '../autores.js';
import {fechaRespuesta} from '../fechas.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {seleccionarTickets,diaLocal,resumir,validarRangos} from '../reporte-modelo.js';
import {aplicarSeleccion} from '../seleccion-respuestas.js';
const root = new URL('../',import.meta.url);
const require = createRequire('C:/Users/UV/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
let biblioteca;
const leerJSON = async url => JSON.parse((await fs.readFile(url,'utf8')).replace(/^\uFEFF/,''));
export async function cargarTickets(){
  const registro=await leerJSON(new URL('sistemas.json',root));
  const tickets=[];
  for(const [sistema,archivo] of Object.entries(registro))if(archivo){
    const url=new URL(archivo,root);
    if(!url.href.startsWith(root.href))throw Error('Ruta de datos inválida');
    const datos=await leerCacheSire(sistema)??await leerJSON(url);tickets.push(...datos.tickets.map(t=>({...normalizarTicket(t),sistema})));
  }
  return tickets;
}
function serialFecha(texto){
  const dia=diaLocal(texto);if(!dia)return null;
  return (Date.parse(`${dia}T00:00:00Z`)-Date.UTC(1899,11,30))/86400000;
}
function valorTexto(v){const s=String(v??'');return s.startsWith('=') ? `'${s}` : s;}
function fila(t,finalizado){
  const r=t.ultimaRespuesta;
  const soporte=[...t.respuestasEnRango].filter(s=>s.personalEnAtencion && !esUSII(s.personalEnAtencion)).sort((a,b)=>fechaRespuesta(b)-fechaRespuesta(a))[0];
  const base=[Number(t.id),t.sistema,serialFecha(t.fechaRegistroTexto),valorTexto(t.descripcionDetallada)];
  if(finalizado)return [...base,t.estatus,t.prioridad,soporte?.personalEnAtencion??'',r?serialFecha(r.fechaTexto):null,valorTexto(r?.comentario)];
  return [...base,t.posesion,t.estatus,t.prioridad,soporte?.personalEnAtencion??'',r?serialFecha(r.fechaTexto):null,valorTexto(r?.comentario),r?(esUSII(r.personalEnAtencion)?'USII':'SIRE'):'',valorTexto(t.comentariosFinales)];
}
export async function prepararReporte(filtros={}){
  validarRangos(filtros);
  const tickets=aplicarSeleccion(seleccionarTickets(await cargarTickets(),filtros),filtros.selecciones??{}).sort((a,b)=>a.sistema.localeCompare(b.sistema)||b.id-a.id);
  const validaciones=await leerJSON(new URL('validaciones.json',import.meta.url));
  const headers={
    'Nuevo sistema':['Ticket','Área','Fecha de creación','Asunto','Situación en sistema de incidencias','Situación en el sistema de incidencias','Prioridad','Atendio en SIRE','Fecha última respuesta','Respuesta','Respuesta por:','Comentario'],
    'Finalizados':['Ticket','Área','Fecha de creación','Asunto','Situación en el sistema de incidencias','Prioridad','Atendio en SIRE','Fecha última respuesta','Respuesta']
  };
  return {resumen:resumir(tickets),hojas:Object.entries(headers).map(([nombre,columnas])=>({nombre,columnas,filas:tickets.filter(t=>(t.estatus.trim().toLowerCase()==='finalizado')===(nombre==='Finalizados')).map(t=>ajustarValidaciones(fila(t,nombre==='Finalizados'),validaciones[nombre],`${t.sistema} #${t.id}`))}))};
}
export async function crearExcel(filtros={}, {verificar=false}={}){
  validarRangos(filtros);
  const tickets=aplicarSeleccion(seleccionarTickets(await cargarTickets(),filtros),filtros.selecciones??{}).sort((a,b)=>a.sistema.localeCompare(b.sistema)||b.id-a.id);
  const resumen=resumir(tickets);
  if(!tickets.length)throw new Error('No hay tickets que coincidan con los rangos seleccionados.');
  biblioteca ??= import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
  const {FileBlob,SpreadsheetFile}=await biblioteca;
  const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(new URL('plantilla.xlsx',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')));
  const validaciones=await leerJSON(new URL('validaciones.json',import.meta.url));
  for(const [nombre,fin,columna] of [['Nuevo sistema',false,'L'],['Finalizados',true,'I']]){
    const sheet=wb.worksheets.getItem(nombre),table=sheet.tables.items[0];
    const filas=tickets.filter(t=>(t.estatus.trim().toLowerCase()==='finalizado')===fin).map(t=>ajustarValidaciones(fila(t,fin),validaciones[nombre],`${t.sistema} #${t.id}`));
    sheet.getRange(`A2:${columna}2`).clear({applyTo:'contents'});
    if(filas.length>1){
      table.rows.add(null,filas.slice(1));
      for(let n=3;n<=filas.length+1;n++)sheet.getRange(`A${n}:${columna}${n}`).copyFrom(sheet.getRange(`A2:${columna}2`),'all');
    }
    if(filas.length>1)for(const regla of validaciones[nombre])sheet.dataValidations.add({range:regla.columna+'3:'+regla.columna+(filas.length+1),rule:{type:'list',values:regla.valores}});
    if(filas.length){
      sheet.getRange(`A2:${columna}${filas.length+1}`).values=filas;
      sheet.getRange(`C2:C${filas.length+1}`).setNumberFormat('dd/mm/yyyy');
      const colFecha=fin?'H':'I';sheet.getRange(`${colFecha}2:${colFecha}${filas.length+1}`).setNumberFormat('dd/mm/yyyy');
      // Extend the template's layout where long response text needs space.
      sheet.getRange(`D1:D${filas.length+1}`).format.columnWidth=55;
      const colRespuesta=fin?'I':'J';sheet.getRange(`${colRespuesta}1:${colRespuesta}${filas.length+1}`).format.columnWidth=100;
      for(let i=0;i<filas.length;i++){
        const rango=sheet.getRange(`A${i+2}:${columna}${i+2}`);rango.format.wrapText=true;rango.format.verticalAlignment='top';
        const texto=String(filas[i][fin?8:9]??'');
        const lineasRespuesta=texto.split('\n').reduce((s,l)=>s+Math.max(1,Math.ceil(l.length/95)),0);
        const lineasAsunto=String(filas[i][3]??'').split('\n').reduce((s,l)=>s+Math.max(1,Math.ceil(l.length/50)),0);
        const lineas=Math.max(lineasRespuesta,lineasAsunto);
        rango.format.rowHeight=Math.min(409,Math.max(72,lineas*15+15));
      }
    }
  }
  wb.recalculate();
  if(verificar){
    console.log((await wb.inspect({kind:'table',range:"'Nuevo sistema'!A1:L3",include:'values,formulas',tableMaxRows:3,tableMaxCols:12,maxChars:3000})).ndjson);
    for(const nombre of ['Nuevo sistema','Finalizados']){
      const imagen=await wb.render({sheetName:nombre,range:nombre==='Finalizados'?'G1:I3':'H1:L3',scale:1,format:'png'});
      await fs.writeFile(new URL(`../../../work/excel-service/verificacion-${nombre}.png`,import.meta.url),new Uint8Array(await imagen.arrayBuffer()));
    }
  }
  const archivo=await SpreadsheetFile.exportXlsx(wb);
  const temporal=await fs.mkdtemp(path.join(os.tmpdir(),'sire-export-'));
  try{const destino=path.join(temporal,'concentrado.xlsx');await archivo.save(destino);return {buffer:await fs.readFile(destino),resumen};}finally{for(const nombre of ['concentrado.xlsx','concentrado.xlsx.inspect.ndjson'])await fs.unlink(path.join(temporal,nombre)).catch(()=>{});await fs.rmdir(temporal).catch(()=>{});}
}
export function pluginExportacion(){return {name:'exportacion-incidentes',configureServer(server){server.middlewares.use('/api/reporte-nube',async(req,res)=>{if(req.method!=='POST'){res.statusCode=405;res.end();return;}try{let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw Error('Solicitud demasiado grande');}const reporte=await prepararReporte(JSON.parse(body||'{}'));res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(reporte));}catch(error){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:error.message}));}});server.middlewares.use('/api/exportar-excel',async(req,res)=>{
  if(req.method!=='POST'){res.statusCode=405;res.end();return;}
  try{
    let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw Error('Solicitud demasiado grande');}
    const filtros=JSON.parse(body||'{}');
    const permitidas=['sistema','sistemas','excluirTickets','ticketDesde','ticketHasta','creacionDesde','creacionHasta','respuestaDesde','respuestaHasta','palabrasRespuesta','excluirPalabras','modoPalabras','personaRespuesta','selecciones'];
    if(Object.keys(filtros).some(k=>!permitidas.includes(k)))throw Error('Filtros inválidos');
    const {buffer}=await crearExcel(filtros);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename="Concentrado de Incidentes.xlsx"');
    res.end(buffer);
  }catch(error){console.error('Exportación:',error.message);res.statusCode=400;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:error.message}));}
});}};}














