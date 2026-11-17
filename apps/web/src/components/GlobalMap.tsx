import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { Activity, ExternalLink, Globe2, MapPin } from 'lucide-react';

type Provider = { id:string; name:string; slug:string; category:string; status_url:string; enabled:boolean; current_status:string|null; last_checked_at:string|null };
type Incident = { id:string; title:string; status:string; impact:string; updated_at:string; source_url:string|null; provider_name:string; provider_id:string };

type Geo = { lat:number; lng:number; city:string };
// Approximate provider headquarters / principal office city coordinates, not outage or data-centre locations.
const GEO:Record<string,Geo> = {
  cloudflare:{lat:37.7749,lng:-122.4194,city:'San Francisco, US'},
  github:{lat:37.7749,lng:-122.4194,city:'San Francisco, US'},
  atlassian:{lat:-33.8688,lng:151.2093,city:'Sydney, Australia'},
  digitalocean:{lat:40.7128,lng:-74.006,city:'New York, US'},
  twilio:{lat:37.3382,lng:-121.8863,city:'San Jose, US'},
  openai:{lat:37.7749,lng:-122.4194,city:'San Francisco, US'},
  discord:{lat:37.7749,lng:-122.4194,city:'San Francisco, US'},
  zoom:{lat:37.3382,lng:-121.8863,city:'San Jose, US'},
  'mongodb-atlas':{lat:40.7128,lng:-74.006,city:'New York, US'},
  supabase:{lat:1.3521,lng:103.8198,city:'Singapore'},
  netlify:{lat:37.7749,lng:-122.4194,city:'San Francisco, US'},
  akamai:{lat:42.3736,lng:-71.1097,city:'Cambridge, US'},
  npm:{lat:37.8044,lng:-122.2712,city:'Oakland, US'},
  'new-relic':{lat:37.7749,lng:-122.4194,city:'San Francisco, US'},
  aws:{lat:47.6062,lng:-122.3321,city:'Seattle, US'},
  'google-cloud':{lat:37.3861,lng:-122.0839,city:'Mountain View, US'},
  azure:{lat:47.674,lng:-122.1215,city:'Redmond, US'},
  'ibm-cloud':{lat:41.1065,lng:-73.714,city:'Armonk, US'},
  'oracle-cloud':{lat:30.2672,lng:-97.7431,city:'Austin, US'}
};
const statusColor=(status:string|null)=>status==='none'?'#48d9a7':status==='minor'?'#f4c46b':status==='maintenance'?'#79baff':status==='major'||status==='critical'?'#ff6e78':'#8b9aaa';
const statusLabel=(status:string|null)=>status==='none'?'Operational':status==='minor'?'Minor issues':status==='maintenance'?'Maintenance':status==='major'?'Major issues':status==='critical'?'Critical':'Unknown';
const fmt=(value:string|null)=>value?new Date(value).toLocaleString():'Not checked';

