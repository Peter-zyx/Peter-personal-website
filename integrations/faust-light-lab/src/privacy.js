// Angular requirements are mapped to whole logical sectors, including sector gaps.
// This describes output coverage, not physical visibility through the enclosure.
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const wrap=angle=>((angle%360)+360)%360;
const distance=(a,b)=>Math.abs(wrap(a-b+180)-180);

export function privacyLayout(params){
  const count=Math.max(4,Math.min(36,Math.round(finite(params.count,8))));
  const step=360/count;
  const width=Math.max(1,Math.min(360,finite(params.privacyArcDegrees,45)));
  const offset=wrap(finite(params.privacyOffsetDegrees,0));
  const markerCount={single:1,opposed:2,four:4,full:1}[params.privacyPattern]??1;
  const full=params.privacyPattern==='full'||width===360;
  const centers=Array.from({length:markerCount},(_,i)=>wrap(offset+i*360/markerCount));
  // Illuminate every sector with positive overlap. Never round the requested arc down.
  const mask=Array.from({length:count},(_,i)=>full||centers.some(center=>distance(i*step,center)<(width+step)/2-1e-9));
  const indices=mask.flatMap((active,i)=>active?[i]:[]);
  let gap=0,maxGap=0;
  for(let i=0;i<2*count;i++){gap=mask[i%count]?0:Math.min(count,gap+1);maxGap=Math.max(maxGap,gap)}
  return {centers,requestedArcDegrees:full?360:width,indices,mask,
    totalNominalDegrees:indices.length*step,maxUnlitGapDegrees:maxGap*step,
    mapping:'whole-sector-outward-coverage',physicalVisibilityValidated:false};
}

export function privacyOverlay(base,params){
  // Accept old v1 snapshots for compatibility; the Week 4 UI specifies degrees.
  const mask=params.privacyCount!==undefined
    ?base.map((_,i)=>i<Math.max(1,Math.min(base.length,Math.round(params.privacyCount))))
    :privacyLayout(params).mask;
  return base.map((value,i)=>mask[i]?{level:Math.max(.32,params.brightness),red:true}:value);
}
