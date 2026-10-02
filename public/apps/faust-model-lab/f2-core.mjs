export {pwmBounds} from './model.mjs';
export const STATES=['booting','idle','listening','speaking','capturing','capture_complete','slewing','passive','volume','battery','ota','error','asleep','waking'];
export const DEFAULTS={regime:'A',state:'listening',distance:150,flux:14,beta:.6,required:null,ambientLux:100,period:2,transition:.5,gauge:.65,frequency:20000,exposure:.37,duty:.6,fullCurrent:null,standbyCurrent:null,theta:null,temperature:null};
export function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid parameters');
 const p={...DEFAULTS};for(const k in p)if(Object.hasOwn(input,k))p[k]=input[k];
 if(!['A','B'].includes(p.regime)||![...STATES,'sequence'].includes(p.state)||![150,300,500,1000,1500].includes(p.distance))throw Error('Unsupported regime/state/distance');
 const limits={flux:[0,10000],beta:[0,1],required:[0,100000],ambientLux:[0,100000],period:[.5,10],transition:[.1,3],gauge:[0,1],frequency:[1,1e6],exposure:[.001,10000],duty:[.0001,1],fullCurrent:[0,10000],standbyCurrent:[0,10000],theta:[0,10000],temperature:[-50,150]};
 const optional=['required','fullCurrent','standbyCurrent','theta','temperature'];
 for(const [k,[lo,hi]] of Object.entries(limits)){
  if(p[k]===null&&optional.includes(k))continue;
  if(typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<lo||p[k]>hi)throw Error(`Invalid ${k}: ${lo}..${hi}`);
 }
 if(p.fullCurrent!==null&&p.standbyCurrent!==null&&p.fullCurrent<p.standbyCurrent)throw Error('Full current must be >= standby current');
 return p;
}
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function stageAt(p,t){
 const slot=Math.max(3,p.transition+1),index=p.state==='sequence'?Math.min(STATES.length-1,Math.floor(t/slot)):0;
 const state=p.state==='sequence'?STATES[index]:p.state,local=p.state==='sequence'?t-index*slot:t;
 return {state,local,index,slot,previous:p.state==='sequence'&&index>0?STATES[index-1]:null};
}
function raw(state,t,p,n){
 const pulse=.5-.5*Math.cos(2*Math.PI*t/p.period),a=Array(n).fill(0);
 for(let i=0;i<n;i++){
  const angle=2*Math.PI*i/n;
  switch(state){
   case 'asleep':case 'slewing':a[i]=0;break;
   case 'idle':a[i]=.15;break;
   case 'passive':a[i]=.08;break;
   case 'booting':case 'waking':a[i]=.65*ease(t/p.transition);break;
   case 'capturing':a[i]=.65;break;
   case 'capture_complete':a[i]=.15+.5*(1-ease(t/Math.max(p.transition,1)));break;
   case 'volume':case 'battery':a[i]=Math.max(0,Math.min(1,p.gauge*n-i));break;
   case 'ota':a[i]=Math.max(0,Math.min(1,((t%6)/6)*n-i));break;
   case 'listening':a[i]=.15+.55*pulse;break;
   case 'speaking':a[i]=.15+.55*(.5+.5*Math.cos(2*angle))*(.5+.5*Math.sin(2*Math.PI*t/p.period));break;
   case 'error':a[i]=.15+.5*pulse;break;
  }
 }
 return a;
}
export function commands(p,t,n=12){
 const stage=stageAt(p,t),state=stage.state;
 // Sleep is intentionally dark; slew follows the current blanking policy and is flagged separately.
 if(state==='asleep'||state==='slewing')return {values:Array(n).fill(0),state,colour:'off',conflict:p.regime==='A'&&state==='slewing'};
 const map=(s,time)=>raw(s,time,p,n).map(v=>p.regime==='A'?p.beta+(1-p.beta)*v:v);
 let values=map(state,stage.local);
 if(stage.previous&&stage.local<p.transition){
  const prev=['asleep','slewing'].includes(stage.previous)?Array(n).fill(0):map(stage.previous,stage.slot);
  const mix=ease(stage.local/p.transition);values=values.map((v,i)=>prev[i]*(1-mix)+v*mix);
 }
 // Waking ramps the entire ring from darkness; CV is not declared ready until ramp completes.
 if(state==='waking'&&!stage.previous)values=values.map(v=>v*ease(t/p.transition));
 return {values,state,colour:state==='capturing'?'red':'white',conflict:false};
}
export function duration(p){return p.state==='sequence'?STATES.length*Math.max(3,p.transition+1):Math.max(6,p.period*2,p.transition+1);}
export function frame(model,p,t){
 const c=commands(p,t,model.count),K=model.K[model.distances_mm.indexOf(p.distance)],map=Array(25).fill(0);
 let axis=0;for(let i=0;i<model.count;i++){
  const w=p.flux*c.values[i]/model.count;axis+=w*model.axisK[i];
  for(let j=0;j<25;j++)map[j]+=w*K[i][j];
 }
 return {...c,t,map,axis,minimum:Math.min(...map),mean:map.reduce((a,b)=>a+b,0)/25,fraction:c.values.reduce((a,b)=>a+b,0)/model.count};
}
export function current(p,fraction){return p.fullCurrent===null||p.standbyCurrent===null?null:p.standbyCurrent+(p.fullCurrent-p.standbyCurrent)*fraction;}
export function currentStatus(mean,peak){if(mean===null||peak===null)return 'unknown';return peak>500?'absolute_exceeded':mean>200?'burst_only':'within_electrical_budget';}
export function analyze(model,p,exportAll=false){
 p=validate(p);const dt=.0005,T=duration(p),samples=Math.round(T/dt)+1,trace=[],rows=[];
 let min=Infinity,max=0,axisMin=Infinity,meanFraction=0,peakFraction=0,worstTime=0,red=false,slew=false,below=0;
 if(exportAll)rows.push(['model_version','regime','window','state','colour_policy','slew_floor_conflict','time_s','distance_mm','peak_source_lm','beta','pulse_period_s','fade_duration_s','ambient_scenario_lx','assumed_cv_min_lx','calibrated_full_current_mA','calibrated_standby_current_mA','mean_command','current_estimate_mA','axis150_patch_lx_proxy','roi_min_lx','roi_mean_lx',...Array.from({length:25},(_,j)=>`r${Math.floor(j/5)+1}_c${j%5+1}_lx`)].join(','));
 for(let i=0;i<samples;i++){
  const f=frame(model,p,i*dt),weight=(i===0||i===samples-1)?.5:1;
  if(f.minimum<min){min=f.minimum;worstTime=f.t;}max=Math.max(max,...f.map);axisMin=Math.min(axisMin,f.axis);
  meanFraction+=weight*f.fraction;peakFraction=Math.max(peakFraction,f.fraction);red||=f.colour==='red';slew||=f.conflict;
  if(p.required!==null&&f.minimum<p.required)below++;
  if(i%200===0||i===samples-1)trace.push({t:f.t,min:f.minimum,mean:f.mean,state:f.state});
  if(exportAll)rows.push([model.version,p.regime,p.state,f.state,f.colour,f.conflict,f.t.toFixed(4),p.distance,p.flux,p.beta,p.period,p.transition,p.ambientLux,p.required??'',p.fullCurrent??'',p.standbyCurrent??'',f.fraction,current(p,f.fraction)??'',f.axis,f.minimum,f.mean,...f.map].join(','));
 }
 meanFraction/=samples-1;
 const meanCurrent=current(p,meanFraction),peakCurrent=current(p,peakFraction),power=meanCurrent===null?null:5*meanCurrent/1000;
 return {duration:T,samples,min,max,axisMin,worstTime,meanFraction,peakFraction,meanCurrent,peakCurrent,power,
  powerStatus:currentStatus(meanCurrent,peakCurrent),rise:power===null||p.theta===null?null:power*p.theta,
  red,slew,below,trace,csv:exportAll?'\uFEFF'+rows.join('\r\n'):undefined};
}
export function ambientEstimate({awake,calibrated,totalEquivalentLux,ringEquivalentLux}){
 if(!awake)return {status:'camera_off',ambient:null};
 if(!calibrated||![totalEquivalentLux,ringEquivalentLux].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))return {status:'calibration_required',ambient:null};
 if(totalEquivalentLux<ringEquivalentLux)return {status:'inconsistent_calibration',ambient:null};
 return {status:'conditional_estimate',ambient:totalEquivalentLux-ringEquivalentLux};
}
