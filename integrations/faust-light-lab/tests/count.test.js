import test from 'node:test';
import assert from 'node:assert/strict';
import {LightEngine,pattern,DEFAULTS,STATES} from '../src/engine.js';
test('all selectable counts support every state and gauge endpoints',()=>{
 for(let count=4;count<=36;count++){
  for(const state of Object.keys(STATES))for(const t of [0,.17,1.2,3.99,8]){
   const out=pattern(state,t,{...DEFAULTS,count});assert.equal(out.length,count);
   assert.ok(out.every(v=>Number.isFinite(v.level)&&v.level>=0&&v.level<=1));
  }
  for(const state of ['volume','battery'])for(const level of [0,.5,1])assert.equal(pattern(state,0,{...DEFAULTS,count,level}).filter(v=>v.level>0).length,Math.round(level*count));
  const sum=pattern('processing',3.99,{...DEFAULTS,count}).reduce((a,v)=>a+v.level,0);assert.ok(Math.abs(sum-count/4*.88*.55)<1e-8);
 }
});
test('count changes during transitions, pause, capture and flow preserve clocks and priority',()=>{
 const e=new LightEngine();e.select('processing');e.tick(.1);e.paused=true;
 const time=e.time;for(const n of [9,36,4,12,8]){e.setCount(n);assert.equal(e.last.length,n);assert.equal(e.time,time);assert.ok(e.last.every(v=>Number.isFinite(v.level)))}
 e.paused=false;e.params.privacyCount=2;e.capture();const start=e.captureStart;
 for(const n of [9,4,36,8]){e.setCount(n);assert.equal(e.captureStart,start);assert.equal(e.last.filter(v=>v.red).length,2);e.tick(.1)}
 for(let i=0;i<30;i++)e.tick(.1);assert.equal(e.captureStart,null);
 e.startFlow();const flow=e.flowStart;e.setCount(9);assert.equal(e.flowStart,flow);
 for(let i=0;i<181;i++)e.tick(.1);assert.equal(e.state,'ready');assert.equal(e.flowStart,null);assert.equal(e.last.length,9);
 e.reset();assert.equal(e.params.count,8);assert.equal(e.last.length,8);
});
test('count API rejects non-finite values and clamps to UI bounds',()=>{const e=new LightEngine();e.setCount(NaN);assert.equal(e.params.count,8);e.setCount(100);assert.equal(e.params.count,36);e.setCount(1);assert.equal(e.params.count,4);e.setCount(8.6);assert.equal(e.params.count,9)});
