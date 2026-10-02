import {privacyOverlay} from './privacy.js';
import {speakingLevels,errorLevels,conversationPlan} from './behaviors.js';
// All brightness values are normalized design signals, NOT measured light output.
export const DEFAULTS = Object.freeze({count:8, brightness:.55, transition:.5, listeningPeriod:2.8, processingPeriod:4, arcDegrees:90, speakingStrength:.55, speakingVariant:'weighted', errorVariant:'signature', level:.5, privacyPattern:'single', privacyArcDegrees:45, privacyOffsetDegrees:0});
export const STATES = {
  ready:['Ready','Presence','A subtle, steady glow quietly signals that the device is available.'],
  listening:['Listening','Breathing','A slow, full-ring breath signals continuous listening.'],
  processing:['Processing','Moving arc','Neighbouring zones crossfade to create a moving white arc.'],
  speaking:['Speaking','Spatial speech','Compare local spatial responses to simulated speech. No microphone is used.'],
  volume:['Volume','Level','Arc length indicates volume, using one step per selected LED.'],
  battery:['Battery','Charge','A system-gauge preview, held on screen for comparison.'],
  sleep:['Sleep','All off','The ring fades fully off. Darkness is the sleep signal.'],
  error:['Error','Fault cue','Compare a bright double pulse with a persistent broken-ring signature. Select Ready to simulate clearance.'],
};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
export function pattern(state,t,p=DEFAULTS){
  const n=Math.max(1,Math.round(p.count));const phase=Math.max(0,t);
  let values=Array(n).fill(0);
  if(state==='ready') values.fill(.22);
  if(state==='listening') values.fill(.18+.62*(.5-.5*Math.cos(phase*2*Math.PI/p.listeningPeriod)));
  if(state==='speaking') values=speakingLevels(phase,n,p.speakingStrength,p.speakingVariant);
  if(state==='wake') values.fill(.22*ease(phase/1.5));
  if(state==='error')values=errorLevels(phase,n,p.errorVariant);
  if(state==='volume'||state==='battery'){const k=Math.round(clamp(p.level)*n);values=values.map((_,i)=>i<k?.72:0)}
  if(state==='processing'){
    const start=((phase/p.processingPeriod)*n)%n; const length=clamp(p.arcDegrees,1,360)/360*n;
    values=values.map((_,i)=>{let v=0;for(const k of [-n,0,n])v+=Math.max(0,Math.min(i+1,start+length+k)-Math.max(i,start+k));return .88*clamp(v)});
  }
  return values.map(v=>({level:clamp(v*p.brightness),red:false}));
}
// Red is applied LAST, after base-state transitions and white capture/ack cues.
export function captureOverlay(base,elapsed,p=DEFAULTS){
  if(elapsed<0||elapsed>=2.2)return base;
  let white=0;
  if(elapsed<.3)white=null;
  else if(elapsed>=.6&&elapsed<1.2)white=.28+.65*Math.sin(Math.PI*(elapsed-.6)/.6)**2;
  else if(elapsed>=1.4&&elapsed<1.8)white=.7*Math.sin(Math.PI*(elapsed-1.4)/.4)**2;
  return privacyOverlay(base.map(v=>({level:white===null?v.level*(1-ease(elapsed/.3)):white*p.brightness,red:false})),p);
}
export class LightEngine{
  constructor(params={}){this.params={...DEFAULTS,...params};this.time=0;this.state='ready';this.entered=0;this.from=null;this.transitionAt=-10;this.captureStart=null;this.recording=false;this.flowStart=null;this.flowPlan=null;this.wakeStart=null;this.paused=false;this.last=pattern('ready',0,this.params);this.baseLast=this.last}
  setCount(value){
    if(!Number.isFinite(Number(value)))return;
    const count=clamp(Math.round(Number(value)),4,36);
    if(count===this.params.count)return;
    // Resample transition history by angle; keep clocks, flow and capture intact.
    const resize=values=>values&&Array.from({length:count},(_,i)=>({...values[Math.min(values.length-1,Math.floor((i+.5)*values.length/count))],red:false}));
    this.from=resize(this.from);this.last=resize(this.last);this.baseLast=resize(this.baseLast);this.params.count=count;
    this.tick(0);
  }
  select(state,manual=true){if(state==='wake'){this.wake();return}if(!STATES[state])return;if(manual)this.flowStart=null;this.wakeStart=null;this.from=this.baseLast.map(v=>({...v,red:false}));this.state=state;this.entered=this.time;this.transitionAt=this.time}
  wake(){this.select('ready');this.wakeStart=this.time;this.from=null;this.transitionAt=-10;this.tick(0)}
  replay(){this.flowStart=null;this.wakeStart=null;this.entered=this.time;this.from=null;this.transitionAt=-10;this.tick(0)}
  capture(){if(this.captureStart!==null||this.state==='sleep')return false;this.captureStart=this.time;this.flowStart=null;return true}
  startRecording(){if(this.recording||this.captureStart!==null||this.state==='sleep')return false;this.recording=true;this.flowStart=null;this.tick(0);return true}
  stopRecording(){this.recording=false;this.tick(0)}
  startFlow(){if(this.captureStart!==null||this.recording)return false;this.select('ready');this.flowPlan=conversationPlan(this.params);this.flowStart=this.time;return true}
  tick(dt){
    if(!this.paused)this.time+=clamp(dt,0,.1);
    if(this.flowStart!==null){
      const t=this.time-this.flowStart;
      const stage=this.flowPlan.stages.findLast(stage=>t>=stage.start);
      if(stage.state!==this.state){this.select(stage.state,false);this.entered=this.transitionAt=this.flowStart+stage.start}
      if(t>=this.flowPlan.duration)this.flowStart=null;
    }
    const activeParams=this.flowStart===null?this.params:{...this.params,transition:this.flowPlan.transition,listeningPeriod:this.flowPlan.listeningPeriod};
    const phaseDelay=this.flowStart!==null&&this.state==='listening'?this.flowPlan.transition:0;
    let out=pattern(this.state,Math.max(0,this.time-this.entered-phaseDelay),activeParams);
    const w=activeParams.transition===0?1:clamp((this.time-this.transitionAt)/activeParams.transition);
    if(this.from&&w<1)out=out.map((v,i)=>({level:this.from[i].level*(1-ease(w))+v.level*ease(w),red:false}));
    if(this.wakeStart!==null){const age=this.time-this.wakeStart;out=pattern('wake',age,this.params);if(age>=1.5)this.wakeStart=null}
    this.baseLast=out;
    if(this.captureStart!==null){const elapsed=this.time-this.captureStart;if(elapsed<2.2)out=captureOverlay(out,elapsed,this.params);else{this.captureStart=null;this.from=Array(this.params.count).fill({level:0,red:false});this.transitionAt=this.time;out=pattern('sleep',0,this.params)}}
    if(this.recording)out=privacyOverlay(out,this.params);
    this.last=out;return out;
  }
  reset(){Object.assign(this,new LightEngine())}
}
