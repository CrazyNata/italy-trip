import { useEffect, useRef, useState } from 'react'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
import { useAuth } from '../../auth'
import { WARM_STYLE, warmConfig } from './mapTheme'
const coords:Record<string,[number,number]>={'Зальцбург, Австрия':[13.04,47.8],'Верона, Италия':[10.99,45.44],'Рим, Италия':[12.5,41.9],'Фильине-Вальдарно, Тоскана':[11.47,43.62],'Кьоджа, Италия':[12.28,45.22],'Милан, Италия':[9.19,45.46],'Вальдидентро, Альпы':[10.28,46.48],'Мюнхен, Германия':[11.6,48.15]}
export function RouteMap({cities,focus}:{cities:string[];focus?:{city:string;nonce:number}|null}) {
  const ref=useRef<HTMLDivElement>(null), {mapboxToken,loading}=useAuth();
  const mapRef=useRef<MapboxMap|undefined>(undefined);
  const markersRef=useRef<Record<string,MapboxMarker>>({});
  const [error,setError]=useState("");
  useEffect(()=>{
    if(!ref.current||!mapboxToken)return;
    let map:MapboxMap|undefined, live=true;
    setError("");
    markersRef.current={};
    void import('mapbox-gl').then(({default:m})=>{
      if(!live||!ref.current)return;
      try {
        m.accessToken=mapboxToken;
        const ps:[[number,number],...Array<[number,number]>]=[[14.44,50.08],...cities.map(c=>coords[c]).filter(Boolean),[14.44,50.08]] as typeof ps;
        map=new m.Map({container:ref.current,style:WARM_STYLE,config:warmConfig(),center:ps[0],zoom:4,cooperativeGestures:true,attributionControl:false});
        mapRef.current=map;
        map.on('error',()=>live&&setError("Не удалось загрузить карту. Проверьте токен и подключение."));
        map.addControl(new m.NavigationControl({showCompass:false}),'top-left');
        map.addControl(new m.AttributionControl({compact:true}));
        const ac=(getComputedStyle(document.documentElement).getPropertyValue('--ac')||'#b95c3f').trim();
        ps.slice(0,-1).forEach((p,i)=>{const el=document.createElement('div');el.style.cssText=i===0?'width:30px;height:30px;border-radius:50%;background:#6b7355;color:#fff;display:grid;place-items:center;font-size:13px;box-shadow:0 1px 6px rgba(0,0,0,.35);border:2px solid #fff':`width:28px;height:28px;border-radius:50%;background:${ac};color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;box-shadow:0 1px 6px rgba(0,0,0,.35);border:2px solid #fff`;el.innerHTML=i===0?'<i class="fa-solid fa-house"></i>':String(i);const marker=new m.Marker({element:el}).setLngLat(p).setPopup(new m.Popup({offset:18,closeButton:false}).setText(i?cities[i-1]:'Прага')).addTo(map!);if(i)markersRef.current[cities[i-1]]=marker});
        map.once('load',()=>{try{map!.addSource('route',{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:ps}}});map!.addLayer({id:'route',type:'line',source:'route',slot:'middle',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':ac,'line-width':3,'line-opacity':.85,'line-dasharray':[1,1.6]}});const b=new m.LngLatBounds();ps.forEach(p=>b.extend(p));map!.fitBounds(b,{padding:50,duration:0})}catch{if(live)setError("Не удалось отобразить маршрут.")}});
      } catch { if(live)setError("Не удалось запустить карту в этом браузере."); map?.remove(); }
    }).catch(()=>{map?.remove();if(live)setError("Не удалось загрузить модуль карты.")});
    return()=>{live=false;map?.remove();mapRef.current=undefined;markersRef.current={}}
  },[mapboxToken,cities.join('|')]);
  // Наводим карту на выбранный город: плавный перелёт + открытая подпись.
  useEffect(()=>{
    const map=mapRef.current, point=focus&&coords[focus.city];
    if(!focus||!map||!point)return;
    const go=()=>{
      map.flyTo({center:point,zoom:8.5,duration:1300,essential:true});
      Object.values(markersRef.current).forEach(mk=>{const pop=mk.getPopup();if(pop&&pop.isOpen())mk.togglePopup()});
      const marker=markersRef.current[focus.city];
      if(marker){const pop=marker.getPopup();if(pop&&!pop.isOpen())marker.togglePopup()}
    };
    if(map.loaded())go();else map.once('load',go);
  },[focus?.city,focus?.nonce]);
  const message=error||(!loading&&!mapboxToken?"Токен карты недоступен.":!mapboxToken?"Карта загружается…":"");
  return <div className="map-box" style={{position:'relative',borderRadius: "var(--r-4)",overflow:'hidden',border:'1px solid var(--line,#e7dcc7)',height:440,background:'var(--track,#efe4cf)'}}><div ref={ref} style={{position:'absolute',inset:0}}/>{message&&<div className="absolute inset-0 grid place-items-center bg-[var(--track)] p-6 text-center text-sm text-[var(--muted)]" role="status">{message}</div>}</div>
}
