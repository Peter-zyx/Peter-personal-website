// Browser/Node shared calculation core. Units follow Day 4, with no curve fits.
import {stageAt} from './playback.mjs';
export const DEFAULTS = Object.freeze({distance:500,state:'listening',flux:14,beta:.6,required:5,frequency:20000,exposure:.37,duty:.6,efficacy:null,efficiency:null,resistance:null,ambient:null});
const STATES=['listening','processing','speaking','error','conversation'];
const LIMITS={flux:[0,10000],beta:[0,1],required:[0,100000],frequency:[1,1000000],exposure:[.001,10000],duty:[.0001,1],efficacy:[.001,1000],efficiency:[.001,1],resistance:[0,10000],ambient:[-100,200]};
export function validate(input){
  if(!input || typeof input!=='object' || Array.isArray(input)) throw Error('Invalid scenario');
  const p={...DEFAULTS};
  for(const key of Object.keys(p)) if(Object.hasOwn(input,key)) p[key]=input[key];
  if(![250,500,1000].includes(p.distance)||!STATES.includes(p.state))throw Error('Unsupported distance or state');
  for(const [key,[lo,hi]] of Object.entries(LIMITS)){
    if(['efficacy','efficiency','resistance','ambient'].includes(key)&&p[key]===null)continue;
    if(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<lo||p[key]>hi)throw Error(`Invalid ${key}: ${lo}–${hi}`);
  }
  return p;
}
export function project(waves,K){
  if(waves.length%24 || K.length!==24 || K.some(row=>row.length!==25))throw Error('Invalid model shape');
  const n=waves.length/24, maps=new Float64Array(n*25), fractions=new Float64Array(n), all=new Float64Array(25);
  for(let led=0;led<24;led++)for(let j=0;j<25;j++)all[j]+=K[led][j]/24;
  for(let t=0;t<n;t++){
    for(let led=0;led<24;led++){
      const a=waves[t*24+led]/24;fractions[t]+=a;
      for(let j=0;j<25;j++)maps[t*25+j]+=a*K[led][j];
    }
  }
  return {maps,fractions,all,n};
}
export function evaluate(projection,beta,dt=.0005){
  const {maps,fractions,all,n}=projection;
  let minimum=Infinity,worstIndex=0,worstBin=0,mean=0,avgFraction=0,peakFraction=0;
  const trace=[], frames=[], mins=new Float64Array(n), means=new Float64Array(n);
  for(let t=0;t<n;t++){
    let lo=Infinity,avg=0;
    for(let j=0;j<25;j++){
      const v=beta*all[j]+(1-beta)*maps[t*25+j];avg+=v/25;lo=Math.min(lo,v);
      if(v<minimum){minimum=v;worstIndex=t;worstBin=j;}
    }
    const weight=(t===0||t===n-1)?.5:1, frac=beta+(1-beta)*fractions[t];
    mean+=weight*avg;avgFraction+=weight*frac;peakFraction=Math.max(peakFraction,frac);mins[t]=lo;means[t]=avg;
    if(t%20===0||t===n-1)frames.push({t:t*dt,map:Array.from(all,(a,j)=>beta*a+(1-beta)*maps[t*25+j])});
  }
  // Exact statistics use every 0.5 ms sample. Plot points select each bucket's trough.
  const stride=Math.max(1,Math.floor(n/450));
  for(let start=0;start<n;start+=stride){let best=start;for(let t=start;t<Math.min(n,start+stride);t++)if(mins[t]<mins[best])best=t;trace.push({t:best*dt,min:mins[best],mean:means[best]});}
  return {minimum,mean:mean/(n-1),averageFraction:avgFraction/(n-1),peakFraction,bound:beta*Math.min(...all),allOnMin:Math.min(...all),allOnMax:Math.max(...all),worstTime:worstIndex*dt,worstBin,worstMap:Array.from(all,(a,j)=>beta*a+(1-beta)*maps[worstIndex*25+j]),duration:(n-1)*dt,trace,frames};
}
export function pwmBounds(frequency,exposureMs,duty){
  if(!(frequency>0&&exposureMs>0&&duty>0&&duty<=1))throw Error('Invalid PWM inputs');
  let F=frequency*exposureMs/1000;
  if(Math.abs(F-Math.round(F))<1e-10)F=Math.round(F);
  const n=Math.floor(F),r=F-n;
  const min=(n*duty+Math.max(0,r-1+duty))/F,max=(n*duty+Math.min(r,duty))/F;
  return {min,max,error:Math.max(1-min/duty,max/duty-1),deficit:1-min/duty,excess:max/duty-1,cycles:F,conservative:(1-duty)/F};
}
export function thermal(p,result){
  const sourceMean=p.flux*result.averageFraction;
  const led=p.efficacy===null?null:sourceMean/p.efficacy;
  const input=led===null||p.efficiency===null?null:led/p.efficiency;
  const rise=input===null||p.resistance===null?null:input*p.resistance;
  return {sourceMean,led,input,driverLoss:input===null?null:input-led,rise,temperature:rise===null||p.ambient===null?null:p.ambient+rise};
}
export function fullMatrixCSV(projection,p,dt,version,waveParams){
  const {maps,all,n}=projection;
  const rows=[['model_version','window','active_state','transition_from','time_s','distance_mm','peak_ring_lm','baseline_fraction','target_min_lx','target_mean_lx',...Array.from({length:25},(_,j)=>`r${Math.floor(j/5)+1}_c${j%5+1}_lx`)].join(',')];
  for(let i=0;i<n;i++){
    const time=i*dt,stage=stageAt(p.state,time,waveParams);
    const values=Array.from(all,(a,j)=>p.flux*(p.beta*a+(1-p.beta)*maps[i*25+j]));
    rows.push([version,p.state,stage.state,stage.transition?stage.previous:'',time.toFixed(4),p.distance,p.flux,p.beta,Math.min(...values),values.reduce((a,b)=>a+b,0)/25,...values].join(','));
  }
  return '\uFEFF'+rows.join('\r\n');
}
