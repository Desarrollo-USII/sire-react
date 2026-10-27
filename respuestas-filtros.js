import {autorRespuesta} from './autores.js';
export const filtrosRespuestasVacios={palabrasRespuesta:'',excluirPalabras:'',modoPalabras:'todas',personaRespuesta:''};
export const normalizarRespuesta=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const terminos=v=>normalizarRespuesta(v).split(/[\s,;]+/).filter(Boolean);
export const hayFiltrosRespuesta=f=>!!(f.palabrasRespuesta?.trim()||f.excluirPalabras?.trim()||f.personaRespuesta);
export function coincideRespuesta(s,f={}){
  const texto=normalizarRespuesta(s.comentario);
  const incluir=terminos(f.palabrasRespuesta),excluir=terminos(f.excluirPalabras);
  return (!f.personaRespuesta||normalizarRespuesta(autorRespuesta(s.personalEnAtencion))===normalizarRespuesta(autorRespuesta(f.personaRespuesta))) &&
    (!incluir.length||(f.modoPalabras==='alguna'?incluir.some(t=>texto.includes(t)):incluir.every(t=>texto.includes(t)))) &&
    !excluir.some(t=>texto.includes(t));
}

