import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import {compararReporte,solicitudesCambios} from '../nube-modelo.js';
import {prepararReporte} from './exportar.mjs';
const run=promisify(execFile),require=createRequire('C:/Users/UV/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const python='C:/Users/UV/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const script=fileURLToPath(new URL('./office-paquete.py',import.meta.url));
const columna=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
export async function procesarOffice({archivo,filtros={},elegidos}){
  if(typeof archivo!=='string'||archivo.length>12000000)throw Error('Archivo inválido o mayor a 8 MB.');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sire-office-'));
  try{
    const original=path.join(dir,'original.xlsm'),snapshot=path.join(dir,'snapshot.json');await fs.writeFile(original,Buffer.from(archivo,'base64'));
    await run(python,[script,'read',original,snapshot]);const remoto=JSON.parse(await fs.readFile(snapshot,'utf8')),reporte=await prepararReporte(filtros),plan=compararReporte(reporte,remoto);
    if(elegidos===undefined)return {remoto,reporte,plan};
    if(!Array.isArray(elegidos)||!elegidos.length||new Set(elegidos).size!==elegidos.length||elegidos.some(k=>!plan.cambios.some(c=>c.id===k)))throw Error('La selección de cambios ya no es válida. Vuelve a comparar.');
    const cambios=plan.cambios.filter(c=>elegidos.includes(c.id));
    const {FileBlob,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
    const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(original)),updates=Object.fromEntries(remoto.hojas.map(s=>[s.nombre,[]]));
    for(const req of solicitudesCambios(cambios,remoto)){
      if(!req.updateCells)continue;
      const u=req.updateCells,sheetId=u.start?.sheetId??u.range?.sheetId,sheet=remoto.hojas.find(s=>s.sheetId===sheetId),ws=wb.worksheets.getItem(sheet.nombre);
      if(u.start){const row=u.start.rowIndex+1;if(row>sheet.rowCount)throw Error('Se alcanzó el límite de filas preparadas en la plantilla.');const col=u.start.columnIndex,values=u.rows[0].values.map(c=>c.userEnteredValue?.numberValue??c.userEnteredValue?.stringValue??c.userEnteredValue?.boolValue??'');const end=col+values.length-1;ws.getRange(`${columna(col)}${row}:${columna(end)}${row}`).values=[values];for(let i=col;i<=end;i++)updates[sheet.nombre].push(`${columna(i)}${row}`);
      }else{const row=u.range.startRowIndex+1;ws.getRange(`A${row}:${columna(u.range.endColumnIndex-1)}${row}`).clear({applyTo:'contents'});for(let i=0;i<u.range.endColumnIndex;i++)updates[sheet.nombre].push(`${columna(i)}${row}`);}
    }
    const authored=path.join(dir,'valores.xlsx');await (await SpreadsheetFile.exportXlsx(wb)).save(authored);const manifest=path.join(dir,'updates.json');await fs.writeFile(manifest,JSON.stringify(updates));const output=path.join(dir,'actualizado.xlsm');await run(python,[script,'merge',original,authored,manifest,output]);
    await run(python,[script,'read',output,snapshot]);const after=JSON.parse(await fs.readFile(snapshot,'utf8'));const pendientes=compararReporte(reporte,after);
    if([...pendientes.cambios,...pendientes.conflictos].some(c=>elegidos.includes(c.id)))throw Error('No fue posible verificar todos los cambios del archivo.');
    return {archivo:(await fs.readFile(output)).toString('base64'),aplicados:cambios.length};
  }finally{await fs.rm(dir,{recursive:true,force:true});}
}
export function pluginOffice(){return {name:'actualizacion-office',configureServer(server){server.middlewares.use('/api/nube-office',async(req,res)=>{
  if(req.method!=='POST'){res.statusCode=405;res.end();return;}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>14000000)throw Error('Archivo demasiado grande.');}const entrada=JSON.parse(body);if(entrada.referencia){if(entrada.elegidos!==undefined)throw Error('La copia de referencia es solo para comparar.');entrada.archivo=(await fs.readFile(new URL('./nube-referencia.xlsm',import.meta.url))).toString('base64');}const resultado=await procesarOffice(entrada);res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(resultado));}catch(e){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message}));}
});}};}

