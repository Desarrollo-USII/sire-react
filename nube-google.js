import {DOCUMENTO_ID,solicitudesCambios} from './nube-modelo.js';

const raizDocumento=id=>`https://www.googleapis.com/drive/v3/files/${id}`;
async function checked(res){if(!res.ok){let data;try{data=await res.json();}catch{}throw Error(res.status===403&&data?.error?.message?.includes('sheets.googleapis.com')?'Habilita Google Sheets API en el proyecto de Google Cloud del cliente OAuth y vuelve a comparar.':res.status===404?`No se encontró el archivo o la cuenta configurada no tiene acceso. Verifica el enlace en Configurar nube y comparte ese Excel con la cuenta indicada como Editor.`:res.status===401?'La sesión de Google expiró. Vuelve a conectar.':res.status===412?'El archivo cambió. Vuelve a comparar antes de confirmar.':data?.error?.message??'Google Drive no respondió correctamente.');}return res;}
export async function leerDocumento(token,documentoId=DOCUMENTO_ID){
 const root=raizDocumento(documentoId);
 const metaRes=await checked(await fetch(root+'?supportsAllDrives=true&fields=id,name,mimeType,version,modifiedTime,capabilities(canEdit)',{headers:{Authorization:`Bearer ${token}`}}));const meta=await metaRes.json();
 if(!meta.capabilities?.canEdit)throw Error('Tu cuenta no tiene permiso para editar este archivo.');
 if(meta.mimeType==='application/vnd.google-apps.spreadsheet')return {tipo:'sheets',documentoId,version:meta.version,titulo:meta.name,remoto:await leerHojaNativa(token,documentoId)};
 if(meta.mimeType!=='application/vnd.ms-excel.sheet.macroenabled.12')throw Error('El documento de destino ya no es un Excel .xlsm. Revisa su formato.');
 const media=await checked(await fetch(root+'?alt=media&supportsAllDrives=true',{headers:{Authorization:`Bearer ${token}`}}));const bytes=new Uint8Array(await media.arrayBuffer());if(bytes.length>8000000)throw Error('El archivo supera el límite de 8 MB.');let bin='';for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode(...bytes.subarray(i,i+32768));return {tipo:'office',archivo:btoa(bin),version:meta.version,titulo:meta.name,etag:metaRes.headers.get('etag')};
}
export async function procesarArchivo(datos){const res=await fetch('/api/nube-office',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(datos)});const data=await res.json();if(!res.ok)throw Error(data.error);return data;}
export async function actualizarArchivo(token,archivo,baseline,documentoId=DOCUMENTO_ID){
 const actual=await leerDocumento(token,documentoId);if(actual.version!==baseline.version||actual.archivo!==baseline.archivo)throw Error('El archivo cambió después de la revisión. Vuelve a comparar.');
 const binary=atob(archivo),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/vnd.ms-excel.sheet.macroenabled.12'};if(actual.etag)headers['If-Match']=actual.etag;
 await checked(await fetch(`https://www.googleapis.com/upload/drive/v3/files/${documentoId}?uploadType=media&supportsAllDrives=true`,{method:'PATCH',headers,body:bytes}));
}
export function convertirHojaNativa(data){
 return {titulo:data.properties.title,hojas:data.sheets.map(s=>({nombre:s.properties.title,sheetId:s.properties.sheetId,rowCount:s.properties.gridProperties.rowCount,rows:(s.data?.[0]?.rowData??[]).map(r=>r.values??[])}))};
}
async function leerHojaNativa(token,documentoId){
 const root=`https://sheets.googleapis.com/v4/spreadsheets/${documentoId}`,headers={Authorization:`Bearer ${token}`};
 const meta=await (await checked(await fetch(root+'?fields=properties(title),sheets(properties)',{headers}))).json();
 const hojas=['Nuevo sistema','Finalizados'].map(nombre=>{const sheet=meta.sheets.find(s=>s.properties.title===nombre);if(!sheet)throw Error(`Falta la hoja «${nombre}» en el documento.`);return sheet;});
 const datos=[];
 for(const sheet of hojas){
  const p=sheet.properties;
  if(p.gridProperties.rowCount>10000||p.gridProperties.columnCount>100)throw Error('El documento supera el tamaño admitido para la comparación.');
  const params=new URLSearchParams({fields:'properties(title),sheets(properties,data(rowData(values(userEnteredValue,effectiveValue,dataValidation))))'});
  const col=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
  params.append('ranges',`'${p.title.replaceAll("'","''")}'!A1:${col(p.gridProperties.columnCount)}${p.gridProperties.rowCount}`);
  const data=await (await checked(await fetch(root+'?'+params,{headers}))).json();datos.push(...data.sheets);
 }
 return convertirHojaNativa({properties:meta.properties,sheets:datos});
}
export async function obtenerReporteNube(filtros){
 const res=await fetch('/api/reporte-nube',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(filtros)});const data=await res.json();if(!res.ok)throw Error(data.error);return data;
}
export async function actualizarHojaNativa(token,cambios,baseline,documentoId){
 const actual=await leerDocumento(token,documentoId);
 if(actual.tipo!=='sheets'||actual.version!==baseline.version||JSON.stringify(actual.remoto)!==JSON.stringify(baseline.remoto))throw Error('El documento cambió después de la comparación. Vuelve a comparar antes de confirmar.');
 const requests=solicitudesCambios(cambios,actual.remoto);
 if(!requests.length)throw Error('No hay cambios seleccionados.');
 await checked(await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${documentoId}:batchUpdate`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({requests})}));
 return leerDocumento(token,documentoId);
}
let identidad;
export function cargarIdentidad(){
 if(window.google?.accounts?.oauth2)return Promise.resolve();
 identidad??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=()=>{identidad=null;reject(Error('No se pudo cargar el acceso de Google. Revisa la conexión.'));};document.head.appendChild(script);});return identidad;
}




