import './style.css';
import {LightEngine,STATES} from './engine.js';
import {createScene} from './scene.js';
import {privacyLayout} from './privacy.js';
import {SPEAKING_VARIANTS,ERROR_VARIANTS,conversationPlan} from './behaviors.js';

const $=s=>document.querySelector(s);const engine=new LightEngine();let viewer=null;let selected='';let autoRotate=false;let shellHidden=false;let toastTimer;
// Start stationary when the visitor has requested reduced motion.
engine.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
for(const [key,[name,subtitle]]of Object.entries(STATES)){const b=document.createElement('button');b.className='state-button';b.dataset.state=key;b.innerHTML=`<strong>${name}</strong><small>${subtitle}</small>`;b.setAttribute('aria-pressed',key==='ready');b.onclick=()=>{engine.select(key);if(engine.captureStart!==null)toast('Return state updated. Capture red keeps priority.');syncState()};$('#state-buttons').append(b)}
function slider(id,title,min,max,step,value,suffix,apply){const wrap=document.createElement('div');wrap.innerHTML=`<label class="slider-label" for="${id}">${title}<output id="${id}-output">${value}${suffix}</output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">`;wrap.querySelector('input').oninput=e=>{wrap.querySelector('output').textContent=e.target.value+suffix;apply(Number(e.target.value))};$('#context-controls').append(wrap)}
function variantControl(state){
  const variants=state==='speaking'?SPEAKING_VARIANTS:ERROR_VARIANTS,key=state==='speaking'?'speakingVariant':'errorVariant';
  const wrap=document.createElement('div');wrap.className='variant-review';
  wrap.innerHTML=`<label for="behavior-variant">${state==='speaking'?'Speaking':'Error'} comparison</label><select id="behavior-variant">${Object.entries(variants).map(([id,[label]])=>`<option value="${id}">${label}</option>`).join('')}</select><p id="variant-description"></p><button id="replay-sample" class="button quiet">Replay from start</button><p class="micro-note">Baseline is the Week 3 reference. A/B are review candidates. Switching variants keeps the current phase; Replay starts a matching sample.</p>`;
  const select=wrap.querySelector('select');select.value=engine.params[key];
  const describe=()=>wrap.querySelector('#variant-description').textContent=variants[engine.params[key]][1];
  select.onchange=()=>{engine.flowStart=null;engine.params[key]=select.value;describe();engine.tick(0)};
  wrap.querySelector('button').onclick=()=>{engine.replay();engine.paused=false;updatePause();toast('Replaying the selected variant from the same starting phase.')};
  describe();$('#context-controls').append(wrap);
}
function stateDescription(){
  if(engine.wakeStart!==null)return 'Ready entry animation · 1.5-second fade from Sleep.';
  if(selected==='speaking')return SPEAKING_VARIANTS[engine.params.speakingVariant][1];
  if(selected==='error')return ERROR_VARIANTS[engine.params.errorVariant][1]+' Select Ready to simulate clearance. Red is reserved for capture.';
  return STATES[selected][2];
}
function syncState(){
  if(selected===engine.state)return;selected=engine.state;const [name,subtitle,description]=STATES[selected];$('#state-title').innerHTML=`${name}<span>${subtitle}</span>`;$('#state-description').textContent=description;
  document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.state===selected));$('#context-controls').replaceChildren();
  if(selected==='listening')slider('period','Breathing cycle',1,6,.1,engine.params.listeningPeriod,' s',v=>{engine.flowStart=null;engine.params.listeningPeriod=v});
  if(selected==='processing'){slider('speed','Rotation period',1,8,.1,engine.params.processingPeriod,' s',v=>engine.params.processingPeriod=v);slider('arc','Arc length',45,180,45,engine.params.arcDegrees,'°',v=>engine.params.arcDegrees=v)}
  if(selected==='speaking'||selected==='error')variantControl(selected);
  if(selected==='speaking')slider('speech','Simulated speech intensity',0,100,1,Math.round(engine.params.speakingStrength*100),'%',v=>engine.params.speakingStrength=v/100);
  if(selected==='volume'||selected==='battery')slider('level',selected==='volume'?'Volume':'Battery',0,100,1,Math.round(engine.params.level*100),'%',v=>engine.params.level=v/100);
}
$('#brightness').oninput=e=>{engine.params.brightness=Number(e.target.value)/100;$('#brightness-output').textContent=e.target.value+'%'};
$('#transition').oninput=e=>{engine.flowStart=null;engine.params.transition=Number(e.target.value)/1000;$('#transition-output').textContent=e.target.value+' ms'};
$('#led-count').oninput=e=>changeCount(Number(e.target.value));
document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>changeCount(Number(b.dataset.count)));
function syncPrivacy(){const p=engine.params;const layout=privacyLayout(p);$('#privacy-pattern').value=p.privacyPattern;$('#privacy-arc').value=p.privacyArcDegrees;$('#privacy-offset').value=p.privacyOffsetDegrees;$('#privacy-arc').disabled=p.privacyPattern==='full';$('#privacy-arc-output').textContent=(p.privacyPattern==='full'?360:p.privacyArcDegrees)+'°';$('#privacy-offset-output').textContent=p.privacyOffsetDegrees+'°';$('#privacy-coverage').textContent=`Mapped output: ${layout.indices.length}/${p.count} red zones · ${Number(layout.totalNominalDegrees.toFixed(1))}° total · Largest unlit gap ${Number(layout.maxUnlitGapDegrees.toFixed(1))}°. Physical visibility remains unverified.`;engine.tick(0)}
$('#privacy-pattern').onchange=e=>{engine.params.privacyPattern=e.target.value;syncPrivacy()};
$('#privacy-arc').oninput=e=>{engine.params.privacyArcDegrees=Number(e.target.value);syncPrivacy()};
$('#privacy-offset').oninput=e=>{engine.params.privacyOffsetDegrees=Number(e.target.value);syncPrivacy()};
$('#recording').onclick=()=>{if(engine.recording){engine.stopRecording();toast(engine.captureStart!==null?'Capture hold stopped. The photo cue still keeps privacy red.':'Capture hold stopped.')}else if(engine.startRecording())toast('Capture hold active. Red stays on until you stop it.');else toast('Leave Sleep and finish the photo cue before starting capture hold.')};
$('#capture').onclick=()=>{if(engine.paused){toast('Resume playback before triggering capture.');return}if(engine.capture())toast('Red first → Capture → Acknowledge → Resume');else toast(engine.state==='sleep'?'Capture is unavailable during sleep. Wake first.':'Capture is in progress. Duplicate trigger ignored.')};
$('#flow').onclick=()=>{if(engine.startFlow()){engine.paused=false;updatePause();syncState();toast(`Starting ${engine.flowPlan.duration.toFixed(1)} s of conversation, including two complete Listening breaths.`)}else toast('Stop capture hold and finish the current photo cue first.')};
$('#wake').onclick=()=>{engine.wake();engine.paused=false;updatePause();syncState()};
function updatePause(){$('#pause').setAttribute('aria-pressed',engine.paused);$('#pause').textContent=engine.paused?'▷ Resume':'Ⅱ Pause'}
$('#pause').onclick=()=>{engine.paused=!engine.paused;updatePause()};
$('#reset').onclick=()=>{engine.reset();syncCount();selected='';$('#brightness').value=55;$('#brightness-output').textContent='55%';$('#transition').value=500;$('#transition-output').textContent='500 ms';updatePause();syncState();toast('Defaults restored. Simulated capture activity stopped.')};
$('#view-home').onclick=()=>viewer?.home();$('#view-top').onclick=()=>viewer?.top();
$('#view-apply').onclick=()=>{autoRotate=false;viewer?.rotate(false);$('#auto-rotate').setAttribute('aria-pressed','false');viewer?.reviewView(Number($('#view-direction').value),Number($('#view-elevation').value));toast('Fixed view applied. Drag to continue inspecting.')};
$('#auto-rotate').onclick=()=>{autoRotate=!autoRotate;viewer?.rotate(autoRotate);$('#auto-rotate').setAttribute('aria-pressed',autoRotate)};
$('#shell-toggle').onclick=()=>{shellHidden=!shellHidden;viewer?.shell(shellHidden);$('#shell-toggle').setAttribute('aria-pressed',shellHidden);$('#shell-toggle').innerHTML=`◌ <span>${shellHidden?'Show cover':'Hide cover'}</span>`};
$('#about').onclick=()=>$('#help').showModal();$('#close-help').onclick=()=>$('#help').close();
$('#help').addEventListener('click',e=>{if(e.target===$('#help')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
const exportDialog=document.createElement('dialog');exportDialog.id='export-dialog';exportDialog.innerHTML='<button id="close-export" class="icon-button">Close ×</button><p class="eyebrow">PARAMETER SNAPSHOT</p><h2>Save this exploration</h2><p>Copy the JSON or download a file. If the in-app browser does not start a download, use Copy JSON.</p><textarea id="config-json" aria-label="Current configuration JSON" readonly spellcheck="false" style="width:100%;height:270px;font:11px/1.6 monospace;padding:12px;border:1px solid #c8d7c7;border-radius:6px;background:#f2f6ee;color:#355b43"></textarea><div class="actions"><button id="copy-config" class="button">Copy JSON</button><button id="download-config" class="button capture-button">Download JSON</button></div>';document.body.append(exportDialog);
$('#close-export').onclick=()=>exportDialog.close();
$('#copy-config').onclick=async()=>{try{await navigator.clipboard.writeText($('#config-json').value);toast('JSON copied.')}catch{$('#config-json').focus();$('#config-json').select();toast('Configuration selected. Press Ctrl+C to copy.')}};
$('#download-config').onclick=()=>{const url=URL.createObjectURL(new Blob([$('#config-json').value],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`faust-light-lab-${JSON.parse($('#config-json').value).parameters.count}led.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Download requested. If nothing happens, use Copy JSON.')};
$('#export').onclick=()=>{const data={schema:'faust-light-lab/v2',exportedAt:new Date().toISOString(),hardwareValidated:false,countStatus:'configurable-visual-prototype-ODM-unconfirmed',state:engine.state,parameters:{...engine.params},conversation:engine.flowStart!==null?engine.flowPlan:conversationPlan(engine.params),readyEntryActive:engine.wakeStart!==null,privacy:privacyLayout(engine.params),captureHoldActive:engine.recording,photoCueActive:engine.captureStart!==null,view:viewer?.getView()??null,notes:['Normalized visual brightness, not current or lux','Original accepted shell geometry; web material approximation','LED indexing and optical mixing not verified on ODM hardware','Capture activity simulated; actual hardware must use real capture events','Angular mapping includes whole-sector gaps and does not guarantee physical visibility','Speaking and Error A/B variants are provisional review candidates']};$('#config-json').value=JSON.stringify(data,null,2);exportDialog.showModal()};
const ns='http://www.w3.org/2000/svg';const svg=$('#ring-map');
function syncCount(){
const count=engine.params.count;svg.replaceChildren();
$('#led-count').value=count;$('#led-count-output').textContent=count;$('#zone-count').textContent=String(count).padStart(2,'0');$('#output-title').textContent=`${count}-zone live output`;svg.setAttribute('aria-label',`Top-view diagnostic map of ${count} light zones`);
document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.count)===count));
syncPrivacy();
viewer?.setCount(count);
for(let i=0;i<count;i++){const a=i*Math.PI*2/count-Math.PI/2;const c=document.createElementNS(ns,'circle');c.setAttribute('cx',80+47*Math.cos(a));c.setAttribute('cy',80+47*Math.sin(a));c.setAttribute('r',Math.min(12,Math.PI*47/count*.75));c.id='led-'+i;svg.append(c);const text=document.createElementNS(ns,'text');text.setAttribute('x',80+69*Math.cos(a));text.setAttribute('y',83+69*Math.sin(a));text.setAttribute('text-anchor','middle');text.setAttribute('fill','#8d9888');text.setAttribute('font-size',9);text.textContent=String(i+1).padStart(2,'0');svg.append(text)}
const hole=document.createElementNS(ns,'circle');hole.setAttribute('cx',80);hole.setAttribute('cy',80);hole.setAttribute('r',21);hole.setAttribute('fill','none');hole.setAttribute('stroke','#dce3d7');svg.append(hole);
}
function changeCount(count){engine.setCount(count);syncCount()}
syncCount();
function fallback(message){$('#loading').hidden=true;$('#fallback').hidden=false;$('#model-label').textContent='Reference image · 3D unavailable';if(message)$('#fallback-message').textContent=message;['view-home','view-top','view-apply','view-direction','view-elevation','auto-rotate','shell-toggle'].forEach(id=>$('#'+id).disabled=true)}
syncState();
updatePause();
try{viewer=await createScene($('#viewport'));viewer.setCount(engine.params.count);$('#loading').hidden=true;$('#model-label').textContent='BLENDER SOURCE / WEB MATERIAL';document.body.dataset.modelLoaded='true';viewer.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();viewer=null;fallback('The 3D context was lost. Refresh to retry. Light controls still work.')})}catch(error){console.error('3D unavailable:',error);fallback()}
let previous=performance.now();let lastMonitor=0;
function frame(now){
  const dt=(now-previous)/1000;previous=now;
  if(!document.hidden){
    const out=engine.tick(dt);viewer?.update(out,dt);syncState();
    if(now-lastMonitor>80){
      lastMonitor=now;
      out.forEach((v,i)=>{const c=$('#led-'+i);c.setAttribute('fill',v.red?'#d54431':v.level>.025?`rgb(${Math.round(139+v.level*110)},${Math.round(151+v.level*100)},${Math.round(128+v.level*120)})`:'#e7ebe2');c.setAttribute('stroke',v.red?'#ad3424':'#c7d2be');c.setAttribute('stroke-width','1');c.dataset.level=v.level.toFixed(4);c.dataset.red=String(v.red)});
      const n=out.filter(v=>v.level>.025).length;
      const photo=engine.captureStart!==null, active=photo||engine.recording;
      $('#signal-summary').textContent=`${n} / ${engine.params.count}`;
      $('#capture-indicator').hidden=!active;
      $('#capture-indicator').textContent=engine.recording?'● Capture hold · Simulated':'● Photo cue · Simulated';
      $('#signal-detail').textContent=active?`${out.filter(v=>v.red).length} red zones · Privacy priority`:selected==='sleep'&&n===0?'All off · Sleep':selected==='volume'||selected==='battery'?`${Math.round(engine.params.level*100)}% → ${Math.round(engine.params.level*engine.params.count)} steps`:'White · State output';
      $('#capture').disabled=photo||engine.state==='sleep';$('#flow').disabled=active;
      $('#recording').disabled=!engine.recording&&(photo||engine.state==='sleep');
      $('#recording').textContent=engine.recording?'Stop capture hold':'Start capture hold';
      $('#recording').setAttribute('aria-pressed',engine.recording);
      $('#wake').disabled=selected!=='sleep'||active;
      $('#state-description').textContent=active&&selected==='sleep'?'Sleep requested. Privacy red remains while simulated capture is active.':stateDescription();
      const plan=engine.flowStart!==null?engine.flowPlan:conversationPlan(engine.params);
      $('#flow-timing').textContent=`Conversation: ${plan.duration.toFixed(1)} s · Listening: ${plan.listeningStableSeconds.toFixed(1)} s + entry transition. Two complete breaths. Timing changes exit autoplay.`;
      $('#playback-label').textContent=engine.paused?(active?'Paused · Privacy remains active':'Animation paused'):engine.recording?'Capture hold active · Stop explicitly':photo?'Photo cue · Selected state resumes next':engine.flowStart!==null?'Sequence · '+STATES[engine.state][0]:'Explore freely · Switch any time';
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>previous=performance.now());
