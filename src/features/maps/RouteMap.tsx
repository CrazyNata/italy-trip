import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth'
const coords:Record<string,[number,number]>={'Зальцбург, Австрия':[13.04,47.8],'Верона, Италия':[10.99,45.44],'Рим, Италия':[12.5,41.9],'Фильине-Вальдарно, Тоскана':[11.47,43.62],'Кьоджа, Италия':[12.28,45.22],'Милан, Италия':[9.19,45.46],'Вальдидентро, Альпы':[10.28,46.48],'Мюнхен, Германия':[11.6,48.15]}
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
        map=new m.Map({container:ref.current,style:'mapbox://styles/mapbox/outdoors-v12',center:ps[0],zoom:4,cooperativeGestures:true});
        map.on('error',()=>live&&setError("Не удалось загрузить карту. Проверьте токен и подключение."));
        map.addControl(new m.NavigationControl({showCompass:false}));
        ps.slice(0,-1).forEach((p,i)=>new m.Marker({color:i?'#2a7089':'#d99a4e'}).setLngLat(p).setPopup(new m.Popup().setText(i?cities[i-1]:'Прага')).addTo(map!));
        map.once('load',()=>{try{map!.addSource('route',{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:ps}}});map!.addLayer({id:'route',type:'line',source:'route',paint:{'line-color':'#2a7089','line-width':4,'line-dasharray':[1,1.5]}});const b=new m.LngLatBounds();ps.forEach(p=>b.extend(p));map!.fitBounds(b,{padding:45,duration:0})}catch{if(live)setError("Не удалось отобразить маршрут.")}});
      } catch { if(live)setError("Не удалось запустить карту в этом браузере."); map?.remove(); }
    }).catch(()=>{map?.remove();if(live)setError("Не удалось загрузить модуль карты.")});
    return()=>{live=false;map?.remove()}
  },[mapboxToken,cities.join('|')]);
  const message=error||(!loading&&!mapboxToken?"Токен карты недоступен.":!mapboxToken?"Карта загружается…":"");
  return <div className="map-box relative h-[440px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--track)]"><div ref={ref} className="h-full"/>{message&&<div className="absolute inset-0 grid place-items-center bg-[var(--track)] p-6 text-center text-sm text-[var(--muted)]" role="status">{message}</div>}</div>
}
