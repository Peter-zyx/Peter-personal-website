import {analyze} from './f2-core.mjs';
let model;
self.onmessage=async({data})=>{try{
 if(!model){const r=await fetch('./data/f2-model.json');if(!r.ok)throw Error('F2 optical data unavailable');model=await r.json();}
 const result=analyze(model,data.params,data.exportAll);self.postMessage({id:data.id,result});
}catch(e){self.postMessage({id:data.id,error:e.message});}};