export default function GlobalMap({providers,incidents}:{providers:Provider[];incidents:Incident[]}) {
  const globeRef=useRef<any>(null);
  const canvasHostRef=useRef<HTMLDivElement|null>(null);
  const [canvasWidth,setCanvasWidth]=useState(0);
  const [selected,setSelected]=useState<Provider|null>(null);
  const mapped=useMemo(()=>providers.flatMap(provider=>{
    const geo=GEO[provider.slug];
    return geo?[{...provider,...geo,color:statusColor(provider.current_status)}]:[];
  }),[providers]);
  const rings=useMemo(()=>mapped.filter(p=>p.current_status && p.current_status!=='none').map(p=>({...p,maxR:2.1,propagationSpeed:1.2,repeatPeriod:1500})),[mapped]);
  const selectedIncidents=selected?incidents.filter(i=>i.provider_id===selected.id):[];
  useEffect(()=>{
    const host=canvasHostRef.current;
    if(!host) return;
    const measure=()=>setCanvasWidth(Math.floor(host.getBoundingClientRect().width));
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(host);
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const controls=globeRef.current?.controls?.();
    if(controls){controls.autoRotate=true;controls.autoRotateSpeed=.32;controls.enableDamping=true;}
  },[]);
  useEffect(()=>{
    if(selected && globeRef.current) {
      const geo=GEO[selected.slug];
      if(geo) globeRef.current.pointOfView({lat:geo.lat,lng:geo.lng,altitude:1.65},900);
    }
  },[selected]);
  return <div className="global-map-grid">
    <section className="globe-panel">
      <div className="globe-topline"><small>GLOBAL PROVIDER FOOTPRINT · LIVE SOURCE STATUS</small><strong><i className="dot"/> {mapped.length} MAPPED SOURCES</strong></div>
      <div className="globe-canvas" ref={canvasHostRef}>
        {canvasWidth>0 && <Globe ref={globeRef} width={canvasWidth} height={500}
          waitForGlobeReady={false} animateIn={true}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          showAtmosphere atmosphereColor="#42b9ad" atmosphereAltitude={0.16}
          pointsData={mapped} pointLat="lat" pointLng="lng" pointColor="color"
          pointAltitude={0.012} pointRadius={0.28} pointResolution={12}
          pointLabel={(d:any)=>'<b>'+d.name+'</b><br/>'+d.city+'<br/>'+statusLabel(d.current_status)}
          onPointClick={(point:any)=>setSelected(providers.find(p=>p.id===point.id)||null)}
          ringsData={rings} ringLat="lat" ringLng="lng" ringColor={(d:any)=>d.color}
          ringMaxRadius="maxR" ringPropagationSpeed="propagationSpeed" ringRepeatPeriod="repeatPeriod"
          enablePointerInteraction={true} />}
      </div>
      <div className="globe-legend">
        <span><i className="legend-dot" style={{background:'#48d9a7'}}/>Operational</span>
        <span><i className="legend-dot" style={{background:'#f4c46b'}}/>Minor issues</span>
        <span><i className="legend-dot" style={{background:'#79baff'}}/>Maintenance</span>
        <span><i className="legend-dot" style={{background:'#ff6e78'}}/>Major / critical</span>
        <span><i className="legend-dot" style={{background:'#8b9aaa'}}/>Unknown</span>
      </div>
    </section>
    <aside className="map-side">
      <div><small className="map-kicker">NETWORK OBSERVABILITY</small><h3>Global footprint</h3></div>
      <div className="map-kpis">
        <div className="map-kpi"><strong>{mapped.length}</strong><span>PROVIDER LOCATIONS</span></div>
        <div className="map-kpi"><strong>{incidents.filter(i=>i.status!=='resolved').length}</strong><span>UNRESOLVED EVENTS</span></div>
      </div>
      {selected?<div className="map-selected">
        <small className="map-kicker">SELECTED PROVIDER</small><h4>{selected.name}</h4>
        <p><MapPin size={12} style={{display:'inline',verticalAlign:'middle'}}/> {GEO[selected.slug]?.city || 'Location unavailable'}</p>
        <p>Status: <b style={{color:statusColor(selected.current_status)}}>{statusLabel(selected.current_status)}</b></p>
        <p>Last checked: {fmt(selected.last_checked_at)}</p>
        <p>{selectedIncidents.length} imported incident records</p>
        <a href={selected.status_url} target="_blank" rel="noreferrer">Official status page <ExternalLink size={12}/></a>
      </div>:<div className="map-selected"><small className="map-kicker">INTERACTIVE GLOBE</small><h4>Select a marker</h4><p>Choose a provider marker to inspect its source-reported health and imported incidents.</p></div>}
      <div><small className="map-kicker">MONITORED PROVIDERS</small></div>
      <div className="map-provider-list">{mapped.map(p=><button className={'map-provider '+(selected?.id===p.id?'selected':'')} key={p.id} onClick={()=>setSelected(providers.find(x=>x.id===p.id)||null)}>
        <i className="legend-dot" style={{background:p.color}}/><span>{p.name}<small>{p.city} · {statusLabel(p.current_status)}</small></span>
      </button>)}</div>
      <div className="map-note">Markers show approximate provider headquarters / principal office cities, not data-centre locations or outage-affected regions. Incident locations are not plotted unless the source provides verified geographic impact data. Globe imagery is for geographic context; health signals come from provider APIs.</div>
    </aside>
  </div>;
}
