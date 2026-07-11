import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth'
const coords:Record<string,[number,number]>={'Зальцбург, Австрия':[13.04,47.8],'Верона, Италия':[10.99,45.44],'Рим, Италия':[12.5,41.9],'Фильине-Вальдарно, Тоскана':[11.47,43.62],'Кьоджа, Италия':[12.28,45.22],'Милан, Италия':[9.19,45.46],'Вальдидентро, Альпы':[10.28,46.48],'Мюнхен, Германия':[11.6,48.15]}
// Warm colour grade for the Mapbox Standard "warm" gallery look — a cube-strip
// LUT (N blue-slices wide, red on x, green on y) that pushes the palette golden.
let warmLutCache:string|null=null
function warmLut():string{
  if(warmLutCache)return warmLutCache
  const N=32,canvas=document.createElement('canvas');canvas.width=N*N;canvas.height=N
  const ctx=canvas.getContext('2d');if(!ctx)return ''
  const img=ctx.createImageData(N*N,N),d=img.data,clamp=(v:number)=>v<0?0:v>255?255:v
  for(let b=0;b<N;b++)for(let g=0;g<N;g++)for(let r=0;r<N;r++){
    const x=b*N+r,i=(g*N*N+x)*4,R=r/(N-1)*255,G=g/(N-1)*255,B=b/(N-1)*255
    // light + soft warm grade: gentle desaturation, lifted (airy) tones, red warmer than blue
    const lum=0.3*R+0.59*G+0.11*B,s=0.9
    d[i]=clamp((lum+(R-lum)*s)*0.93+20);d[i+1]=clamp((lum+(G-lum)*s)*0.94+16);d[i+2]=clamp((lum+(B-lum)*s)*0.95+12);d[i+3]=255
  }
  ctx.putImageData(img,0,0)
  warmLutCache=canvas.toDataURL('image/png').split(',')[1]
  return warmLutCache
}
export function RouteMap({cities}:{cities:string[]}) {
  const ref=useRef<HTMLDivElement>(null), {mapboxToken,loading}=useAuth();
  const [error,setError]=useState("");
  useEffect(()=>{
    if(!ref.current||!mapboxToken)return;
    let map:import('mapbox-gl').Map|undefined, live=true;
    setError("");
    void import('mapbox-gl').then(({default:m})=>{
      if(!live||!ref.current)return;
      try {
        m.accessToken=mapboxToken;
        const ps:[[number,number],...Array<[number,number]>]=[[14.44,50.08],...cities.map(c=>coords[c]).filter(Boolean),[14.44,50.08]] as typeof ps;
        map=new m.Map({container:ref.current,style:'mapbox://styles/mapbox/standard',config:{basemap:{theme:'custom','theme-data':warmLut()}},center:ps[0],zoom:4,cooperativeGestures:true,attributionControl:false});
        map.on('error',()=>live&&setError("Не удалось загрузить карту. Проверьте токен и подключение."));
        map.addControl(new m.NavigationControl({showCompass:false}),'top-left');
        map.addControl(new m.AttributionControl({compact:true}));
        const ac=(getComputedStyle(document.documentElement).getPropertyValue('--ac')||'#b95c3f').trim();
        ps.slice(0,-1).forEach((p,i)=>{const el=document.createElement('div');el.style.cssText=i===0?'width:30px;height:30px;border-radius:50%;background:#2a7089;color:#fff;display:grid;place-items:center;font-size:13px;box-shadow:0 1px 6px rgba(0,0,0,.35);border:2px solid #fff':`width:28px;height:28px;border-radius:50%;background:${ac};color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;box-shadow:0 1px 6px rgba(0,0,0,.35);border:2px solid #fff`;el.innerHTML=i===0?'<i class="fa-solid fa-house"></i>':String(i);new m.Marker({element:el}).setLngLat(p).setPopup(new m.Popup({offset:18,closeButton:false}).setText(i?cities[i-1]:'Прага')).addTo(map!)});
        map.once('load',()=>{try{map!.addSource('route',{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:ps}}});map!.addLayer({id:'route',type:'line',source:'route',slot:'middle',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':ac,'line-width':3,'line-opacity':.85,'line-dasharray':[1,1.6]}});const b=new m.LngLatBounds();ps.forEach(p=>b.extend(p));map!.fitBounds(b,{padding:50,duration:0})}catch{if(live)setError("Не удалось отобразить маршрут.")}});
      } catch { if(live)setError("Не удалось запустить карту в этом браузере."); map?.remove(); }
    }).catch(()=>{map?.remove();if(live)setError("Не удалось загрузить модуль карты.")});
    return()=>{live=false;map?.remove()}
  },[mapboxToken,cities.join('|')]);
  const message=error||(!loading&&!mapboxToken?"Токен карты недоступен.":!mapboxToken?"Карта загружается…":"");
  return <div className="map-box" style={{position:'relative',borderRadius:16,overflow:'hidden',border:'1px solid var(--line,#e7dcc7)',height:440,background:'var(--track,#efe4cf)'}}><div ref={ref} style={{position:'absolute',inset:0}}/>{message&&<div className="absolute inset-0 grid place-items-center bg-[var(--track)] p-6 text-center text-sm text-[var(--muted)]" role="status">{message}</div>}</div>
}
