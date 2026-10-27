export default function FiltrosRespuestas({value,onChange,tickets,prefix='respuestas'}){
  const personas=[...new Set(tickets.flatMap(t=>(t.seguimiento??[]).map(s=>s.personalEnAtencion)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const cambiar=(clave,valor)=>onChange({...value,[clave]:valor});
  return <fieldset className="filtros-respuestas"><legend>Limitar respuestas de seguimiento</legend><div className="filtros-respuestas-grid">
    <label htmlFor={`${prefix}-palabras`}>Palabras en la respuesta<input id={`${prefix}-palabras`} className="form-control form-control-sm" value={value.palabrasRespuesta} onChange={e=>cambiar('palabrasRespuesta',e.target.value)} placeholder="Ej. error, transferencia" /></label>
    <label htmlFor={`${prefix}-modo`}>Coincidencia de palabras<select id={`${prefix}-modo`} className="form-select form-select-sm" value={value.modoPalabras} onChange={e=>cambiar('modoPalabras',e.target.value)}><option value="todas">Todas las palabras</option><option value="alguna">Alguna de las palabras</option></select></label>
    <label htmlFor={`${prefix}-excluir`}>Excluir respuestas con<input id={`${prefix}-excluir`} className="form-control form-control-sm" value={value.excluirPalabras} onChange={e=>cambiar('excluirPalabras',e.target.value)} placeholder="Ej. finalización, gracias" /></label>
    <label htmlFor={`${prefix}-persona`}>Persona que envió la respuesta<select id={`${prefix}-persona`} className="form-select form-select-sm" value={value.personaRespuesta} onChange={e=>cambiar('personaRespuesta',e.target.value)}><option value="">Todas las personas</option>{personas.map(p=><option key={p}>{p}</option>)}</select></label>
  </div><p className="export-ayuda">Separa palabras con espacios o comas. La búsqueda ignora acentos y mayúsculas; las palabras, la persona y las fechas deben coincidir en la misma respuesta.</p></fieldset>;
}
