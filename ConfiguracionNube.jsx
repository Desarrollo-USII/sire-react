import {CUENTA_GOOGLE} from './cuenta-google.js';
import {useState} from 'react';
import {cargarConfigNube,guardarConfigNube,restablecerConfigNube} from './config-nube.js';
export default function ConfiguracionNube({onVolver,onGuardar}){
 const [config,setConfig]=useState(cargarConfigNube),[error,setError]=useState(''),[mensaje,setMensaje]=useState('');
 const cambiar=(campo,valor)=>{setConfig(c=>({...c,[campo]:valor}));setError('');setMensaje('');};
 function guardar(e){e.preventDefault();try{const nueva=guardarConfigNube(config);setConfig(nueva);setMensaje(nueva.clientId?'Configuración guardada. Ya puedes conectar Google y comparar el archivo.':'Archivo guardado. Falta el ID de cliente OAuth para conectar Google.');onGuardar?.(nueva);}catch(e){setError(e.message);}}
 return <main className="app container-fluid nube-page"><header className="page-header"><div><span className="institution">SIRE WBS · CONFIGURACIÓN</span><h1>Configurar hoja en la nube</h1></div><button className="btn btn-outline-secondary btn-sm" onClick={onVolver}>Volver</button></header>
 <p className="resultados">Configura el archivo de Google Drive que se actualizará después de revisar y confirmar las diferencias.</p>
 <form className="nube-panel config-nube-form" onSubmit={guardar}><h2>Archivo y conexión</h2><div className="cuenta-google-fija"><span>Cuenta de Google</span><strong>{CUENTA_GOOGLE}</strong><small>Se verificará esta cuenta al conectar. La contraseña se introduce únicamente en Google cuando lo solicite.</small></div>
 <label>Enlace o ID del documento<input className="form-control form-control-sm" value={config.documento} onChange={e=>cambiar('documento',e.target.value)} required placeholder="https://drive.google.com/file/d/…/view" /><small>Selecciona una hoja de Google Sheets con las pestañas «Nuevo sistema» y «Finalizados».</small></label>
 <label>ID público de cliente OAuth de Google<input className="form-control form-control-sm" value={config.clientId} onChange={e=>cambiar('clientId',e.target.value)} placeholder="…apps.googleusercontent.com" autoComplete="off" spellCheck={false} /><small>Este identificador permite iniciar sesión desde la página. No es una contraseña ni una clave secreta.</small></label>
 <div className="config-nube-estado"><span className={`badge ${config.clientId?'text-bg-primary':'text-bg-secondary'}`}>{config.clientId?'ID capturado':'Conexión pendiente'}</span><span>Formato: Google Sheets nativo</span><span>Confirmación de cambios: obligatoria</span></div>
 <div className="nube-acciones"><button className="btn btn-primary btn-sm" type="submit">Guardar configuración</button><button className="btn btn-outline-secondary btn-sm" type="button" onClick={()=>{const nueva=restablecerConfigNube();setConfig(nueva);setError('');setMensaje('Se restauró la configuración inicial.');onGuardar?.(nueva);}}>Restablecer valores iniciales</button></div>
 {error&&<p role="alert" className="alert alert-danger">{error}</p>}{mensaje&&<p role="status" className="alert alert-success">{mensaje}</p>}
 <p className="export-ayuda">Se guardan el enlace y el ID público en este navegador. El acceso a Google se solicita al conectar y no se guarda aquí. Guardar la configuración no modifica el Excel.</p></form>
 <section className="nube-panel"><h2>Crear el ID de conexión</h2><ol className="config-nube-pasos"><li>Abre <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noreferrer">Google Cloud</a> y habilita Google Drive API y <a href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noreferrer">Google Sheets API</a> en tu proyecto.</li><li>Configura el consentimiento OAuth. Si tu aplicación está en pruebas, agrega tu correo como usuario de prueba.</li><li>Crea un cliente OAuth de tipo «Aplicación web» y agrega este origen autorizado: <code>{window.location.origin}</code>.</li><li>Copia el ID público del cliente, pégalo arriba y guarda.</li><li>En «Revisar cambios en la nube», conecta Google, compara el archivo y confirma los tickets que quieras actualizar.</li></ol></section></main>;
}



