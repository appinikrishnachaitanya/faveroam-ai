"use client";
import {memo,useEffect,useMemo,useRef,useState} from 'react';
import type {Card} from '../../src/passport/model';
import {isPlaceSection} from '../../src/passport/model';
import {buildAreaGuide} from '../../src/passport/area-guide';
import {clusterPlaces} from '../../src/passport/place-clusters';
import {sectionLabel} from '../../src/passport/labels';
import {plotHeatmap} from '../../src/passport/heatmap-plot';

export function mappedPlaces(cards:readonly Card[]) {
  return cards.filter(card=>isPlaceSection(card.section) && card.evidence?.result.id===card.id &&
    Number.isFinite(card.intelligence?.location?.latitude) && Number.isFinite(card.intelligence?.location?.longitude) &&
    Math.abs(card.intelligence!.location.latitude!)<=90 && Math.abs(card.intelligence!.location.longitude!)<=180);
}
export default memo(function PassportMap({cards,onSelect,dayLabels,active=true,selectedCluster,onClusterSelect}:{cards:Card[];active?:boolean;selectedCluster?:string;onClusterSelect?:(id?:string)=>void;onSelect?:(card:Card)=>void;dayLabels?:Record<string,string>}) {
  const container=useRef<HTMLDivElement>(null);
  const mapInstance=useRef<import('maplibre-gl').Map | undefined>(undefined);
  useEffect(()=>{
    const map=mapInstance.current;
    if(!map)return;
    if(active)map.resize();
    else map.stop();
  },[active]);
  const [retryKey,setRetryKey]=useState(0);
  const [failed,setFailed]=useState(false);
  const [selectedId,setSelectedId]=useState<string>();
  const places=useMemo(()=>mappedPlaces(cards),[cards]);
  const selectedPlace=places.find(card=>card.id===selectedId);
  const key=retryKey+':'+places.map(card=>`${card.id}:${card.name}:${card.intelligence!.location.latitude}:${card.intelligence!.location.longitude}:${dayLabels?.[card.id]??''}`).join('|');
  const clusters=useMemo(()=>clusterPlaces(places),[places]);
  useEffect(()=>{
    const map=mapInstance.current;if(!map)return;
    const shown=clusters.find(c=>c.id===selectedCluster)?.cards??places;
    if(shown.length){const coordinates=shown.map(c=>c.intelligence!.location);map.fitBounds([[Math.min(...coordinates.map(p=>p.longitude!)),Math.min(...coordinates.map(p=>p.latitude!))],[Math.max(...coordinates.map(p=>p.longitude!)),Math.max(...coordinates.map(p=>p.latitude!))]],{padding:55,maxZoom:14,duration:0});}
  },[selectedCluster,clusters]);
  const areas=useMemo(()=>buildAreaGuide([],places).filter(area=>area.point),[places]);
  useEffect(()=>{
    if(!container.current||!places.length)return;
    let disposed=false;
    let map:import('maplibre-gl').Map|undefined;
    const markers:import('maplibre-gl').Marker[]=[];
    let tileFailure=false;
    const timer=window.setTimeout(()=>{if(!disposed)setFailed(true);},12000);
    void import('maplibre-gl').then(({default:maplibregl})=>{
      if(disposed||!container.current)return;
      const first=places[0].intelligence!.location;
      map=new maplibregl.Map({container:container.current,style:{version:8,sources:{basemap:{type:'raster',tiles:['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png','https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors © CARTO'}},layers:[{id:'basemap',type:'raster',source:'basemap'}]},center:[first.longitude!,first.latitude!],zoom:11,attributionControl:false});
      mapInstance.current=map;
      map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
      map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'© OpenStreetMap contributors · © CARTO'}));
      map.on('load',()=>{if(!disposed&&!tileFailure){window.clearTimeout(timer);setFailed(false);}});
      map.on('error',event=>{if(!disposed&&!tileFailure){tileFailure=true;const status=Number((event.error as Error&{status?:number})?.status);console.warn('FaveRoam map load failed',{provider:'CARTO',status:Number.isInteger(status)&&status>=400&&status<600?status:undefined});window.clearTimeout(timer);setFailed(true);}});
      const bounds=new maplibregl.LngLatBounds();
      for(const card of places){
        const point=card.intelligence!.location;
        const marker=document.createElement('button');marker.type='button';marker.className='passport-map-marker';marker.textContent=dayLabels?.[card.id]??'●';marker.title=card.name;marker.setAttribute('aria-label',`Show details for ${card.name}`);marker.onclick=event=>{event.stopPropagation();setSelectedId(card.id);};
        markers.push(new maplibregl.Marker({element:marker}).setLngLat([point.longitude!,point.latitude!]).addTo(map));
        bounds.extend([point.longitude!,point.latitude!]);
      }
      if(places.length>1)map.fitBounds(bounds,{padding:55,maxZoom:13,duration:0});
      const anchors=clusters.length?clusters.map(cluster=>({point:cluster.center,radiusMeters:cluster.radiusMeters})):areas.map(area=>({...area,radiusMeters:700}));
      map.on('load',()=>{if(!map||disposed)return;
        for(const [anchorIndex,area] of anchors.entries()){const point=area.point!;const id=`anchor-${anchorIndex}`;
          // Approximate display circle around a real venue, never a named neighbourhood.
          const delta=Math.max(150,area.radiusMeters)/111320;
          const ring=Array.from({length:49},(_,index)=>{const angle=index*Math.PI*2/48;const lat=point.latitude+delta*Math.sin(angle);return [point.longitude+delta*Math.cos(angle)/Math.max(0.2,Math.cos(point.latitude*Math.PI/180)),lat];});
          map.addSource(id,{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}}});
          map.addLayer({id,type:'fill',source:id,paint:{'fill-color':'#b97948','fill-opacity':0.12}});
        }
      });
    }).catch(()=>{if(!disposed){console.warn('FaveRoam map initialization failed',{provider:'CARTO'});setFailed(true);}});
    return ()=>{disposed=true;window.clearTimeout(timer);markers.forEach(marker=>marker.remove());map?.remove();if(mapInstance.current===map)mapInstance.current=undefined;};
  },[key]);
  const schematic=useMemo(()=>plotHeatmap(places.map(card=>({latitude:card.intelligence!.location.latitude!,longitude:card.intelligence!.location.longitude!,affinity:0}))),[places]);
  return <section className="passport-map-panel" aria-label="Map of returned places">
    {onClusterSelect&&clusters.length>0&&<div className="place-clusters" aria-label="Explore nearby groups"><div><h3>Explore one area at a time</h3><p>Nearby returned places, grouped by distance. Area names use a real venue—not an assumed neighbourhood.</p></div><div className="cluster-options"><button type="button" className="quiet-button" aria-pressed={!selectedCluster} onClick={()=>onClusterSelect(undefined)}>All discoveries</button>{clusters.map(cluster=><button type="button" key={cluster.id} className="cluster-option" aria-pressed={selectedCluster===cluster.id} onClick={()=>onClusterSelect(cluster.id)}><strong>Around {cluster.anchor.name}</strong><span>{cluster.cards.length} places · {cluster.categories.map(sectionLabel).join(', ')}</span><small>Within {(cluster.radiusMeters/1000).toFixed(1)} km of this anchor, straight-line.{cluster.evidenceCount?' Uses your returned taste-grounded discoveries.':''}</small></button>)}</div></div>}
    <p>Only places with returned coordinates appear here. Circles show the area around named venues, not a verified neighbourhood boundary. Check routes and hours before going.</p>
    {!places.length?<p>No returned places have usable coordinates yet. Your cards remain available.</p>:<>
      <div ref={container} className="passport-map-canvas" hidden={failed} aria-label="Interactive map of returned places"/>
      {failed&&<div className="passport-map-fallback"><strong>Map tiles are unavailable. Here is a schematic view of the same returned coordinates.</strong><button type="button" className="quiet-button" onClick={()=>{setFailed(false);setRetryKey(value=>value+1);}}>Try map again</button><div className="schematic-map" aria-label={`${places.length} returned place coordinates on a schematic plot`}>{places.map(card=>{const point=schematic?.points.find(point=>Math.abs(card.intelligence!.location.latitude!-point.latitude)<0.00001&&Math.abs(card.intelligence!.location.longitude!-point.longitude)<0.00001);if(!point)return null;return <button key={card.id} type="button" title={card?.name} aria-label={`Show details for ${card?.name??'place'}`} aria-pressed={selectedPlace?.id===card?.id} style={{left:`${point.x}%`,top:`${point.y}%`}} onClick={event=>{event.stopPropagation();if(card)setSelectedId(card.id);}}>{dayLabels?.[card.id]??'●'}</button>;})}</div></div>}
      {selectedPlace&&<div className="map-place-detail" aria-live="polite"><div><span className="micro-label">{selectedPlace.section}</span><strong>{selectedPlace.name}</strong><p>{selectedPlace.address??`Returned in ${selectedPlace.evidence?.destination??'your destination'}`}</p></div><button type="button" className="icon-button" aria-label="Close place details" onClick={()=>setSelectedId(undefined)}>×</button>{onSelect&&<button type="button" className="quiet-button" onClick={()=>onSelect(selectedPlace)}>View discovery</button>}</div>}
      <ul className="passport-map-legend">{areas.map(area=><li key={area.anchor.id}>Area around <strong>{area.anchor.name}</strong></li>)}</ul>
    </>}
  </section>;
});
