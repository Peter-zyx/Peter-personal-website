import test from 'node:test';
import assert from 'node:assert/strict';
import {LightEngine,DEFAULTS,pattern} from '../src/engine.js';
import {privacyLayout} from '../src/privacy.js';

const advance=(engine,seconds)=>{for(let i=0;i<Math.ceil(seconds*100);i++)engine.tick(.01)};
const wrap=x=>((x%360)+360)%360;

test('angular mapping covers every requested arc at all supported LED counts, including seams',()=>{
  for(let count=4;count<=36;count++)for(const privacyPattern of ['single','opposed','four'])
  for(const privacyArcDegrees of [5,45,90,130,180])for(const privacyOffsetDegrees of [0,17,355]){
    const layout=privacyLayout({...DEFAULTS,count,privacyPattern,privacyArcDegrees,privacyOffsetDegrees});
    for(const center of layout.centers)for(let j=0;j<101;j++){
      const angle=wrap(center-privacyArcDegrees/2+privacyArcDegrees*(j+.5)/101);
      const sector=Math.floor(wrap(angle+180/count)/(360/count))%count;
      assert.ok(layout.mask[sector],`Uncovered requested angle ${angle} at ${count} LEDs`);
    }
    assert.equal(new Set(layout.indices).size,layout.indices.length);
    assert.ok(layout.totalNominalDegrees<=360+1e-9);
  }
});

test('45-degree baseline is one zone at eight LEDs; count changes preserve requested arc',()=>{
  assert.deepEqual(privacyLayout(DEFAULTS).indices,[0]);
  const e=new LightEngine();e.startRecording();
  for(const count of [12,9,36,4,8]){
    e.setCount(count);assert.equal(e.params.privacyArcDegrees,45);
    assert.ok(privacyLayout(e.params).totalNominalDegrees>=45);
    assert.deepEqual(e.last.flatMap((v,i)=>v.red?[i]:[]),privacyLayout(e.params).indices);
  }
});

test('full-ring control and overlapping markers never double-count output',()=>{
  for(const count of [4,8,9,12,36]){
    const full=privacyLayout({...DEFAULTS,count,privacyPattern:'full'});
    assert.equal(full.indices.length,count);assert.equal(full.maxUnlitGapDegrees,0);
    assert.equal(privacyLayout({...DEFAULTS,count,privacyPattern:'four',privacyArcDegrees:180}).indices.length,count);
  }
});

test('capture hold stays active indefinitely and cannot be cleared by state, pause or dimmer',()=>{
  const e=new LightEngine({brightness:0,privacyPattern:'opposed',privacyArcDegrees:90});
  assert.equal(e.startRecording(),true);assert.equal(e.startRecording(),false);
  advance(e,60);assert.equal(e.recording,true);assert.equal(e.startFlow(),false);
  for(const state of ['listening','processing','speaking','error','sleep']){
    e.select(state);advance(e,2);
    const expected=privacyLayout(e.params).indices;
    assert.deepEqual(e.last.flatMap((v,i)=>v.red?[i]:[]),expected);
    assert.ok(expected.every(i=>e.last[i].level===.32));
  }
  e.paused=true;const time=e.time;advance(e,10);assert.equal(e.time,time);
  e.stopRecording();assert.equal(e.recording,false);assert.ok(e.last.every(v=>!v.red&&v.level===0));
});

test('photo cues preserve held privacy and ending one capture source does not end the other',()=>{
  const e=new LightEngine({brightness:.05,privacyPattern:'four'});
  e.startRecording();e.capture();
  for(let i=0;i<300;i++){e.tick(.01);assert.ok(privacyLayout(e.params).indices.every(j=>e.last[j].red&&e.last[j].level>=.32))}
  assert.equal(e.captureStart,null);assert.equal(e.recording,true);
  e.capture();e.stopRecording();assert.ok(e.last.some(v=>v.red));
  advance(e,3);assert.ok(e.last.every(v=>!v.red));
});

test('privacy intensity does not leak into a new white-state transition after hold stops',()=>{
  const e=new LightEngine({brightness:.05});e.startRecording();e.select('ready');e.stopRecording();
  assert.deepEqual(e.last,pattern('ready',0,e.params));
  e.select('sleep');advance(e,2);assert.equal(e.startRecording(),false);
  e.select('ready');e.startRecording();e.reset();assert.equal(e.recording,false);assert.deepEqual(e.params,DEFAULTS);
});
