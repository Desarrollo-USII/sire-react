import {esFinalizado,claveTicket,claveRespuesta,ultimasSeis} from './seleccion-respuestas.js';
import {esUSII} from './autores.js';
export default function SeleccionRespuestas({tickets,value,onChange,disabled}){
  const finalizados=tickets.filter(esFinalizado);
  if(!finalizados.length)return null;
  const areas=[...new Set(finalizados.map(t=>t.sistema))].sort((a,b)=>a.localeCompare(b,'es'));
  return <section className="seleccion-finalizados"><div className="respuestas-titulo"><h2>Respuestas para el reporte</h2><span className="seleccion-contador">{finalizados.length} finalizados</span></div><p className="export-ayuda">Abre un área y un ticket para elegir su respuesta. Puedes seleccionar entre las últimas seis que cumplen los filtros; la más reciente queda marcada por defecto.</p>
    {areas.map(area=>{const grupo=finalizados.filter(t=>t.sistema===area);return <details key={area} className="selector-area"><summary><span className="area-inicial" aria-hidden="true">{area.slice(0,2)}</span><strong>{area}</strong><span className="area-cantidad">{grupo.length} {grupo.length===1?'ticket':'tickets'}</span></summary><div className="selector-area-contenido">{grupo.map(t=>{
      const opciones=ultimasSeis(t),clave=claveTicket(t),elegida=value[clave]??(opciones[0]?claveRespuesta(opciones[0]):'');
      const seleccionada=opciones.find(s=>claveRespuesta(s)===elegida);
      return <details key={clave} className="selector-ticket"><summary><span className="ticket-identificador">#{t.id}</span><span className="ticket-respuesta-resumen"><strong>{t.descripcionBreve}</strong><span>{seleccionada?`${seleccionada.personalEnAtencion} · ${seleccionada.fechaTexto}`:'Sin respuesta disponible'}</span></span><span className="respuesta-opciones-total">{opciones.length} {opciones.length===1?'respuesta':'respuestas'}</span></summary>
        <fieldset className="respuestas-lista"><legend>Respuesta que se incluirá en Excel</legend>
        {!opciones.length&&<p>No hay respuestas disponibles; el Excel dejará estos campos vacíos.</p>}
        {opciones.map((s,i)=>{const marcada=elegida===claveRespuesta(s);return <label key={claveRespuesta(s)} className={`opcion-respuesta ${marcada?'elegida':''} ${esUSII(s.personalEnAtencion)?'autor-usii':'autor-sire'}`}>
          <input type="radio" className="form-check-input" name={`respuesta-${clave}`} checked={marcada} onChange={()=>onChange({...value,[clave]:claveRespuesta(s)})} disabled={disabled} />
          <div><div className="opcion-cabecera"><span className="respuesta-persona"><strong>{s.personalEnAtencion}</strong><span className="autor-tipo">{esUSII(s.personalEnAtencion)?'USII':'SIRE'}</span></span><time dateTime={s.fechaISO??undefined}>{s.fechaTexto}</time></div><div className="opcion-indicadores"><span>Respuesta #{s.consecutivo}</span>{i===0&&<span className="respuesta-reciente">Más reciente</span>}{marcada&&<span className="respuesta-elegida">Seleccionada para Excel</span>}</div><p>{s.comentario}</p></div>
        </label>})}</fieldset>
      </details>;
    })}</div></details>})}
  </section>;
}

