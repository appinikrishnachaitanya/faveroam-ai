"use client";
import {memo,useEffect,useMemo,useRef,useState} from 'react';
import type {Card} from '../../src/passport/model';
import {isPlaceSection} from '../../src/passport/model';
import {buildAreaGuide} from '../../src/passport/area-guide';
import {clusterPlaces,type GeoPoint} from '../../src/passport/place-clusters';
import {areaHighlights,nearbyReturnedPlaces} from '../../src/passport/nearby';
import {sectionLabel} from '../../src/passport/labels';
import {plotHeatmap} from '../../src/passport/heatmap-plot';

export function mappedPlaces(cards:readonly Card[]) {
  return cards.filter(card=>isPlaceSection(card.section) && card.evidence?.result.id===card.id &&
    Number.isFinite(card.intelligence?.location?.latitude) && Number.isFinite(card.intelligence?.location?.longitude) &&
    Math.abs(card.intelligence!.location.latitude!)<=90 && Math.abs(card.intelligence!.location.longitude!)<=180);
}
export default memo(function PassportMap({cards,cartoKey='',onSelect,onPlanFrom,onFavorite,favoriteIds,favoriteDisabled=false,plannableIds,dayLabels,active=true,selectedCluster,onClusterSelect}:{cards:Card[];cartoKey?:string;active?:boolean;selectedCluster?:string;onClusterSelect?:(id?:string)=>void;onSelect?:(card:Card)=>void;onPlanFrom?:(card:Card)=>void;onFavorite?:(card:Card)=>void|Promise<void>;favoriteIds?:ReadonlySet<string>;favoriteDisabled?:boolean;plannableIds?:ReadonlySet<string>;dayLabels?:Record<string,string>}) {
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
  const [failureKind,setFailureKind]=useState<'key'|'tiles'|'initialize'>('tiles');
  const [selectedId,setSelectedId]=useState<string>();
  const [savingFavorite,setSavingFavorite]=useState(false);
  const selectedDetails=useRef<HTMLDivElement>(null);
  const [location,setLocation]=useState<GeoPoint>();
  const [locating,setLocating]=useState(false);
  const [locationMessage,setLocationMessage]=useState('');
  const locationRequest=useRef(0);
  useEffect(()=>()=>{locationRequest.current++;},[]);
  const places=useMemo(()=>mappedPlaces(cards),[cards]);
  const nearby=useMemo(()=>location?nearbyReturnedPlaces(places,location).slice(0,3):[],[places,location]);
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
    const timer=window.setTimeout(()=>{if(!disposed){map?.stop();setFailureKind('tiles');setFailed(true);}},12000);
    void Promise.resolve().then(async()=>{
      if(!cartoKey)throw Error('map-key-unavailable');
      return await import('maplibre-gl');
    }).then(maplibregl=>{
      if(disposed||!container.current)return;
      const first=places[0].intelligence!.location;
      const tileUrl=`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`;
      map=new maplibregl.Map({container:container.current,style:{version:8,sources:{basemap:{type:'raster',tiles:[tileUrl],tileSize:256,attribution:'© OpenStreetMap contributors · © CARTO'}},layers:[{id:'basemap',type:'raster',source:'basemap'}]},center:[first.longitude!,first.latitude!],zoom:11,attributionControl:false});
      mapInstance.current=map;
      map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
      map.addControl(new maplibregl.AttributionControl({compact:false}),'bottom-right');
      map.on('idle',()=>{if(!disposed&&!tileFailure&&map?.areTilesLoaded()){window.clearTimeout(timer);setFailed(false);}});
      map.on('error',event=>{if(!disposed&&!tileFailure){tileFailure=true;const status=Number((event.error as Error&{status?:number})?.status);console.warn('FaveRoam map load failed',{provider:'CARTO',status:Number.isInteger(status)&&status>=400&&status<600?status:undefined});window.clearTimeout(timer);map?.stop();setFailureKind('tiles');setFailed(true);}});
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
    }).catch(error=>{if(!disposed){window.clearTimeout(timer);const missing=error instanceof Error&&error.message==='map-key-unavailable';console.warn('FaveRoam map initialization failed',{provider:'CARTO',reason:missing?'key-unavailable':'initialization'});setFailureKind(missing?'key':'initialize');setFailed(true);}});
    return ()=>{disposed=true;window.clearTimeout(timer);markers.forEach(marker=>marker.remove());map?.remove();if(mapInstance.current===map)mapInstance.current=undefined;};
  },[key,cartoKey]);
  const schematic=useMemo(()=>plotHeatmap(places.map(card=>({latitude:card.intelligence!.location.latitude!,longitude:card.intelligence!.location.longitude!,affinity:0}))),[places]);
  function exploreNearMe(){
    if(!navigator.geolocation){setLocationMessage('Location is not available in this browser. Your city discoveries are still here.');return;}
    const request=++locationRequest.current;
    setLocating(true);setLocationMessage('Finding your distance to returned places…');
    navigator.geolocation.getCurrentPosition(position=>{
      if(request!==locationRequest.current)return;
      setLocating(false);
      setLocation({latitude:position.coords.latitude,longitude:position.coords.longitude});
      setLocationMessage('Distances are straight-line estimates from your current location. Check the route before visiting.');
    },()=>{
      if(request!==locationRequest.current)return;
      setLocating(false);setLocationMessage('Location was unavailable or declined. Your city discoveries are unchanged.');
    },{enableHighAccuracy:false,maximumAge:0,timeout:10000});
  }
  return <section className="passport-map-panel" aria-label="Map of returned places">
    {onClusterSelect&&clusters.length>0&&<div className="place-clusters" aria-label="Compare areas"><div className="place-clusters-heading"><span className="micro-label">EXPLORE BY AREA</span><h3>Compare areas</h3><p>Filter discoveries around returned places. Each area is anchored by a real venue, not an invented neighbourhood.</p></div><div className="cluster-options"><button type="button" className="cluster-option all-discoveries-option" aria-pressed={!selectedCluster} onClick={()=>onClusterSelect(undefined)}><span className="all-discoveries-mark" aria-hidden="true">✦</span><strong>All discoveries</strong><span>Show every mapped place in the list.</span><small>{places.length} places with map locations</small></button>{clusters.map((cluster,index)=><button type="button" key={cluster.id} className="cluster-option area-cluster-option" aria-pressed={selectedCluster===cluster.id} onClick={()=>onClusterSelect(cluster.id)}><span className="area-cluster-kicker">AREA {String(index+1).padStart(2,'0')}</span><strong>Around {cluster.anchor.name}</strong><span className="area-cluster-count">{cluster.cards.length} returned places</span><span className="cluster-highlights">{areaHighlights(cluster.cards).map(group=><span key={group.section}><b>{group.count} {sectionLabel(group.section)}</b><small>e.g. {group.example}</small></span>)}</span><small>Within {(cluster.radiusMeters/1000).toFixed(1)} km, straight-line.</small></button>)}</div></div>}
    {onClusterSelect&&places.length>0&&<div className="near-me-panel"><div><h3>Explore near me</h3><p>Sort these returned places by your current location. We don’t save your location.</p></div><button type="button" className="quiet-button" disabled={locating} onClick={exploreNearMe}>{locating?'Finding places…':location?'Update my location':'Use my location'}</button>{location&&<button type="button" className="quiet-button" onClick={()=>{locationRequest.current++;setLocation(undefined);setLocating(false);setLocationMessage('Location cleared.');}}>Clear location</button>}{locationMessage&&<p role="status">{locationMessage}</p>}{location&&<div className="near-me-results">{nearby.length?nearby.map(({card,distanceKm,evidence})=><button key={card.id} type="button" className="near-me-choice" onClick={()=>{setSelectedId(card.id);requestAnimationFrame(()=>selectedDetails.current?.scrollIntoView({behavior:'smooth',block:'nearest'}));}}><strong>{card.name}</strong><span>{sectionLabel(card.section)} · {distanceKm<10?distanceKm.toFixed(1):Math.round(distanceKm)} km away</span><small>{evidence===2?'Returned taste contribution':evidence===1?'Found with your confirmed tastes':'Returned place'}</small></button>):<p>No returned places have usable coordinates.</p>}</div>}{location&&nearby[0]?.distanceKm>100&&<p role="status">You’re far from these {cards[0]?.evidence?.destination??'city'} discoveries. They remain available for planning your visit.</p>}</div>}
    <p>Only places with returned coordinates appear here. Circles show the area around named venues, not a verified neighbourhood boundary. Check routes and hours before going.</p>
    {!places.length?<p>No returned places have usable coordinates yet. Your cards remain available.</p>:<>
      <div ref={container} className="passport-map-canvas" hidden={failed} aria-label="Interactive map of returned places"/>
      {failed&&<div className="passport-map-fallback"><strong>{failureKind==='key'?'The map needs setup. Your returned places are shown below.':failureKind==='initialize'?'The interactive map could not open. Your returned places are shown below.':'Map tiles are unavailable. Here is a schematic view of the same returned coordinates.'}</strong><button type="button" className="quiet-button" onClick={()=>{setFailed(false);setRetryKey(value=>value+1);}}>Try map again</button><div className="schematic-map" aria-label={`${places.length} returned place coordinates on a schematic plot`}>{places.map(card=>{const point=schematic?.points.find(point=>Math.abs(card.intelligence!.location.latitude!-point.latitude)<0.00001&&Math.abs(card.intelligence!.location.longitude!-point.longitude)<0.00001);if(!point)return null;return <button key={card.id} type="button" title={card?.name} aria-label={`Show details for ${card?.name??'place'}`} aria-pressed={selectedPlace?.id===card?.id} style={{left:`${point.x}%`,top:`${point.y}%`}} onClick={event=>{event.stopPropagation();if(card)setSelectedId(card.id);}}>{dayLabels?.[card.id]??'●'}</button>;})}</div></div>}
      {selectedPlace&&<div ref={selectedDetails} className="map-place-detail" aria-live="polite"><div><span className="micro-label">{sectionLabel(selectedPlace.section)}</span><strong>{selectedPlace.name}</strong><p>{selectedPlace.address??`Returned in ${selectedPlace.evidence?.destination??'your destination'}`}</p></div><button type="button" className="icon-button" aria-label="Close place details" onClick={()=>setSelectedId(undefined)}>×</button>{(onSelect||onFavorite||onPlanFrom&&plannableIds?.has(selectedPlace.id))&&<div className="map-place-actions">{onFavorite&&<button type="button" className="primary-button" disabled={savingFavorite||favoriteDisabled} aria-pressed={favoriteIds?.has(selectedPlace.id)??false} onClick={async()=>{setSavingFavorite(true);try{await onFavorite(selectedPlace);}finally{setSavingFavorite(false);}}}>{savingFavorite?"Saving…":favoriteIds?.has(selectedPlace.id)?"Remove from My Places":"Save to My Places"}</button>}{onSelect&&<button type="button" className="quiet-button" onClick={()=>onSelect(selectedPlace)}>View discovery</button>}{onPlanFrom&&plannableIds?.has(selectedPlace.id)&&<button type="button" className="primary-button" onClick={()=>onPlanFrom(selectedPlace)}>Plan from here</button>}</div>}</div>}
      <ul className="passport-map-legend">{areas.map(area=><li key={area.anchor.id}>Area around <strong>{area.anchor.name}</strong></li>)}</ul>
    </>}
  </section>;
});
