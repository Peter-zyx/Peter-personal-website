export const SPEAKING_VARIANTS={
  baseline:['Baseline · Uniform modulation','The Week 3 full-ring modulation, retained for comparison.'],
  bloom:['A · Front bloom','A bright local bloom expands from the front with a simulated speech envelope.'],
  weighted:['B · Opposed speech patches','Two fixed, opposed patches change weight with simulated speech. No continuous rotation.']
};
export const ERROR_VARIANTS={
  baseline:['Baseline · Quiet double pulse','The Week 3 dim double pulse, retained for comparison.'],
  pulse:['A · Bright double pulse','Two bright white pulses repeat every 3.2 seconds, with short eased edges.'],
  signature:['B · Persistent broken ring','Three separated white marks stay visible between bright double pulses until the error is cleared.']
};
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const distance=(a,b)=>Math.abs(((a-b+540)%360)-180);
const lobe=(angle,center,width)=>{const d=distance(angle,center);return d>=width?0:.5+.5*Math.cos(Math.PI*d/width)};

export function speechEnvelope(t){return Math.abs(Math.sin(t*4.3)*Math.sin(t*7.1))}
export function speakingLevels(t,count,strength,variant='weighted'){
  const envelope=speechEnvelope(t),intensity=clamp(strength);
  if(variant==='baseline')return Array(count).fill(.18+intensity*(.22+.6*envelope));
  const peak=.38+.62*intensity*envelope;
  return Array.from({length:count},(_,i)=>{
    const angle=i*360/count;
    if(variant==='bloom')return .035+peak*lobe(angle,0,65+65*intensity*envelope);
    // Fixed locations preserve a speaking shape even at envelope troughs.
    const bias=.5+.5*intensity*Math.sin(t*2.1);
    const front=lobe(angle,0,75)*(.6+.4*bias);
    const back=lobe(angle,180,75)*(1-.4*bias);
    return .035+peak*Math.max(front,back);
  });
}
function pulse(t,start){return smooth((t-start)/.06)*(1-smooth((t-start-.22)/.06))}
export function errorLevels(t,count,variant='signature'){
  if(variant==='baseline'){const c=t%2.4;return Array(count).fill(c<.18||(c>.35&&c<.53)?.65:.04)}
  const phase=t%3.2,flash=Math.max(pulse(phase,0),pulse(phase,.48));
  if(variant==='pulse')return Array(count).fill(.08+.92*flash);
  return Array.from({length:count},(_,i)=>{
    const shape=Math.max(...[0,120,240].map(center=>lobe(i*360/count,center,45)));
    return (.42+.58*flash)*shape;
  });
}

export function conversationPlan(params){
  const transition=Math.max(0,params.transition),period=Math.max(.1,params.listeningPeriod);
  const listeningStart=1;
  const processingStart=listeningStart+transition+2*period;
  const speakingStart=processingStart+transition+4;
  const readyStart=speakingStart+transition+4.4;
  return {transition,listeningPeriod:period,listeningStableSeconds:2*period,
    stages:[{state:'ready',start:0},{state:'listening',start:listeningStart},{state:'processing',start:processingStart},{state:'speaking',start:speakingStart},{state:'ready',start:readyStart}],
    duration:readyStart+transition+1};
}
