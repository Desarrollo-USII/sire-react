export default function SelectorSistemas({sesiones,value,onChange,disabled}){
  const todas=value.length===sesiones.length;
  return <fieldset className="selector-sistemas"><legend>Áreas del reporte <span className="seleccion-contador">{value.length} / {sesiones.length}</span></legend>
    <div className="sistemas-acciones"><span>{todas?'Todas las áreas incluidas':value.length===1?'1 área incluida':`${value.length} áreas incluidas`}<small>Marca las áreas que quieres exportar.</small></span><div className="btn-group"><button type="button" className="btn btn-outline-secondary btn-sm" disabled={disabled||todas} onClick={()=>onChange([...sesiones])}>Seleccionar todos</button><button type="button" className="btn btn-outline-secondary btn-sm" disabled={disabled||!value.length} onClick={()=>onChange([])}>Quitar todos</button></div></div>
    <div className="sistemas-opciones">{sesiones.map(s=><label key={s} className={value.includes(s)?'area-marcada':''}><input type="checkbox" className="form-check-input" checked={value.includes(s)} disabled={disabled} onChange={e=>onChange(e.target.checked?[...value,s]:value.filter(x=>x!==s))} /><span>{s}</span></label>)}</div>
  </fieldset>;
}
