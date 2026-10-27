import {esUSII,normalizarDatos} from './autores.js';
import { useState } from 'react';
import { faCirclePlus, faMagnifyingGlass, faScrewdriverWrench, faClock, faFlagCheckered, faCircleCheck, faCircleInfo, faUser, faHeadset, faCalendarDays, faTicket, faFilterCircleXmark, faComments } from '@fortawesome/free-solid-svg-icons';
import datosPredeterminados from './tickets.json';
import { filtrarOrdenar } from './filtros.js';
import Rangos,{rangosVacios} from './Rangos.jsx';
import {seleccionarTickets} from './reporte-modelo.js';
import FiltrosRespuestas from './FiltrosRespuestas.jsx';
import {filtrosRespuestasVacios,hayFiltrosRespuesta} from './respuestas-filtros.js';

const estatusUI = {
  'Nuevo': ['nuevo', 'fa-circle-plus'],
  'en Valoración': ['valoracion', 'fa-magnifying-glass'],
  'en Atención': ['atencion', 'fa-screwdriver-wrench'],
  'en Espera de Respuesta': ['espera', 'fa-clock'],
  'Solicitud de Finalización': ['cierre', 'fa-flag-checkered'],
  'Finalizado': ['finalizado', 'fa-circle-check'],
};
const iconos = { 'fa-circle-plus': faCirclePlus, 'fa-magnifying-glass': faMagnifyingGlass, 'fa-screwdriver-wrench': faScrewdriverWrench, 'fa-clock': faClock, 'fa-flag-checkered': faFlagCheckered, 'fa-circle-check': faCircleCheck, 'fa-circle-info': faCircleInfo, 'fa-user': faUser, 'fa-headset': faHeadset, 'fa-calendar-days': faCalendarDays, 'fa-ticket': faTicket, 'fa-filter-circle-xmark': faFilterCircleXmark, 'fa-comments': faComments };
export function Icon({ name, className = '' }) {
  const [width, height, , , path] = (iconos[name] ?? faCircleInfo).icon;
  return <svg className={`fa-icon ${className}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">{(Array.isArray(path) ? path : [path]).map((d, i) => <path key={i} d={d} fill="currentColor" />)}</svg>;
}
function Respuesta({ s }) {
  const cliente = esUSII(s.personalEnAtencion);
  const cierre = s.comentario?.trim().startsWith('Solicitud de Finalización de Ticket');
  const tipo = cierre ? 'solicitud-cierre' : cliente ? 'cliente' : 'personal';
  return <div className={`respuesta respuesta-${tipo}`}>
    <div className="respuesta-cabecera">
      <span className="respuesta-avatar"><Icon name={cierre ? 'fa-flag-checkered' : cliente ? 'fa-user' : 'fa-headset'} /></span>
      <div className="respuesta-autor"><h4>{s.personalEnAtencion || 'Autor sin identificar'}</h4><span>{cliente ? 'USII' : 'Personal en atención'}</span></div>
      <div className="respuesta-fecha"><span className="respuesta-consecutivo">Respuesta #{s.consecutivo}</span><time dateTime={s.fechaISO}><Icon name="fa-calendar-days" /> {s.fechaTexto}</time></div>
    </div>
    {cierre && <span className="badge insignia-cierre"><Icon name="fa-flag-checkered" /> Solicitud de cierre</span>}
    <p className="respuesta-texto">{s.comentario}</p>
    {['Sí','No'].includes(s.cortesia) && <span className="respuesta-cortesia">Cortesía: {s.cortesia}</span>}
  </div>;
}
export default function Tickets({ datos = normalizarDatos(datosPredeterminados), sesion = 'DCBMI', onInicio, onExportar }) {
  const [buscar, setBuscar] = useState('');
  const [ticket, setTicket] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [estado, setEstado] = useState('');
  const [orden, setOrden] = useState('ticket-desc');
  const [ordenRespuesta, setOrdenRespuesta] = useState('fecha-desc');
  const [rangos,setRangos] = useState({...rangosVacios});
  const [filtrosRespuesta,setFiltrosRespuesta]=useState({...filtrosRespuestasVacios});
  let base=[],errorRango='';
  try{base=seleccionarTickets(datos.tickets,{...rangos,...filtrosRespuesta}).map(t=>({...t,seguimiento:t.respuestasEnRango}));}catch(e){errorRango=e.message;}
  const estados = [...new Set(datos.tickets.map(t => t.estatus))];
  const visibles = filtrarOrdenar(base, {buscar, ticket, respuesta, estado, orden, ordenRespuesta});
  function limpiar() { setFiltrosRespuesta({...filtrosRespuestasVacios}); setRangos({...rangosVacios}); setBuscar(''); setTicket(''); setRespuesta(''); setEstado(''); setOrden('ticket-desc'); setOrdenRespuesta('fecha-desc'); }
  return <section className="app container-fluid">
    <header className="page-header"><div><span className="institution">SIRE WBS</span><h1><Icon name="fa-ticket" className="me-2" />Atención a clientes</h1></div><div className="session-navigation"><span className="badge session-badge">{sesion}</span><button type="button" className="btn btn-success btn-sm" onClick={()=>onExportar({...rangos,...filtrosRespuesta})}>Exportar Excel</button><button type="button" className="btn btn-outline-secondary btn-sm" onClick={onInicio}>Cambiar sesión</button></div></header>
    <p className="resultados" role="status">{visibles.length} de {datos.tickets.length} tickets · {visibles.reduce((n,t) => n+t.respuestasVisibles.length,0)} respuestas · Seguimiento del {datos.metadata.fechaExtraccionSeguimiento}</p>
    <div className="filtros border rounded-1">
      <label>Buscar en descripción<input className="form-control form-control-sm" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Texto de la solicitud" /></label>
      <label>Número de ticket<input className="form-control form-control-sm" inputMode="numeric" value={ticket} onChange={e => setTicket(e.target.value.replace(/\D/g,''))} placeholder="Ej. 7318" /></label>
      <label>Respuesta de seguimiento<input className="form-control form-control-sm" value={respuesta} onChange={e => setRespuesta(e.target.value)} placeholder="Texto de los comentarios" /></label>
      <label>Estatus<select className="form-select form-select-sm" value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos</option>{estados.map(e => <option key={e}>{e}</option>)}</select></label>
      <label>Ordenar tickets<select className="form-select form-select-sm" value={orden} onChange={e => setOrden(e.target.value)}>
        <option value="ticket-desc">Ticket: mayor a menor</option><option value="ticket-asc">Ticket: menor a mayor</option>
        <option value="respuesta-desc">Última respuesta: más reciente</option><option value="respuesta-asc">Última respuesta: más antigua</option>
      </select></label>
      <label>Ordenar respuestas<select className="form-select form-select-sm" value={ordenRespuesta} onChange={e => setOrdenRespuesta(e.target.value)}>
        <option value="fecha-desc">Fecha: más reciente primero</option><option value="fecha-asc">Fecha: más antigua primero</option>
        <option value="texto-asc">Texto: A a Z</option><option value="texto-desc">Texto: Z a A</option>
      </select></label>
      <button className="btn btn-outline-secondary btn-sm" type="button" onClick={limpiar}><Icon name="fa-filter-circle-xmark" className="me-1" />Limpiar filtros</button>
    </div>
    <FiltrosRespuestas value={filtrosRespuesta} onChange={setFiltrosRespuesta} tickets={datos.tickets} prefix="consulta-respuestas" />
    <details className="rangos-consulta"><summary>Filtrar por rangos de tickets y fechas</summary><Rangos value={rangos} onChange={setRangos} prefix="consulta" /><p className="export-ayuda">Rangos inclusivos. La fecha de respuesta filtra también los comentarios mostrados.</p></details>{errorRango&&<p role="alert" className="alert alert-danger py-2">{errorRango}</p>}
    {respuesta.trim() && <p>Se muestran los comentarios que coinciden con la búsqueda. El orden por última respuesta usa las coincidencias.</p>}
    {!visibles.length && <p>No hay resultados. Prueba con otro número o texto.</p>}
    {visibles.map(t => <article className={`ticket ticket-${estatusUI[t.estatus]?.[0] ?? 'neutro'}`} key={t.id}>
      <div className="ticket-heading"><span className="ticket-number">#{t.id}</span><h2>{t.descripcionBreve}</h2><span className={`badge estatus estatus-${estatusUI[t.estatus]?.[0] ?? 'neutro'}`}><Icon name={estatusUI[t.estatus]?.[1] ?? 'fa-circle-info'} /> {t.estatus}</span></div>
      <div className="ticket-meta"><span>Prioridad: <strong>{t.prioridad}</strong></span><span>Posesión: {t.posesion}</span>
      <span>Registro: {t.fechaRegistroTexto}</span><span><Icon name="fa-comments" /> {t.totalSeguimientos} respuestas</span></div>
      <details open={respuesta.trim() || hayFiltrosRespuesta(filtrosRespuesta) ? true : undefined}><summary>Descripción y seguimiento</summary>
        <dl className="ticket-descripciones"><div><dt>Descripción breve</dt><dd>{t.descripcionBreve || 'Sin descripción breve'}</dd></div><div><dt>Descripción detallada</dt><dd>{t.descripcionDetallada || 'Sin descripción detallada'}</dd></div></dl>
        <p>Evaluación: {t.evaluacionServicio ?? 'Sin evaluación'}</p>
        {t.comentariosFinales && <p>{t.comentariosFinales}</p>}
        <h3><Icon name="fa-comments" className="me-1" />Seguimiento ({t.respuestasVisibles.length} de {t.totalSeguimientos ?? 0})</h3><div className="leyenda-respuestas"><span><i className="punto punto-cliente" />USII</span><span><i className="punto punto-personal" />Personal en atención</span><span><i className="punto punto-cierre" />Solicitud de cierre</span></div>
        {t.respuestasVisibles.map(s => <Respuesta key={`${s.consecutivo}-${s.fechaISO??s.fechaTexto}-${s.personalEnAtencion}`} s={s} />)}
      </details>
    </article>)}
  </section>;
}











