// Time follows elapsed wall time; refresh rate never changes the model speed.
export function advanceTime(time,elapsed,duration,speed=1,loop=false){
  const next=Math.max(0,time)+Math.max(0,elapsed)*speed;
  if(next<duration)return {time:next,ended:false};
  return loop?{time:next%duration,ended:false}:{time:duration,ended:true};
}
// Mirrors the exported Week 4 conversationPlan, using the manifest parameters.
export function stageAt(window,time,params){
  if(window!=='conversation')return {state:window,previous:null,transition:false};
  const transition=params.transition, listening=1;
  const processing=listening+transition+2*params.listeningPeriod;
  const speaking=processing+transition+4, ready=speaking+transition+4.4;
  const stages=[['ready',0],['listening',listening],['processing',processing],['speaking',speaking],['ready',ready]];
  let i=0;while(i+1<stages.length&&time>=stages[i+1][1]-1e-9)i++;
  return {state:stages[i][0],previous:i?stages[i-1][0]:null,transition:i>0&&time<stages[i][1]+transition-1e-9};
}
