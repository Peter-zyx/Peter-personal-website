import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export async function createScene(host){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:760px)').matches?1.5:2));
  renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(document.documentElement.dataset.embed==='true'?0x111e18:0xe8ede2);
  const camera=new THREE.PerspectiveCamera(33,1,.05,100);camera.position.set(6.3,5.9,8.6);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=5;controls.maxDistance=16;controls.maxPolarAngle=Math.PI/2;controls.autoRotateSpeed=.7;
  // Preserve normal page scrolling. Pinch remains available through OrbitControls.
  renderer.domElement.addEventListener('wheel',e=>e.stopImmediatePropagation(),{capture:true,passive:true});
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const env=pmrem.fromScene(room,.035);scene.environment=env.texture;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf9fff1,0x727c64,2));
  const key=new THREE.DirectionalLight(0xfff7e8,3.2);key.position.set(3,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.bias=-.001;key.shadow.normalBias=.03;scene.add(key);
  const fill=new THREE.DirectionalLight(0xd8ebe8,2);fill.position.set(-5,4,-3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x54674a,opacity:.18}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
  const gltf=await new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'faust-shell.glb');const model=gltf.scene;model.scale.setScalar(50);scene.add(model);
  let cover;let triCount=0;
  const canvas=document.createElement('canvas');canvas.width=4;canvas.height=256;const ctx=canvas.getContext('2d');
  // UV v=0 is the base of the accepted cover. Clear above its lower quarter.
  for(let y=0;y<256;y++){const v=1-y/255;const q=THREE.MathUtils.smoothstep(v,0,.25);const c=Math.round(255*q);ctx.fillStyle=`rgb(${c},${c},${c})`;ctx.fillRect(0,y,4,1)}
  const fade=new THREE.CanvasTexture(canvas);const colorMap=fade.clone();colorMap.colorSpace=THREE.SRGBColorSpace;colorMap.needsUpdate=true;
  const alphaCanvas=document.createElement('canvas');alphaCanvas.width=4;alphaCanvas.height=256;const alphaCtx=alphaCanvas.getContext('2d');
  for(let y=0;y<256;y++){const q=THREE.MathUtils.smoothstep(1-y/255,0,.25);const c=Math.round(255*(1-.94*q));alphaCtx.fillStyle=`rgb(${c},${c},${c})`;alphaCtx.fillRect(0,y,4,1)}
  const alphaMap=new THREE.CanvasTexture(alphaCanvas);
  model.traverse(o=>{if(!o.isMesh)return;triCount+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;o.castShadow=true;o.receiveShadow=true;
    if(o.name.includes('__Dome')){cover=o;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox;const pos=o.geometry.attributes.position;const uv=new Float32Array(pos.count*2); // glTF exporter uses Y-up.
      for(let i=0;i<pos.count;i++){uv[i*2]=.5;uv[i*2+1]=(pos.getY(i)-box.min.y)/(box.max.y-box.min.y)}
      o.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      // Raster transparency preserves a readable clear cover and crisp internal light zones.
      // It is explicitly a visual approximation, not a ray-traced optical simulation.
      o.material=new THREE.MeshPhysicalMaterial({color:0xffffff,map:colorMap,alphaMap,transparent:true,opacity:1,depthWrite:false,roughness:.035,metalness:0,clearcoat:1,envMapIntensity:.9,side:THREE.FrontSide});
      o.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a = max(diffuseColor.a, 0.08 + 0.65 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0));\n#include <opaque_fragment>')};o.material.customProgramCacheKey=()=> 'clear-gradient-fresnel-v1';o.renderOrder=3;o.castShadow=false;
    }else if(o.name.includes('Camera_Lens'))o.material=new THREE.MeshPhysicalMaterial({color:0x091719,metalness:.45,roughness:.08,clearcoat:1});
    else if(o.name.includes('Aperture_Rim'))o.material=new THREE.MeshStandardMaterial({color:0x263c38,metalness:.75,roughness:.22});
    else o.material=new THREE.MeshStandardMaterial({color:0x121917,metalness:.12,roughness:.4});
  });
  if(!cover)throw new Error('Accepted cover was not found in the exported model');
  const lights=[];const glow=[];const ring=new THREE.Group();scene.add(ring);
  function setCount(count){
  for(const mesh of [...lights,...glow]){ring.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}
  lights.length=0;glow.length=0;
  const step=Math.PI*2/count;const gap=Math.min(.04,step*.12);
  for(let i=0;i<count;i++){
    const start=Math.PI/2-step/2-i*step+gap/2;const geometry=new THREE.RingGeometry(1.29,1.52,32,1,start,step-gap);
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x101512,toneMapped:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.y=1.559;ring.add(mesh);lights.push(mesh);
    const halo=new THREE.Mesh(new THREE.RingGeometry(1.27,1.545,32,1,start,step-gap),new THREE.MeshBasicMaterial({color:0xfff5e6,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.y=1.561;ring.add(halo);glow.push(halo);
  }
  renderer.domElement.dataset.ledCount=String(count);
  }
  setCount(8);
  const observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=Math.min(1,camera.aspect*1.18);camera.updateProjectionMatrix()});observer.observe(host);
  return {
    renderer,triCount,setCount,
    update(output,dt){output.forEach((v,i)=>{const m=lights[i].material;const b=Math.min(1,.006+v.level*1.8);m.color.setRGB(b,v.red?.002:b*.99,v.red?.001:b*.96);glow[i].material.color.setHex(v.red?0xff2109:0xfff4dc);glow[i].material.opacity=v.level*.1});controls.update(dt);renderer.render(scene,camera)},
    home(){camera.position.set(6.3,5.9,8.6);controls.target.set(0,1,0);controls.update()},
    top(){camera.position.set(0,14,.01);controls.target.set(0,1,0);controls.update()},
    reviewView(direction,elevation){
      controls.autoRotate=false;controls.enableDamping=false;controls.update();
      const az=THREE.MathUtils.degToRad(direction),el=THREE.MathUtils.degToRad(elevation);
      controls.target.set(0,1.559,0);
      camera.position.set(10.6*Math.sin(az),1.559+10.6*Math.tan(el),-10.6*Math.cos(az));
      controls.update();controls.enableDamping=true;
    },
    getView(){const delta=camera.position.clone().sub(controls.target);return {directionDegrees:(THREE.MathUtils.radToDeg(Math.atan2(delta.x,-delta.z))+360)%360,elevationDegrees:THREE.MathUtils.radToDeg(Math.atan2(delta.y,Math.hypot(delta.x,delta.z))),target:controls.target.toArray(),position:camera.position.toArray(),coverHidden:!cover.visible,frontDefinition:'center of web zone 01'}} ,
    rotate(on){controls.autoRotate=on},shell(hidden){cover.visible=!hidden},
    dispose(){observer.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()}});fade.dispose();colorMap.dispose();alphaMap.dispose();env.dispose();renderer.dispose()}
  };
}
