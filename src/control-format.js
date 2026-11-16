export function formatPanBrief(pan){
 const n=Number(pan);
 if(!Number.isFinite(n)||n===0)return 'Ctr';
 if(n<0)return 'L'+Math.abs(Math.round(n));
 return 'R'+Math.round(n);
}
export function formatHzBrief(hz){
 const n=Math.round(Number(hz));
 if(!Number.isFinite(n))return '—';
 if(n>=1000)return (n/1000).toFixed(1).replace(/\.0$/,'')+'k';
 return String(n);
}
export function formatPercent(n){
 const v=Math.round(Number(n));
 return Number.isFinite(v)?v+'%':'—';
}
