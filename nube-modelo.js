export const DOCUMENTO_ID='1Y6KA844McQe0M3bp0p7Ryx8piRj8OI-x31peK9pOBN0';
export const DOCUMENTO_URL=`https://docs.google.com/spreadsheets/d/${DOCUMENTO_ID}/edit#gid=2039520955`;
const normal=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const area=v=>normal(v)==='presupuesto'?'presupuestos':normal(v);
const llave=f=>`${Number(f[0])}:${area(f[1])}`;
export const valorCelda=c=>{const v=c?.effectiveValue??c?.userEnteredValue??{};return v.numberValue??v.stringValue??v.boolValue??'';};
const formula=c=>!!c?.userEnteredValue?.formulaValue;
const keys={ 'Nuevo sistema':['id','area','creacion','asunto','posesion','estatus','prioridad','soporte','fecha','respuesta','autor','comentario'],'Finalizados':['id','area','creacion','asunto','estatus','prioridad','soporte','fecha','respuesta'] };
function validarValor(v,cell){
  const condition=cell?.dataValidation?.condition;
  if(v===''||v===null||v===undefined||!condition)return v??'';
  if(condition.type==='ONE_OF_LIST'){
    const opciones=condition.values.map(x=>x.userEnteredValue);
    const match=opciones.find(x=>normal(x)===normal(v));
    if(match===undefined)throw Error(`«${v}» no está permitido por la validación del documento.`);
    return match;
  }
  if(condition.type==='ONE_OF_RANGE')throw Error('La validación usa un rango de otra hoja; revisa esa columna antes de sincronizar.');
  return v;
}
export function compararReporte(reporte,remoto){
  const cambios=[],conflictos=[],indice=new Map(),sheets=new Map();
  for(const local of reporte.hojas){
    const sheet=remoto.hojas.find(s=>normal(s.nombre)===normal(local.nombre));
    if(!sheet)throw Error(`Falta la hoja «${local.nombre}» en Google Sheets.`);
    if(local.columnas.some((h,i)=>normal(h)!==normal(valorCelda(sheet.rows[0]?.[i]))))throw Error(`Los encabezados de «${local.nombre}» no coinciden con la plantilla. No se escribirán datos.`);
    sheets.set(local.nombre,sheet);
    sheet.rows.slice(1).forEach((cells,i)=>{const vals=cells.map(valorCelda);if(!vals[0])return;if(!Number.isInteger(Number(vals[0]))||!vals[1])return;const key=llave(vals);indice.set(key,[...(indice.get(key)??[]),{sheet,cells,vals,row:i+1}]);});
  }
  for(const hoja of reporte.hojas)for(const fila of hoja.filas){
    const id=llave(fila),found=indice.get(id)??[],destino=sheets.get(hoja.nombre),prev=found[0];
    if(found.length>1){conflictos.push({id,ticket:fila[0],area:fila[1],motivo:'El ticket está duplicado en el documento.'});continue;}
    const mover=prev&&prev.sheet.sheetId!==destino.sheetId;
    if(prev?.cells.some(formula)){conflictos.push({id,ticket:fila[0],area:fila[1],motivo:'La fila contiene fórmulas; requiere revisión manual.'});continue;}
    if(mover&&prev.cells.slice(keys[prev.sheet.nombre]?.length??0).some(c=>valorCelda(c)!=='')){conflictos.push({id,ticket:fila[0],area:fila[1],motivo:'El traslado afectaría columnas adicionales; requiere revisión manual.'});continue;}
    // Do not discard manual fields when the local source is blank.
    let anterior=mover?hoja.columnas.map((_,i)=>{let idx=keys[prev.sheet.nombre]?.indexOf(keys[hoja.nombre][i]);return idx>=0?prev.vals[idx]??'':'';}):hoja.columnas.map((_,i)=>prev?.vals[i]??'');
    let propuesta=fila.map((v,i)=>(v===null||v===undefined||v==='')?anterior[i]:v);
    let row=prev&&!mover?prev.row:null;
    try{propuesta=propuesta.map((v,i)=>validarValor(v,(row!==null?destino.rows[row]?.[i]:null)??destino.rows[1]?.[i]));}catch(e){conflictos.push({id,ticket:fila[0],area:fila[1],motivo:e.message});continue;}
    const diferencias=hoja.columnas.flatMap((campo,i)=>{let antes=anterior[i],despues=propuesta[i];return antes===despues?[]:[{columna:i,campo,antes,despues}];});
    if(!prev||mover||diferencias.length)cambios.push({id,ticket:fila[0],area:fila[1],hoja:hoja.nombre,sheetId:destino.sheetId,row,tipo:mover?'Traslado':prev?'Cambio':'Nuevo',origen:mover?{nombre:prev.sheet.nombre,sheetId:prev.sheet.sheetId,row:prev.row,width:keys[prev.sheet.nombre].length,datos:prev.vals.slice(0,keys[prev.sheet.nombre].length),columnas:reporte.hojas.find(h=>h.nombre===prev.sheet.nombre).columnas}:null,propuesta,diferencias});
  }
  return {cambios,conflictos};
}
const dato=v=>v===''||v===null||v===undefined?{}:{userEnteredValue:typeof v==='number'?{numberValue:v}:typeof v==='boolean'?{boolValue:v}:{stringValue:String(v)}};
export function solicitudesCambios(cambios,remoto){
  const requests=[],next=new Map(),limites=new Map();
  for(const s of remoto.hojas){let ultimo=1;s.rows.forEach((r,i)=>{if(r.some(c=>valorCelda(c)!==''||formula(c)))ultimo=i+1;});next.set(s.sheetId,ultimo);limites.set(s.sheetId,s.rowCount);}
  for(const c of cambios){
    const row=c.row??next.get(c.sheetId);if(c.row===null)next.set(c.sheetId,row+1);
    if(row>=limites.get(c.sheetId)){const length=row+1-limites.get(c.sheetId);requests.push({appendDimension:{sheetId:c.sheetId,dimension:'ROWS',length}});limites.set(c.sheetId,row+1);}
    if(c.row===null){
      const cols=c.propuesta.length;
      requests.push({copyPaste:{source:{sheetId:c.sheetId,startRowIndex:1,endRowIndex:2,startColumnIndex:0,endColumnIndex:cols},destination:{sheetId:c.sheetId,startRowIndex:row,endRowIndex:row+1,startColumnIndex:0,endColumnIndex:cols},pasteType:'PASTE_FORMAT'}});
      requests.push({copyPaste:{source:{sheetId:c.sheetId,startRowIndex:1,endRowIndex:2,startColumnIndex:0,endColumnIndex:cols},destination:{sheetId:c.sheetId,startRowIndex:row,endRowIndex:row+1,startColumnIndex:0,endColumnIndex:cols},pasteType:'PASTE_DATA_VALIDATION'}});
      requests.push({updateCells:{start:{sheetId:c.sheetId,rowIndex:row,columnIndex:0},rows:[{values:c.propuesta.map(dato)}],fields:'userEnteredValue'}});
    }else for(const d of c.diferencias)requests.push({updateCells:{start:{sheetId:c.sheetId,rowIndex:row,columnIndex:d.columna},rows:[{values:[dato(d.despues)]}],fields:'userEnteredValue'}});
    if(c.origen)requests.push({updateCells:{range:{sheetId:c.origen.sheetId,startRowIndex:c.origen.row,endRowIndex:c.origen.row+1,startColumnIndex:0,endColumnIndex:c.origen.width},rows:[],fields:'userEnteredValue'}});
  }
  return requests;
}


