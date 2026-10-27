// Compare the local calendar dates displayed by SIRE, including historical text dates.
export function fechaRespuesta(s){
  const texto=String(s.fechaTexto??'');const d=texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if(!d)return Date.parse(s.fechaISO)||0;
  const hora=texto.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])?/i);
  let h=Number(hora?.[1]??0);const m=Number(hora?.[2]??0),periodo=hora?.[4]?.toLowerCase();
  if(periodo)h=h%12+(periodo==='p'?12:0);
  const iso=Date.parse(s.fechaISO);const segundos=hora?.[3]?Number(hora[3])*1000:Number.isFinite(iso)?((iso%60000)+60000)%60000:0;
  return Date.UTC(Number(d[3]),Number(d[2])-1,Number(d[1]),h,m)+segundos;
}
