import SeleccionarTickets from './SeleccionarTickets.jsx';
import ActualizarNube from './ActualizarNube.jsx';
import SelectorSistemas from './SelectorSistemas.jsx';
import {useState} from 'react';
import {Icon} from './Tickets.jsx';
import {sesiones,todosLosTickets,sistemasCargados} from './sistemas.js';
import {seleccionarTickets,resumir} from './reporte-modelo.js';
import Rangos,{rangosVacios} from './Rangos.jsx';
import FiltrosRespuestas from './FiltrosRespuestas.jsx';
import {filtrosRespuestasVacios} from './respuestas-filtros.js';
import SeleccionRespuestas from './SeleccionRespuestas.jsx';
import {aplicarSeleccion,claveTicket} from './seleccion-respuestas.js';
export default function ExportarExcel({onVolver,iniciales={}}){
  const [rangos,setRangos]=useState({...rangosVacios,...Object.fromEntries(Object.keys(rangosVacios).map(k=>[k,iniciales[k]??rangosVacios[k]]))});
  const [sistemas,setSistemas]=useState(()=>iniciales.sistemas??(iniciales.sistema?[iniciales.sistema]:[...sesiones]));
  const [filtrosRespuesta,setFiltrosRespuesta]=useState({...filtrosRespuestasVacios,...Object.fromEntries(Object.keys(filtrosRespuestasVacios).map(k=>[k,iniciales[k]??filtrosRespuestasVacios[k]]))});
  const [ocupado,setOcupado]=useState(false);
  const [mensaje,setMensaje]=useState('');
  const [error,setError]=useState('');
  const [selecciones,setSelecciones]=useState({});
  const [nube,setNube]=useState(false);
  const [excluidos,setExcluidos]=useState([]);
  let candidatos=[],tickets=[],errorRango='';
  try{candidatos=seleccionarTickets(todosLosTickets,{...rangos,sistemas,...filtrosRespuesta});tickets=aplicarSeleccion(candidatos.filter(t=>!excluidos.includes(claveTicket(t))),selecciones);}catch(e){errorRango=e.message;}
  const resumen=resumir(tickets);
  async function exportar(){
    setOcupado(true);setError('');setMensaje('');
    try{
      const res=await fetch('/api/exportar-excel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...rangos,sistemas,...filtrosRespuesta,selecciones,excluirTickets:excluidos})});
      if(!res.ok)throw Error((await res.json()).error||'No se pudo generar el archivo.');
      const blob=await res.blob();const url=URL.createObjectURL(blob);const enlace=document.createElement('a');enlace.href=url;enlace.download='Concentrado de Incidentes.xlsx';document.body.appendChild(enlace);enlace.click();enlace.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      setMensaje(`Archivo generado: ${resumen.total} tickets. ${resumen.finalizados} en Finalizados y ${resumen.nuevoSistema} en Nuevo sistema.`);
    }catch(e){setError(e.message);}finally{setOcupado(false);}
  }
  if(nube)return <ActualizarNube filtros={{...rangos,sistemas,...filtrosRespuesta,selecciones,excluirTickets:excluidos}} onVolver={()=>setNube(false)} />;
  return <main className="app container-fluid export-page">
    <header className="page-header"><div><span className="institution">SIRE WBS</span><h1><Icon name="fa-ticket" className="me-2" />Exportar concentrado de incidentes</h1></div><div className="export-cabecera-acciones"><button type="button" className="btn btn-primary btn-sm" disabled={ocupado||!!errorRango||!tickets.length} onClick={()=>setNube(true)}>Actualizar Google Sheets</button><button className="btn btn-outline-secondary btn-sm" onClick={onVolver}>Volver</button></div></header>
    <p className="resultados">Todos los sistemas · {sistemasCargados.length} de {sesiones.length} con información cargada: {sistemasCargados.join(', ')}</p>
    <div className="export-nube-aviso"><strong>Actualizar el archivo de la nube</strong><span>Se usarán las áreas, fechas y respuestas seleccionadas. Primero verás una comparativa de valores actuales y propuestos; después podrás marcar y confirmar los cambios.</span></div>
    <form className="export-panel border rounded-1" onSubmit={e=>{e.preventDefault();exportar();}}>
      <SelectorSistemas sesiones={sesiones} value={sistemas} disabled={ocupado} onChange={n=>{setSelecciones({});setSistemas(n);setFiltrosRespuesta(v=>({...v,personaRespuesta:''}));setMensaje('');setError('');}} />
      <FiltrosRespuestas value={filtrosRespuesta} onChange={n=>{setSelecciones({});setFiltrosRespuesta(n);setMensaje('');setError('');}} tickets={todosLosTickets.filter(t=>sistemas.includes(t.sistema))} prefix="exportar-respuestas" />
      <Rangos value={rangos} onChange={n=>{setSelecciones({});setRangos(n);setMensaje('');setError('');}} prefix="exportar" />
      <p className="export-ayuda">Los rangos incluyen ambos extremos. Una fila por ticket, con la respuesta elegida para finalizados o la última coincidencia para los demás estatus. Solo se incluyen tickets con una respuesta que cumpla los filtros de seguimiento activos.</p>
      <SeleccionarTickets tickets={candidatos} excluidos={excluidos} disabled={ocupado} onChange={n=>{setExcluidos(n);setSelecciones(v=>Object.fromEntries(Object.entries(v).filter(([k])=>!n.includes(k))));setMensaje('');setError('');}} />
      <SeleccionRespuestas tickets={tickets} value={selecciones} onChange={n=>{setSelecciones(n);setMensaje('');setError('');}} disabled={ocupado} />
      <div className="export-actions"><button type="button" className="btn btn-primary btn-sm" disabled={ocupado||!!errorRango||!tickets.length} onClick={()=>setNube(true)}>Actualizar Google Sheets</button><button className="btn btn-success btn-sm" type="submit" disabled={ocupado||!!errorRango||!tickets.length}>{ocupado?'Generando Excel…':'Exportar Excel'}</button><button className="btn btn-outline-secondary btn-sm" type="button" onClick={()=>{setExcluidos([]);setSelecciones({});setRangos({...rangosVacios});setFiltrosRespuesta({...filtrosRespuestasVacios});setSistemas(iniciales.sistema?[iniciales.sistema]:[...sesiones]);setError('');setMensaje('');}} disabled={ocupado}>Limpiar rangos</button></div>
      {(errorRango||error)&&<p role="alert" className="alert alert-danger py-2 mt-3 mb-0">{errorRango||error}</p>}
      {mensaje&&<p role="status" className="alert alert-success py-2 mt-3 mb-0">{mensaje}</p>}
    </form>
    <div className="export-resumen" role="status"><strong>{resumen.total} tickets para exportar</strong><span>Finalizados: {resumen.finalizados}</span><span>Nuevo sistema: {resumen.nuevoSistema}</span></div>
    <p className="export-ayuda">La plantilla conserva las dos hojas y sus encabezados. «Asunto» contiene la descripción detallada; «Atendio en SIRE» usa el último personal de atención registrado en el rango. Los sistemas sin información cargada no aportan filas.</p>
    {!!tickets.length&&<div className="table-responsive"><table className="table table-sm table-bordered export-preview"><thead><tr><th>Sistema</th><th>Ticket</th><th>Asunto</th><th>Estatus</th><th>Respuesta a exportar</th><th>Enviada por</th><th>Hoja</th></tr></thead><tbody>{tickets.slice().sort((a,b)=>a.sistema.localeCompare(b.sistema)||b.id-a.id).slice(0,20).map(t=><tr key={`${t.sistema}-${t.id}`}><td>{t.sistema}</td><td>{t.id}</td><td className="asunto-detallado">{t.descripcionDetallada}</td><td>{t.estatus}</td><td>{t.ultimaRespuesta?.fechaTexto??'Sin respuesta'}</td><td>{t.ultimaRespuesta?.personalEnAtencion??'—'}</td><td>{t.estatus==='Finalizado'?'Finalizados':'Nuevo sistema'}</td></tr>)}</tbody></table></div>}
    {!tickets.length&&!errorRango&&<p>No hay tickets que coincidan con los filtros.</p>}
  </main>;
}










