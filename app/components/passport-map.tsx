"use client";
import {memo,useEffect,useRef,useState} from 'react';
import type {Card} from '../../src/passport/model';
import {isPlaceSection} from '../../src/passport/model';
import {buildAreaGuide} from '../../src/passport/area-guide';
import {plotHeatmap} from '../../src/passport/heatmap-plot';

export function mappedPlaces(cards:readonly Card[]) {
  return cards.filter(card=>isPlaceSection(card.section) && card.evidence?.result.id===card.id &&
    Number.isFinite(card.intelligence?.location?.latitude) && Number.isFinite(card.intelligence?.location?.longitude) &&
    Math.abs(card.intelligence!.location.latitude!)<=90 && Math.abs(card.intelligence!.location.longitude!)<=180);
}
export default memo(function PassportMap({cards,onSelect,dayLabels}:{cards:Card[];onSelect?:(card:Card)=>void;dayLabels?:Record<string,string>}) {
  const container=useRef<HTMLDivElement>(null);
  const [failed,setFailed]=useState(false);
  const [selectedPlace,setSelectedPlace]=useState<Card>();
  const places=mappedPlaces(cards);
  const key=places.map(card=>card.id).join('|');
  useEffect(()=>{
    if(!container.current||!places.length)return;
    let disposed=false;
    let map:import('maplibre-gl').Map|undefined;
    const markers:import('maplibre-gl').Marker[]=[];
    const timer=window.setTimeout(()=>{if(!disposed)setFailed(true);},12000);
    void import('maplibre-gl').then(({default:maplibregl})=>{
      if(disposed||!container.current)return;
      const first=places[0].intelligence!.location;
      map=new maplibregl.Map({container:container.current,style:{version:8,sources:{basemap:{type:'raster',tiles:['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png','https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors © CARTO'}},layers:[{id:'basemap',type:'raster',source:'basemap'}]},center:[first.longitude!,first.latitude!],zoom:11,attributionControl:false});
      map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
      map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'© OpenStreetMap contributors · © CARTO'}));
      map.on('load',()=>{window.clearTimeout(timer);if(!disposed)setFailed(false);});
      map.on('error',()=>{if(!disposed&&!map?.isStyleLoaded())setFailed(true);});
      const bounds=new maplibregl.LngLatBounds();
      for(const card of places){
        const point=card.intelligence!.location;
        const marker=document.createElement('button');marker.type='button';marker.className='passport-map-marker';marker.textContent=dayLabels?.[card.id]??'●';marker.title=card.name;marker.setAttribute('aria-label',`Show details for ${card.name}`);marker.onclick=()=>setSelectedPlace(card);
        markers.push(new maplibregl.Marker({element:marker}).setLngLat([point.longitude!,point.latitude!]).addTo(map));
        bounds.extend([point.longitude!,point.latitude!]);
      }
      if(places.length>1)map.fitBounds(bounds,{padding:55,maxZoom:13,duration:0});
      const anchors=buildAreaGuide([],places).filter(area=>area.point);
      map.on('load',()=>{if(!map||disposed)return;
        for(const area of anchors){const point=area.point!;const id=`anchor-${anchors.indexOf(area)}`;
          // Approximate display circle around a real venue, never a named neighbourhood.
          const ring=Array.from({length:49},(_,index)=>{const angle=index*Math.PI*2/48;const lat=point.latitude+0.0063*Math.sin(angle);return [point.longitude+0.0063*Math.cos(angle)/Math.max(0.2,Math.cos(point.latitude*Math.PI/180)),lat];});
          map.addSource(id,{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}}});
          map.addLayer({id,type:'fill',source:id,paint:{'fill-color':'#b97948','fill-opacity':0.12}});
        }
      });
    }).catch(()=>{if(!disposed)setFailed(true);});
    return ()=>{disposed=true;window.clearTimeout(timer);markers.forEach(marker=>marker.remove());map?.remove();};
  },[key]);
  const schematic=plotHeatmap(places.map(card=>({latitude:card.intelligence!.location.latitude!,longitude:card.intelligence!.location.longitude!,affinity:0})));
  return <section className="passport-map-panel" aria-label="Map of returned places">
    <p>Only places with returned coordinates appear here. Circles show the area around named venues, not a verified neighbourhood boundary. Check routes and hours before going.</p>
    {!places.length?<p>No returned places have usable coordinates yet. Your cards remain available.</p>:<>
      <div ref={container} className="passport-map-canvas" hidden={failed} aria-label="Interactive map of returned places"/>
      {failed&&<div className="passport-map-fallback"><strong>Map tiles are unavailable. Here is a schematic view of the same returned coordinates.</strong><div className="schematic-map" aria-label={`${places.length} returned place coordinates on a schematic plot`}>{schematic?.points.map((point,index)=>{const card=places.find(place=>Math.abs(place.intelligence!.location.latitude!-point.latitude)<0.00001&&Math.abs(place.intelligence!.location.longitude!-point.longitude)<0.00001);return <button key={index} type="button" title={card?.name} aria-label={`Show details for ${card?.name??'place'}`} aria-pressed={selectedPlace?.id===card?.id} style={{left:`${point.x}%`,top:`${point.y}%`}} onClick={()=>card&&setSelectedPlace(card)}>●</button>;})}</div></div>}
      {selectedPlace&&<div className="map-place-detail" aria-live="polite"><div><span className="micro-label">{selectedPlace.section}</span><strong>{selectedPlace.name}</strong><p>{selectedPlace.address??`Returned in ${selectedPlace.evidence?.destination??'your destination'}`}</p></div><button type="button" className="icon-button" aria-label="Close place details" onClick={()=>setSelectedPlace(undefined)}>×</button>{onSelect&&<button type="button" className="quiet-button" onClick={()=>onSelect(selectedPlace)}>View discovery</button>}</div>}
      <ul className="passport-map-legend">{buildAreaGuide([],places).filter(area=>area.point).map(area=><li key={area.anchor.id}>Area around <strong>{area.anchor.name}</strong></li>)}</ul>
    </>}
  </section>;
});
