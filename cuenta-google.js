export const CUENTA_GOOGLE='usii.desarrollo@gmail.com';
export const SCOPES_GOOGLE='openid email https://www.googleapis.com/auth/drive';
export async function verificarCuentaGoogle(accessToken){
 const response=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${accessToken}`},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('No se pudo verificar la cuenta de Google. Vuelve a conectar.');
 const perfil=await response.json();
 if(perfil.email_verified!==true||String(perfil.email??'').trim().toLowerCase()!==CUENTA_GOOGLE)throw Error(`Debes iniciar sesión con ${CUENTA_GOOGLE}. La cuenta seleccionada no se utilizará.`);
 return CUENTA_GOOGLE;
}

