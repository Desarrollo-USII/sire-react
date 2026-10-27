import {CUENTA_GOOGLE,SCOPES_GOOGLE,verificarCuentaGoogle} from './cuenta-google.js';
import ConfiguracionNube from './ConfiguracionNube.jsx';
import {cargarConfigNube} from './config-nube.js';
import {useEffect,useRef,useState} from 'react';
import {compararReporte} from './nube-modelo.js';
import {actualizarArchivo,actualizarHojaNativa,obtenerReporteNube,procesarArchivo,cargarIdentidad,leerDocumento} from './nube-google.js';
const mostrar=(v,campo)=>{if(v===''||v===null||v===undefined)return 'Vacío';if(typeof v==='number'&&campo?.toLowerCase().includes('fecha'))return new Date(Date.UTC(1899,11,30)+v*86400000).toLocaleDateString('es-MX',{timeZone:'UTC'});return String(v);};
export default function ActualizarNube({filtros,onVolver}){
  const [config,setConfig]=useState(cargarConfigNube),[configurando,setConfigurando]=useState(false);
  const clientId=config.clientId;
  const [lista,setLista]=useState(false),[conectado,setConectado]=useState(false),[ocupado,setOcupado]=useState(false);
  const [error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[revision,setRevision]=useState(null),[elegidos,setElegidos]=useState([]),[confirmar,setConfirmar]=useState(false);
  const credencial=useRef(null),aplicando=useRef(false),intentoOAuth=useRef(0),temporizadorOAuth=useRef(null);
  const [autenticando,setAutenticando]=useState(false);
  useEffect(()=>{cargarIdentidad().then(()=>setLista(true)).catch(e=>setError(e.message));return()=>{credencial.current=null;intentoOAuth.current++;clearTimeout(temporizadorOAuth.current);};},[]);
  function cancelarConexion(mensaje='Conexión cancelada. Puedes volver a intentarlo.'){
    intentoOAuth.current++;clearTimeout(temporizadorOAuth.current);setOcupado(false);setAutenticando(false);setError(mensaje);
  }
  function conectar(){
    if(ocupado)return;
    setError('');if(!clientId.trim().endsWith('.apps.googleusercontent.com')){setError('Introduce el ID público del cliente OAuth web de Google.');return;}
    const intento=++intentoOAuth.current;
    credencial.current=null;setConectado(false);setRevision(null);setElegidos([]);setConfirmar(false);setMensaje('');setOcupado(true);setAutenticando(true);
    temporizadorOAuth.current=setTimeout(()=>{if(intento===intentoOAuth.current)cancelarConexion('Pasaron 5 minutos sin recibir la autorización de Google. Vuelve a conectar y completa el acceso en la ventana de Google. Si muestra «Acceso bloqueado», revisa el detalle de ese mensaje.');},300000);
    try{
      const client=window.google.accounts.oauth2.initTokenClient({client_id:clientId.trim(),scope:SCOPES_GOOGLE,login_hint:CUENTA_GOOGLE,prompt:'',callback:async r=>{
        if(intento!==intentoOAuth.current)return;
        clearTimeout(temporizadorOAuth.current);
        try{
          if(r.error)throw Error(r.error_description??r.error);
          if(!window.google.accounts.oauth2.hasGrantedAllScopes(r,'openid','email','https://www.googleapis.com/auth/drive'))throw Error('Autoriza el acceso al correo de la cuenta y a Google Drive para continuar.');
          await verificarCuentaGoogle(r.access_token);
          if(intento!==intentoOAuth.current)return;
          credencial.current={token:r.access_token,hasta:Date.now()+Number(r.expires_in)*1000};setConectado(true);setMensaje(`Conectado con ${CUENTA_GOOGLE}. Ya puedes comparar el Excel en Drive.`);
        }catch(e){if(intento===intentoOAuth.current){credencial.current=null;setConectado(false);setError(e.message);}}finally{if(intento===intentoOAuth.current){setOcupado(false);setAutenticando(false);}}
      },error_callback:e=>{if(intento!==intentoOAuth.current)return;cancelarConexion(e.type==='popup_failed_to_open'?'El navegador no pudo abrir la ventana de Google. Permite ventanas emergentes para esta página y vuelve a intentar.':e.type==='popup_closed'?'La ventana de Google se cerró sin completar la autorización.':'No se completó el acceso de Google. Puedes volver a intentarlo.');}});
      client.requestAccessToken({prompt:'',login_hint:CUENTA_GOOGLE});
    }catch(e){cancelarConexion(e.message);}
  }  function token(){if(!credencial.current||Date.now()>=credencial.current.hasta){setConectado(false);throw Error('Conecta tu cuenta de Google para continuar.');}return credencial.current.token;}
  async function comparar(){setOcupado(true);setError('');setMensaje('');setRevision(null);setConfirmar(false);try{
    const documento=await leerDocumento(token(),config.documentoId);let data;
    if(documento.tipo==='sheets'){const reporte=await obtenerReporteNube(filtros);data={reporte,remoto:documento.remoto,plan:compararReporte(reporte,documento.remoto)};}else data=await procesarArchivo({archivo:documento.archivo,filtros});
    setRevision({...data,documento});setElegidos(data.plan.cambios.map(c=>c.id));
  }catch(e){setError(e.message);}finally{setOcupado(false);}}
  async function aplicar(){
    if(aplicando.current||!confirmar||!revision||revision.referencia||!elegidos.length)return;aplicando.current=true;setOcupado(true);setError('');setMensaje('');let enviado=false;
    try{const t=token();
      if(revision.documento.tipo==='sheets'){
        const seleccion=revision.plan.cambios.filter(c=>elegidos.includes(c.id));
        const verificado=await actualizarHojaNativa(t,seleccion,revision.documento,config.documentoId);enviado=true;
        const pendientes=compararReporte(revision.reporte,verificado.remoto);
        if([...pendientes.cambios,...pendientes.conflictos].some(c=>elegidos.includes(c.id)))throw Error('La actualización se envió, pero quedan diferencias pendientes. Compara de nuevo antes de continuar.');
        setRevision({documento:verificado,reporte:revision.reporte,remoto:verificado.remoto,plan:pendientes});setElegidos([]);setConfirmar(false);setMensaje(`Actualización verificada: ${seleccion.length} tickets en Google Sheets.`);return;
      }
      const actual=await leerDocumento(t,config.documentoId);if(actual.version!==revision.documento.version||actual.archivo!==revision.documento.archivo){setRevision(null);throw Error('El archivo cambió después de la comparación. Vuelve a comparar antes de confirmar.');}
      const preparado=await procesarArchivo({archivo:actual.archivo,filtros,elegidos});await actualizarArchivo(t,preparado.archivo,actual,config.documentoId);enviado=true;setConfirmar(false);
      const verificado=await leerDocumento(t,config.documentoId);if(verificado.archivo!==preparado.archivo)throw Error('Google recibió la actualización, pero no fue posible verificar el archivo guardado. Vuelve a comparar.');
      setRevision(null);setElegidos([]);setMensaje(`Actualización verificada: ${preparado.aplicados} tickets en el Excel de Drive. Se conservó el formato .xlsm.`);
    }catch(e){if(enviado){setRevision(null);setConfirmar(false);}setError(e.message);}finally{setOcupado(false);aplicando.current=false;}
  }  const cambios=revision?.plan.cambios??[];
  if(configurando)return <ConfiguracionNube onVolver={()=>setConfigurando(false)} onGuardar={n=>{setConfig(n);credencial.current=null;setConectado(false);setRevision(null);setElegidos([]);setConfirmar(false);setError('');setMensaje('Configuración actualizada. Conecta Google y compara de nuevo.');}} />;
  return <main className="app container-fluid nube-page"><header className="page-header"><div><span className="institution">SIRE WBS · GOOGLE SHEETS</span><h1>Revisar y actualizar en la nube</h1></div><button className="btn btn-outline-secondary btn-sm" disabled={ocupado} onClick={onVolver}>Volver al reporte</button></header>
    <p className="resultados">Se usarán las áreas, fechas y respuestas seleccionadas en el reporte.</p><a href={config.documento} target="_blank" rel="noreferrer">Abrir documento de destino ↗</a>
    <section className="nube-panel"><h2>1. Conectar con Google</h2><p>Cuenta de conexión: {CUENTA_GOOGLE}. Google comprobará tu sesión y solicitará autorización cuando sea necesario.</p><div className="nube-destino"><span className={`badge ${clientId?'text-bg-primary':'text-bg-secondary'}`}>{clientId?'Configuración guardada':'Configuración pendiente'}</span><button type="button" className="btn btn-outline-secondary btn-sm" disabled={ocupado} onClick={()=>setConfigurando(true)}>Configurar conexión y archivo</button></div>{!clientId&&<p className="export-ayuda">Agrega el ID público de cliente OAuth en la configuración para habilitar la conexión.</p>}<div className="nube-acciones"><button className="btn btn-outline-primary btn-sm" disabled={!lista||ocupado||!clientId} onClick={conectar}>{autenticando?'Esperando a Google…':conectado?'Reconectar cuenta de Google':'Conectar con Google'}</button>{autenticando&&<><button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>cancelarConexion()}>Cancelar conexión</button><span role="status">Completa el acceso en la ventana de Google. Tienes hasta 5 minutos.</span></>}{conectado&&<span className="badge text-bg-success">Autorizado</span>}</div></section>    <section className="nube-panel"><h2>2. Comparar diferencias</h2><p>Se comparan los tickets por número y área en «Nuevo sistema» y «Finalizados». Las filas ajenas al reporte se conservan. Los valores locales vacíos conservan el contenido existente.</p><div className="nube-acciones"><button className="btn btn-primary btn-sm" disabled={!conectado||ocupado} onClick={comparar}>{ocupado?'Procesando…':'Comparar con Google Sheets'}</button></div><p className="export-ayuda">La comparación lee el documento actual de Google Sheets. Solo se aplicarán los tickets que marques y confirmes.</p>
    {revision&&<><div className="export-resumen"><strong>{cambios.length} tickets con diferencias</strong><span>{revision.plan.conflictos.length} conflictos</span><span>{revision.reporte.resumen.total} tickets comparados</span></div><p className="export-ayuda">Documento: {revision.documento.titulo}. Revisa cada cambio. Un traslado agrega el ticket en su hoja de destino y vacía sus columnas en la hoja de origen; no elimina la fila.</p>
    {!!cambios.length&&<><div className="nube-acciones"><button className="btn btn-outline-secondary btn-sm" disabled={ocupado} onClick={()=>{setElegidos(cambios.map(c=>c.id));setConfirmar(false);}}>Marcar todos</button><button className="btn btn-outline-secondary btn-sm" disabled={ocupado} onClick={()=>{setElegidos([]);setConfirmar(false);}}>Quitar todos</button><span>{elegidos.length} tickets marcados</span></div>{cambios.map(c=><article className="nube-cambio" key={c.id}><div className="nube-cambio-titulo"><label><input className="form-check-input" type="checkbox" checked={elegidos.includes(c.id)} disabled={ocupado} onChange={e=>{setElegidos(e.target.checked?[...elegidos,c.id]:elegidos.filter(k=>k!==c.id));setConfirmar(false);}} /> #{c.ticket} · {c.area}</label><span className={`badge ${c.tipo==='Nuevo'?'text-bg-success':c.tipo==='Traslado'?'text-bg-warning':'text-bg-primary'}`}>{c.tipo}</span><span>{c.hoja}</span></div><details><summary>Ver valores actuales y propuestos ({c.diferencias.length} campos)</summary><div className="table-responsive"><table className="table table-sm table-bordered"><thead><tr><th>Campo</th><th>Actual en Google</th><th>Propuesto</th></tr></thead><tbody>{c.diferencias.map(d=><tr key={d.columna}><th>{d.campo}</th><td>{mostrar(d.antes,d.campo)}</td><td>{mostrar(d.despues,d.campo)}</td></tr>)}</tbody></table></div>{c.origen&&<><div className="table-responsive"><table className="table table-sm table-bordered"><thead><tr><th>Datos que se retirarán del origen</th><th>Valor actual</th></tr></thead><tbody>{c.origen.columnas.map((campo,i)=><tr key={i}><th>{campo}</th><td>{mostrar(c.origen.datos[i],campo)}</td></tr>)}</tbody></table></div><p className="alert alert-warning">Se vaciarán las columnas del ticket en «{c.origen.nombre}», fila {c.origen.row+1}. Revisa los datos del origen antes de confirmar.</p></>}</details></article>)}</>}
    {!cambios.length&&!revision.plan.conflictos.length&&<p className="alert alert-success">El documento ya coincide con el reporte.</p>}
    {revision.plan.conflictos.map(c=><p key={c.id} className="alert alert-warning">#{c.ticket} · {c.area}: {c.motivo} No se modificará este ticket.</p>)}</>}
    </section>
    {revision&&!!cambios.length&&<section className="nube-panel"><h2>3. Confirmar actualización</h2><label className="nube-confirmar"><input type="checkbox" className="form-check-input" checked={confirmar} disabled={ocupado||!conectado||revision.referencia||!elegidos.length} onChange={e=>setConfirmar(e.target.checked)} />Revisé las diferencias y autorizo aplicar {elegidos.length} tickets en el documento enlazado.</label><button className="btn btn-success btn-sm" disabled={ocupado||!conectado||revision.referencia||!confirmar||!elegidos.length} onClick={aplicar}>Confirmar y actualizar Google Sheets</button><p className="export-ayuda">Se vuelve a leer el documento antes de escribir. Si cambió desde la comparación, se pedirá una nueva revisión.</p></section>}
    {error&&<p role="alert" className="alert alert-danger">{error}</p>}{mensaje&&<p role="status" className="alert alert-success">{mensaje}</p>}
  </main>;
}









