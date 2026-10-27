const clave = valor => String(valor??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const equivalencias = new Map([['presupuesto','presupuestos'],['en espera de respuesta','espera de respuesta']]);
export function ajustarValidaciones(fila,reglas,contexto=''){
  const resultado=[...fila];
  for(const {columna,valores} of reglas){
    const indice=columna.charCodeAt(0)-65,actual=resultado[indice];
    if(actual===null||actual===undefined||actual==='')continue;
    const buscada=equivalencias.get(clave(actual))??clave(actual);
    const permitido=valores.find(v=>clave(v)===buscada);
    if(permitido===undefined)throw Error(`No se puede exportar ${contexto}: el valor «${actual}» de la columna ${columna} no está permitido por la plantilla.`);
    resultado[indice]=permitido;
  }
  return resultado;
}
