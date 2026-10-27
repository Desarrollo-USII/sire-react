import IniciarSesionSire from './IniciarSesionSire.jsx';
import ConfiguracionNube from './ConfiguracionNube.jsx';
import { useEffect,useState } from 'react';
import Tickets, { Icon } from './Tickets.jsx';

import ExportarExcel from './ExportarExcel.jsx';
import {sesiones,datosPorSistema,actualizarDatosSistema} from './sistemas.js';



export default function App() {
  const [areaIngreso,setAreaIngreso]=useState(null);
  const [,refrescar]=useState(0);
  useEffect(()=>{let activo=true;fetch('/api/sire/datos').then(r=>r.ok?r.json():{}).then(datos=>{if(!activo)return;for(const [s,d] of Object.entries(datos))actualizarDatosSistema(s,d);refrescar(n=>n+1);}).catch(()=>{});return()=>{activo=false;};},[]);
  const [configurando,setConfigurando]=useState(false);
  const [sesion, setSesion] = useState(null);
  const [reporte,setReporte] = useState(false);
  const [configExportar,setConfigExportar]=useState({});
  function abrirExportacion(f={}){setConfigExportar(f);setReporte(true);}
  if(areaIngreso)return <IniciarSesionSire sistema={areaIngreso} usuarioInicial={datosPorSistema[areaIngreso]?.metadata.cuenta} onVolver={()=>setAreaIngreso(null)} onCopia={datosPorSistema[areaIngreso]?()=>{setSesion(areaIngreso);setAreaIngreso(null);}:undefined} onCompleto={datos=>{actualizarDatosSistema(areaIngreso,datos);setSesion(areaIngreso);setAreaIngreso(null);refrescar(n=>n+1);}} />;
  if(configurando)return <ConfiguracionNube onVolver={()=>setConfigurando(false)} />;
  if(reporte) return <ExportarExcel iniciales={configExportar} onVolver={()=>setReporte(false)} />;
  if (sesion && datosPorSistema[sesion]) return <Tickets datos={datosPorSistema[sesion]} key={sesion} sesion={sesion} onInicio={() => setSesion(null)} onExportar={f=>abrirExportacion({...f,sistema:sesion})} />;
  return <main className="app container-fluid session-page">
    <header className="page-header"><div><span className="institution">SIRE WBS</span><h1><Icon name="fa-ticket" className="me-2" />Centro de atención</h1></div><div className="nube-acciones"><button className="btn btn-outline-secondary btn-sm" onClick={()=>setConfigurando(true)}>Configurar nube</button><button className="btn btn-success btn-sm" onClick={()=>abrirExportacion()}>Exportar Excel · todos los sistemas</button></div></header>
    {!sesion ? <>
      <div className="session-intro"><h2>Seleccionar sesión</h2><p>Elige el área e inicia sesión en SIRE para recuperar todos sus tickets y respuestas actualizados.</p></div>
      <nav className="row g-3 session-grid" aria-label="Sesiones disponibles">
        {sesiones.map(nombre => <div key={nombre} className="col-12 col-sm-6 col-md-4 col-lg-3"><button className="session-card w-100 text-start" onClick={() => setAreaIngreso(nombre)}>
          <span className="session-card-top"><span className="session-card-icon"><Icon name={!!datosPorSistema[nombre] ? 'fa-comments' : 'fa-ticket'} /></span><span className="session-card-arrow" aria-hidden="true">→</span></span>
          <span className="session-card-name">{nombre}</span>
          <span className={`session-card-note ${!!datosPorSistema[nombre] ? 'disponible' : ''}`}>{!!datosPorSistema[nombre] ? `${datosPorSistema[nombre].tickets.length} tickets · ${datosPorSistema[nombre].metadata.totalSeguimientos} respuestas` : 'Sin datos cargados'}</span>
        </button></div>)}
      </nav>
      <p className="session-footnote">Cada sesión muestra únicamente la información de su área.</p>
    </> : <>
      <div className="session-empty-toolbar"><span className="badge session-badge">{sesion}</span><button className="btn btn-outline-secondary btn-sm" onClick={() => setSesion(null)}>Cambiar sesión</button></div>
      <div className="session-empty border rounded-1"><span className="empty-icon"><Icon name="fa-circle-info" /></span><h2>{sesion}</h2><p>Todavía no hay tickets ni respuestas cargados para esta sesión.</p><button className="btn btn-outline-secondary btn-sm" onClick={() => setSesion(null)}>Volver al menú inicial</button></div>
    </>}
  </main>;
}







