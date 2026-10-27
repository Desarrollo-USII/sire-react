import {DOCUMENTO_ID} from './nube-modelo.js';
const STORAGE_KEY='sire.configuracionNube.v1';
export function obtenerIdDocumento(valor){
 const texto=String(valor??'').trim();
 if(/^[\w-]{20,200}$/.test(texto))return texto;
 let url;try{url=new URL(texto);}catch{throw Error('Introduce un enlace válido de Google Drive o el ID del archivo.');}
 if(url.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(url.hostname))throw Error('El archivo debe ser un enlace HTTPS de Google Drive o Google Sheets.');
 const id=url.pathname.match(/^\/(?:spreadsheets\/d|file\/d)\/([\w-]{20,200})(?:\/|$)/)?.[1];
 if(!id)throw Error('No se encontró el ID del archivo en el enlace.');return id;
}
export function validarConfigNube(config){
 const documentoId=obtenerIdDocumento(config.documento),clientId=String(config.clientId??'').trim();
 if(clientId&&!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId))throw Error('El ID de cliente OAuth debe terminar en .apps.googleusercontent.com. No introduzcas una clave secreta.');
 return {documentoId,documento:`https://docs.google.com/spreadsheets/d/${documentoId}/edit`,clientId};
}
export function cargarConfigNube(){
 let guardada;try{guardada=JSON.parse(localStorage.getItem(STORAGE_KEY)??'null');}catch{}
 try{return validarConfigNube(guardada??{documento:DOCUMENTO_ID,clientId:import.meta.env?.VITE_GOOGLE_CLIENT_ID??''});}catch{return validarConfigNube({documento:DOCUMENTO_ID,clientId:''});}
}
export function guardarConfigNube(config){const valida=validarConfigNube(config);localStorage.setItem(STORAGE_KEY,JSON.stringify({documento:valida.documento,clientId:valida.clientId}));return valida;}
export function restablecerConfigNube(){localStorage.removeItem(STORAGE_KEY);return cargarConfigNube();}

