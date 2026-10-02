import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,validate,STATES,commands,frame,analyze,duration,current,currentStatus,ambientEstimate} from '../public/apps/faust-model-lab/f2-core.mjs';
const model={version:'test',count:12,distances_mm:[150,300,500,1000,1500],K:Array.from({length:5},()=>Array.from({length:12},()=>Array(25).fill(2))),axisK:Array(12).fill(3)};
test('A floor, B modulation, sleep and slew policy across all state families',()=>{
 for(const state of STATES){const p={...DEFAULTS,state};for(const t of [0,.13,.7,1.3,4.2]){
  const c=commands(p,t);assert.ok(c.values.every(v=>v>=0&&v<=1));
  if(['asleep','slewing'].includes(state))assert.ok(c.values.every(v=>v===0));
  else if(state!=='waking')assert.ok(c.values.every(v=>v>=p.beta));
 }}
 assert.equal(commands({...DEFAULTS,state:'slewing'},1).conflict,true);
 assert.equal(commands({...DEFAULTS,regime:'B',state:'slewing'},1).conflict,false);
 assert.equal(commands({...DEFAULTS,state:'capturing'},1).colour,'red');
 assert.ok(commands({...DEFAULTS,regime:'B',state:'idle'},1).values[0]<DEFAULTS.beta);
});
test('Fixed-field analytic superposition and current arithmetic are independent of LED count',()=>{
 const p={...DEFAULTS,state:'idle',flux:10,fullCurrent:300,standbyCurrent:12};const f=frame(model,p,1);
 const a=.6+.4*.15;assert.ok(Math.abs(f.mean-20*a)<1e-12);assert.ok(Math.abs(f.axis-30*a)<1e-12);
 assert.ok(Math.abs(current(p,a)-(12+288*a))<1e-12);assert.equal(current(DEFAULTS,a),null);
 assert.equal(currentStatus(200,500),'within_electrical_budget');assert.equal(currentStatus(201,499),'burst_only');assert.equal(currentStatus(190,501),'absolute_exceeded');
});
test('F2 validation rejects unknown scenarios, nonfinite values and invalid current calibration',()=>{
 for(const patch of [{distance:250},{period:0},{transition:-1},{flux:NaN},{regime:'auto'},{fullCurrent:10,standbyCurrent:20}])assert.throws(()=>validate({...DEFAULTS,...patch}));
 assert.equal(validate(DEFAULTS).required,null);
});
test('Every new product state is exported over the entire sequence with endpoints',()=>{
 const p={...DEFAULTS,state:'sequence',flux:10};const r=analyze(model,p,true),rows=r.csv.trim().split('\r\n');
 assert.equal(duration(p),42);assert.equal(r.samples,84001);assert.equal(rows.length,84002);assert.equal(rows[0].split(',').length,46);
 const actual=new Set(rows.slice(1).map(row=>row.split(',')[3]));assert.deepEqual(actual,new Set(STATES));
 assert.equal(+rows.at(-1).split(',')[6],42);assert.equal(r.min,0);assert.equal(r.slew,true);assert.equal(r.red,true);
 assert.equal(r.meanCurrent,null);assert.equal(r.rise,null);
});
test('Doubling source flux doubles maps, not modulation/current; statistical extrema include all samples',()=>{
 const p={...DEFAULTS,state:'listening'};const a=analyze(model,p),b=analyze(model,{...p,flux:28});
 assert.ok(Math.abs(b.min-2*a.min)<1e-10);assert.ok(Math.abs(a.meanFraction-b.meanFraction)<1e-12);
 assert.ok(Math.abs(frame(model,p,a.worstTime).minimum-a.min)<1e-12);
});
test('Ambient estimator requires calibration, refuses negative subtraction and sleeps with camera',()=>{
 assert.equal(ambientEstimate({awake:false}).status,'camera_off');assert.equal(ambientEstimate({awake:true}).status,'calibration_required');
 assert.equal(ambientEstimate({awake:true,calibrated:true,totalEquivalentLux:100,ringEquivalentLux:120}).status,'inconsistent_calibration');
 assert.equal(ambientEstimate({awake:true,calibrated:true,totalEquivalentLux:120,ringEquivalentLux:20}).ambient,100);
});
