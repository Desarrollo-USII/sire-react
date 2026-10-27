export const rangosVacios={ticketDesde:'',ticketHasta:'',creacionDesde:'',creacionHasta:'',respuestaDesde:'',respuestaHasta:''};
export default function Rangos({value,onChange,prefix='rango'}){
  const campo=(key,label,type)=> <label htmlFor={`${prefix}-${key}`}>{label}<input id={`${prefix}-${key}`} className="form-control form-control-sm" type={type} min={type==='number'?'1':undefined} step={type==='number'?'1':undefined} value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})} /></label>;
  return <div className="rangos-grid">
    <fieldset><legend>Número de ticket</legend><div>{campo('ticketDesde','Ticket desde','number')}{campo('ticketHasta','Ticket hasta','number')}</div></fieldset>
    <fieldset><legend>Fecha de creación del ticket</legend><div>{campo('creacionDesde','Creación desde','date')}{campo('creacionHasta','Creación hasta','date')}</div></fieldset>
    <fieldset><legend>Fecha de respuesta</legend><div>{campo('respuestaDesde','Respuesta desde','date')}{campo('respuestaHasta','Respuesta hasta','date')}</div></fieldset>
  </div>;
}
