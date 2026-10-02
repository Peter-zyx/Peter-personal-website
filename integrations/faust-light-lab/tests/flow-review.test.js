import test from 'node:test';
import assert from 'node:assert/strict';
import {LightEngine,pattern} from '../src/engine.js';
const advance=(e,seconds)=>{for(let i=0;i<Math.ceil(seconds*100);i++)e.tick(.01)};
test('review: conversation visits all five stages with continuous default crossfades',()=>{
 for(const count of [8,9,12,36]){
  const e=new LightEngine({count});e.startFlow();const visited=[e.state];let prev=e.last;
  for(let i=0;i<1810;i++){
   const out=e.tick(.01);if(visited.at(-1)!==e.state)visited.push(e.state);
   // Normal flow has no abrupt full-brightness jump at a state boundary.
   assert.ok(out.every((v,j)=>Math.abs(v.level-prev[j].level)<.06));prev=out;
  }
  assert.deepEqual(visited,['ready','listening','processing','speaking','ready']);
  assert.equal(e.flowStart,null);assert.deepEqual(e.last,pattern('ready',0,e.params));
 }
});
test('review: privacy interrupts every active base state and resumes the latest target',()=>{
 for(const state of ['ready','listening','processing','speaking','volume','battery','wake','error'])for(const count of [8,9])for(const privacyCount of [1,2]){
  const e=new LightEngine({count,privacyCount});e.select(state);advance(e,.7);e.capture();
  assert.equal(e.tick(0).filter(v=>v.red).length,privacyCount);e.select('listening');
  for(let i=0;i<219;i++){const out=e.tick(.01);assert.equal(out.filter(v=>v.red).length,privacyCount)}
  advance(e,.8);assert.equal(e.captureStart,null);assert.equal(e.state,'listening');assert.ok(e.last.every(v=>!v.red));
 }
});
test('review: an interrupted conversation exits autoplay and resumes its current state',()=>{
 const e=new LightEngine();e.startFlow();advance(e,8);assert.equal(e.state,'processing');e.capture();
 assert.equal(e.flowStart,null);advance(e,3);assert.equal(e.state,'processing');assert.equal(e.captureStart,null);
});
test('review: explicit error clearance returns to Ready without stale red or pulses',()=>{
 for(const transition of [0,.5,1.5]){
  const e=new LightEngine({transition});e.select('error');advance(e,3);e.select('ready');advance(e,2);
  assert.equal(e.state,'ready');assert.deepEqual(e.last,pattern('ready',0,e.params));
 }
});
test('review: Sleep stays dark and Wake reaches Ready brightness',()=>{
 const e=new LightEngine();e.select('sleep');advance(e,2);assert.ok(e.last.every(v=>v.level===0));assert.equal(e.capture(),false);
 e.select('wake');advance(e,2);assert.deepEqual(e.last,pattern('ready',0,e.params));
});
