import test from 'node:test';
import assert from 'node:assert/strict';
import {LightEngine,DEFAULTS,STATES,pattern} from '../src/engine.js';
import {conversationPlan} from '../src/behaviors.js';
const advance=(e,seconds)=>{for(let i=0;i<Math.round(seconds*100);i++)e.tick(.01)};

test('all behavior candidates stay finite and bounded across supported counts and strengths',()=>{
  for(let count=4;count<=36;count++)for(const strength of [0,.55,1])for(const [state,key,variants] of [
    ['speaking','speakingVariant',['baseline','bloom','weighted']],['error','errorVariant',['baseline','pulse','signature']]])
  for(const variant of variants)for(let t=0;t<6.5;t+=.037){
    const out=pattern(state,t,{...DEFAULTS,count,speakingStrength:strength,[key]:variant});
    assert.equal(out.length,count);assert.ok(out.every(v=>Number.isFinite(v.level)&&v.level>=0&&v.level<=1&&!v.red));
  }
});
test('Speaking candidates remain spatial at troughs; Listening retains its original uniform breath',()=>{
  for(const count of [4,8,9,12,36])for(const speakingVariant of ['bloom','weighted'])for(const t of [0,.6,1.2,1.8,2.4]){
    const p={...DEFAULTS,count,speakingVariant,brightness:1};
    const levels=pattern('speaking',t,p).map(v=>v.level);
    assert.ok(Math.max(...levels)-Math.min(...levels)>.2);
    const listening=pattern('listening',t,p);assert.ok(listening.every(v=>v.level===listening[0].level));
    assert.ok(Math.abs(listening[0].level-(.18+.62*(.5-.5*Math.cos(t*2*Math.PI/2.8))))<1e-10);
  }
});
test('Error signature retains an interrupted-ring shape during the quiet interval and pulses brighter than Listening',()=>{
  for(const count of [4,8,9,12,36]){
    const p={...DEFAULTS,count,brightness:1,errorVariant:'signature'};
    for(const t of [1,1.6,2.4,3.1]){
      const levels=pattern('error',t,p).map(v=>v.level);
      assert.ok(Math.max(...levels)>=.42);assert.ok(Math.min(...levels)<.1);
    }
    assert.ok(Math.max(...pattern('error',.12,p).map(v=>v.level))>.8);
    assert.ok(pattern('error',.12,p).every(v=>!v.red));
  }
});
test('default conversation presents two complete Listening breaths after entry and ends at 18 seconds',()=>{
  const e=new LightEngine();e.startFlow();assert.equal(e.flowPlan.duration,18);
  advance(e,1.5);assert.equal(e.state,'listening');assert.ok(Math.abs(e.last[0].level-.18*.55)<1e-8);
  advance(e,1.4);assert.ok(Math.abs(e.last[0].level-.8*.55)<1e-8);
  advance(e,1.4);assert.ok(Math.abs(e.last[0].level-.18*.55)<1e-8);
  advance(e,1.4);assert.ok(Math.abs(e.last[0].level-.8*.55)<1e-8);
  advance(e,1.39);assert.equal(e.state,'listening');assert.ok(e.last[0].level<.101);
  advance(e,11.01);assert.equal(e.state,'ready');assert.equal(e.flowStart,null);
});
test('custom breath periods reserve two complete cycles plus the entry transition',()=>{
  for(const period of [1,2.8,6])for(const transition of [0,.5,1.5]){
    const e=new LightEngine({listeningPeriod:period,transition});e.startFlow();
    const processing=e.flowPlan.stages.find(s=>s.state==='processing').start;
    assert.ok(Math.abs(processing-(1+transition+period*2))<1e-9);
    // A running plan snapshots timing, so a direct external parameter edit cannot truncate it.
    e.params.listeningPeriod=.1;e.params.transition=0;
    advance(e,processing-.01);assert.equal(e.state,'listening');
    advance(e,.02);assert.equal(e.state,'processing');
    assert.equal(conversationPlan({listeningPeriod:period,transition}).listeningStableSeconds,2*period);
  }
});
test('Wake is a Ready entry action, completes automatically and is cancelled by another selection',()=>{
  assert.equal(STATES.wake,undefined);
  const e=new LightEngine();e.select('sleep');advance(e,2);e.wake();
  assert.equal(e.state,'ready');assert.equal(e.wakeStart,e.time);assert.ok(e.last.every(v=>v.level===0));
  advance(e,.75);assert.ok(Math.abs(e.last[0].level-.11*.55)<1e-8);
  e.paused=true;const frozen=e.last;advance(e,2);assert.deepEqual(e.last,frozen);
  e.paused=false;advance(e,.76);assert.equal(e.wakeStart,null);assert.deepEqual(e.last,pattern('ready',0,e.params));
  e.wake();e.select('processing');assert.equal(e.wakeStart,null);
});
test('all new candidates preserve capture hold through replay, white photo cues and variant changes',()=>{
  for(const [state,key,variants] of [['speaking','speakingVariant',['baseline','bloom','weighted']],['error','errorVariant',['baseline','pulse','signature']]]){
    const e=new LightEngine({brightness:.05});e.select(state);e.startRecording();e.capture();
    for(const variant of variants){e.params[key]=variant;e.replay();advance(e,.9);assert.ok(e.last[0].red&&e.last[0].level===.32)}
    e.stopRecording();advance(e,3);assert.ok(e.last.every(v=>!v.red));
  }
});
