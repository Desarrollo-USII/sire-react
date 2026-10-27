import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/UV/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const ORIGEN='https://siresoporte.com.mx:62341/SireWBS';
const cache=new URL('./cache-sire/',import.meta.url);
const sesiones=JSON.parse(await fs.readFile(new URL('../sistemas.json',import.meta.url),'utf8'));
const activos=new Set();
export async function leerCacheSire(sistema){try{return JSON.parse(await fs.readFile(new URL(sistema+'.json',cache),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function estable(page){await page.waitForLoadState('networkidle',{timeout:20000});}
async function listado(page){return page.locator('#view1_Tickets_echo').evaluate(root=>{
 const field=(r,n)=>{const e=r.querySelector('.app-field-'+n);return !e||e.classList.contains('app-null')?null:(e.innerText||e.textContent).trim();};
 return {total:Number(root.querySelector('h3')?.textContent.match(/\((\d+)\)/)?.[1]??0),next:!!root.querySelector('.app-btn-next:not(.app-btn-disabled)'),tickets:[...root.querySelectorAll('li.dv-item')].map(r=>({id:Number(field(r,'IDTicket')),fechaRegistroVisible:field(r,'FechaRegistro'),fechaRegistroTexto:r.querySelector('.app-field-FechaRegistro')?.title.split('\n').slice(1).join('\n'),estatus:field(r,'TheidEstatusTicketnombreEstatus'),posesion:field(r,'Pertenencia'),descripcionBreve:field(r,'NombreTicket'),descripcionDetallada:field(r,'DescripcionTicket'),prioridad:field(r,'IDPrioridadClienteprioridad'),evaluacionServicio:field(r,'TheidEvaluacionticketnombreevaluacionticket'),comentariosFinales:field(r,'ComentariosF')}))};
 });}
async function respuestas(page){return page.locator('#view1_SeguimientoTickets_echo').evaluate(root=>{
 const field=(r,n)=>(r.querySelector('.app-field-'+n+' .app-field-data')?.innerText??'').trim();
 return {total:Number(root.querySelector('h3')?.textContent.match(/\((\d+)\)/)?.[1]??0),next:!!root.querySelector('.app-btn-next:not(.app-btn-disabled)'),rows:[...root.querySelectorAll('li.dv-item')].map(r=>{const d=r.querySelector('.app-field-FechaRegistro');const raw=d?.getAttribute('data-smart-value')??d?.querySelector('[data-smart-value]')?.getAttribute('data-smart-value');let fechaISO=null;try{fechaISO=raw?JSON.parse(raw):null;}catch{}return {consecutivo:Number(field(r,'Consecutivo')),fechaTexto:d?.title.split('\n').slice(1).join('\n'),fechaVisible:field(r,'FechaRegistro'),fechaISO,comentario:field(r,'RespuestaSeguimiento'),cortesia:field(r,'Cortesia'),personalEnAtencion:field(r,'IdPersonalAtiendenombrePers')};})};
 });}
export function verificarCaptura(datos){
 if(datos.tickets.length!==datos.metadata.totalReportado||new Set(datos.tickets.map(t=>t.id)).size!==datos.tickets.length)throw Error('No fue posible verificar todos los tickets. No se guardó la captura.');
 for(const t of datos.tickets){if(t.totalSeguimientos!==t.seguimiento.length)throw Error('Seguimiento incompleto.');const claves=t.seguimiento.map(s=>JSON.stringify([s.consecutivo,s.fechaISO,s.fechaTexto,s.comentario]));if(new Set(claves).size!==claves.length)throw Error('Se detectó una página de seguimiento repetida.');}
}
export async function sincronizarSire({sistema,usuario,password},informar,signal){
 if(!Object.hasOwn(sesiones,sistema))throw Error('Área no válida.');
 if(!usuario||!password)throw Error('Introduce tu usuario y contraseña de SIRE.');
 usuario=usuario.trim().toUpperCase();
 if(activos.has(sistema))throw Error('Esta área ya se está actualizando. Espera a que termine.');
 activos.add(sistema);let browser,etapa='inicio';
 const abortar=()=>browser?.close().catch(()=>{});
 try{
  informar({tipo:'avance',mensaje:'Conectando con SIRE…',tickets:0,total:0,respuestas:0});
  const {chromium}=require('playwright');
  browser=await chromium.launch({channel:'chrome',headless:true});
  if(signal.aborted)throw Error('Cancelado.');signal.addEventListener('abort',abortar,{once:true});
  const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(20000);
  await page.goto(ORIGEN+'/Pages/Home.aspx',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-user-name').fill(usuario);await page.locator('#login-password').fill(password);password='';
  await page.getByRole('button',{name:'Acceder',exact:true}).click();
  try{await page.getByRole('heading',{name:'Mapa del Sitio',exact:true}).waitFor({state:'visible',timeout:25000});}catch{throw Error('SIRE no confirmó el acceso. Revisa el usuario y contraseña o intenta de nuevo más tarde.');}

  const cuentaCorrecta=await page.locator('.app-bar-toolbar').evaluate((el,u)=>[...el.querySelectorAll('[title],[aria-label]')].some(n=>(n.getAttribute('title')??n.getAttribute('aria-label')??'').includes(u))||el.textContent.includes(u),usuario);
  if(!cuentaCorrecta)throw Error('No fue posible comprobar la cuenta abierta en SIRE.');
  informar({tipo:'avance',mensaje:'Acceso confirmado. Obteniendo tickets y seguimiento…',tickets:0,total:0,respuestas:0});
  await page.goto(ORIGEN+'/Pages/Atencion2Clientes.aspx',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#view1_Tickets_echo').waitFor({state:'visible'});await estable(page);
  const primera=await listado(page),tickets=[],paginas=new Set();let totalRespuestas=0;
  const registro={metadata:{sistema,cuenta:usuario,fuente:ORIGEN+'/Pages/Atencion2Clientes.aspx',totalReportado:primera.total,adjuntos:'No descargados',sincronizacion:'Actualizado al iniciar sesión',fechaExtraccion:new Date().toLocaleDateString('en-CA',{timeZone:'America/Mexico_City'}),fechaExtraccionSeguimiento:new Date().toLocaleDateString('en-CA',{timeZone:'America/Mexico_City'}),actualizadoEn:new Date().toISOString()},tickets};
  let seguir=true;
  while(seguir){
   if(signal.aborted)throw Error('Cancelado.');const pagina=await listado(page);
   if(pagina.total!==primera.total)throw Error('La lista de SIRE cambió durante la carga. Inicia sesión otra vez para obtener una captura completa.');
   const firma=pagina.tickets.map(t=>t.id).join(',');if(paginas.has(firma))throw Error('SIRE repitió una página de tickets.');paginas.add(firma);
   if(!pagina.tickets.length&&pagina.total>0)throw Error('SIRE no entregó los tickets de esta página.');
   for(const t of pagina.tickets){
    if(tickets.some(x=>x.id===t.id))throw Error('SIRE repitió un ticket durante la carga.');
    etapa='ticket '+t.id+': seleccionar';
    const anterior=await page.locator('#view1_SeguimientoTickets_echo .app-echo-inner').textContent({timeout:500}).catch(()=>null);
    let row=page.locator('#view1_Tickets_echo li.dv-item > div.ui-btn').filter({has:page.locator('.app-field-IDTicket').filter({hasText:new RegExp('^'+t.id+'$')})});
    await page.locator('#view1_Tickets_echo .app-field-IDTicket').filter({hasText:new RegExp('^'+t.id+'$')}).click();await estable(page);
    const seleccionado=await page.locator('#view1_Tickets_echo .ui-btn.app-selected .app-field-IDTicket').textContent().catch(()=>null);
    if(seleccionado!==String(t.id)){await page.locator('#view1_Tickets_echo .app-field-IDTicket').filter({hasText:new RegExp('^'+t.id+'$')}).click();await estable(page);}
    await page.locator('#view1_SeguimientoTickets_echo').waitFor({state:'visible'});
    await page.locator('#view1_SeguimientoTickets_echo').scrollIntoViewIfNeeded();await page.keyboard.press('Control+End');
    etapa='ticket '+t.id+': esperar seguimiento';
    if(anterior)await page.waitForFunction(prev=>document.querySelector('#view1_SeguimientoTickets_echo .app-echo-inner')?.textContent!==prev,anterior,{timeout:25000});
    await estable(page);
    await page.waitForFunction(()=>{const r=document.querySelector('#view1_SeguimientoTickets_echo');if(!r||/cargando/i.test(r.innerText))return false;return /\(\d+\)/.test(r.querySelector('h3')?.textContent??'')||/no (?:hay )?(?:registros|records|datos)|ningún registro/i.test(r.innerText);},{},{timeout:25000});
    etapa='ticket '+t.id+': leer seguimiento';
    let s=await respuestas(page);const total=s.total,seguimiento=[],vistas=new Set();
    do{
     const firma=JSON.stringify(s.rows);if(vistas.has(firma)&&s.rows.length)throw Error('SIRE repitió una página de seguimiento.');vistas.add(firma);
     seguimiento.push(...s.rows);if(!s.next)break;
     etapa='ticket '+t.id+': siguiente página de respuestas';
     const firmaPagina=await page.locator('#view1_SeguimientoTickets_echo .app-echo-inner').textContent();
     await page.locator('#view1_SeguimientoTickets_echo .app-btn-next').click();
     await page.waitForFunction(prev=>document.querySelector('#view1_SeguimientoTickets_echo .app-echo-inner')?.textContent!==prev,firmaPagina,{timeout:25000});await estable(page);s=await respuestas(page);
    }while(true);
    if(seguimiento.length!==total)throw Error('No se recuperó todo el seguimiento del ticket '+t.id+'.');
    tickets.push({...t,totalSeguimientos:seguimiento.length,seguimiento});totalRespuestas+=seguimiento.length;
    informar({tipo:'avance',mensaje:`Recuperando ${sistema}: ticket ${t.id}`,tickets:tickets.length,total:primera.total,respuestas:totalRespuestas});
   }
   seguir=pagina.next;
   if(seguir){await page.locator('#view1_Tickets_echo .app-btn-next').click();await page.locator('#view1_Tickets_echo .app-field-IDTicket').filter({hasText:new RegExp('^'+pagina.tickets[0].id+'$')}).waitFor({state:'detached'});await estable(page);}
  }
  registro.metadata.totalExtraido=tickets.length;registro.metadata.totalSeguimientos=totalRespuestas;registro.metadata.completa=true;registro.metadata.seguimiento='Completo; todas las páginas verificadas';verificarCaptura(registro);
  if(signal.aborted)throw Error('Cancelado.');await fs.mkdir(cache,{recursive:true});const temporal=new URL(sistema+'.tmp',cache);await fs.writeFile(temporal,JSON.stringify(registro));await fs.rename(temporal,new URL(sistema+'.json',cache));return registro;
 }catch(e){
  if(signal.aborted)throw Error('Carga cancelada. La copia anterior se conserva.');
  if(e.message.includes('ERR_CERT'))throw Error('SIRE presenta un problema de certificado. No se pudo establecer una conexión segura.');
  if(e.message.includes('browserType.launch')){throw Error('No se pudo iniciar Google Chrome para conectar con SIRE. Comprueba que esté instalado.');}
  if(e.name==='TimeoutError'&&etapa.startsWith('ticket '))console.error('SIRE diagnóstico:',etapa,e.message.slice(0,400));
  if(e.message.includes('ERR_')||e.name==='TimeoutError')throw Error('SIRE no respondió a tiempo. Intenta iniciar sesión de nuevo.');
  throw e;
 }finally{password='';signal.removeEventListener('abort',abortar);await browser?.close().catch(()=>{});activos.delete(sistema);}
}
export function pluginSire(){return {name:'sincronizar-sire',configureServer(server){
 server.middlewares.use('/api/sire/datos',async(req,res)=>{try{const datos={};for(const sistema of Object.keys(sesiones)){const d=await leerCacheSire(sistema);if(d)datos[sistema]=d;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(datos));}catch{res.statusCode=500;res.end('{}');}});
 server.middlewares.use('/api/sire/sincronizar',async(req,res)=>{
  if(req.method!=='POST'){res.statusCode=405;res.end();return;}
  if(req.headers.origin&&!/^http:\/\/(127\.0\.0\.1|localhost):5173$/.test(req.headers.origin)){res.statusCode=403;res.end();return;}
  let entrada;try{let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)throw Error('Solicitud demasiado grande.');}entrada=JSON.parse(body);}catch{res.statusCode=400;res.end();return;}
  const controller=new AbortController();res.on('close',()=>controller.abort());
  res.setHeader('Content-Type','application/x-ndjson; charset=utf-8');res.setHeader('Cache-Control','no-store');res.flushHeaders();
  const enviar=data=>{if(!res.destroyed)res.write(JSON.stringify(data)+'\n');};const latido=setInterval(()=>enviar({tipo:'latido'}),10000);
  try{const trabajo=sincronizarSire(entrada,enviar,controller.signal);entrada.password='';const datos=await trabajo;enviar({tipo:'completo',datos});}catch(e){enviar({tipo:'error',mensaje:e.message});}finally{entrada.password='';clearInterval(latido);res.end();}
 });
}};}









