import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { Activity, AlertTriangle, CheckCircle2, CircleHelp, ExternalLink, LocateFixed, MapPin, Pause, Play, Search, X } from 'lucide-react';

type Provider = { id:string; name:string; slug:string; category:string; status_url:string; enabled:boolean; current_status:string|null; last_checked_at:string|null };
type Incident = { id:string; title:string; status:string; impact:string; updated_at:string; source_url:string|null; provider_name:string; provider_id:string };
type Geo = { lat:number; lng:number; city:string };

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
const statusColor=(s:string|null)=>s==='none'?'#35c99a':s==='minor'?'#e9ad4d':s==='maintenance'?'#65a9ef':s==='major'||s==='critical'?'#ed6b75':'#8493a5';
const statusLabel=(s:string|null)=>s==='none'?'Operational':s==='minor'?'Minor issues':s==='maintenance'?'Maintenance':s==='major'?'Major issues':s==='critical'?'Critical':'Unknown';
const statusGroup=(s:string|null)=>s==='none'?'operational':s==='minor'||s==='major'||s==='critical'?'issues':s==='maintenance'?'maintenance':'unknown';
const fmt=(v:string|null)=>v?new Date(v).toLocaleString():'Not checked';

export default function GlobalMap({providers,incidents}:{providers:Provider[];incidents:Incident[]}) {
  const globeRef=useRef<any>(null);
  const hostRef=useRef<HTMLDivElement|null>(null);
  const [width,setWidth]=useState(0);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const [autoRotate,setAutoRotate]=useState(true);
  const mapped=useMemo(()=>providers.flatMap(p=>GEO[p.slug]?[{...p,...GEO[p.slug],color:statusColor(p.current_status)}]:[]),[providers]);
  const selected=mapped.find(p=>p.id===selectedId)||null;
  const visible=mapped.filter(p=>(filter==='all'||statusGroup(p.current_status)===filter)&&p.name.toLowerCase().includes(search.toLowerCase()));
  const activeIncidents=incidents.filter(i=>i.status!=='resolved');
  const counts={operational:mapped.filter(p=>p.current_status==='none').length,issues:mapped.filter(p=>['minor','major','critical'].includes(p.current_status||'')).length,maintenance:mapped.filter(p=>p.current_status==='maintenance').length,unknown:mapped.filter(p=>!p.current_status||p.current_status==='unknown').length};
  const rings=useMemo(()=>mapped.filter(p=>p.current_status&&p.current_status!=='none'&&p.current_status!=='unknown').map(p=>({...p,maxR:1.8,propagationSpeed:1,repeatPeriod:1700})),[mapped]);

  useEffect(()=>{
    const host=hostRef.current;if(!host)return;
    const measure=()=>setWidth(Math.floor(host.getBoundingClientRect().width));
    measure();const observer=new ResizeObserver(measure);observer.observe(host);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{const c=globeRef.current?.controls?.();if(c){c.autoRotate=autoRotate;c.autoRotateSpeed=.28;c.enableDamping=true;}},[autoRotate,width]);
  useEffect(()=>{if(selected){const g=GEO[selected.slug];globeRef.current?.pointOfView({lat:g.lat,lng:g.lng,altitude:1.65},850);}},[selectedId]);
  const focus=(p:typeof mapped[number])=>{setSelectedId(p.id);globeRef.current?.pointOfView({lat:p.lat,lng:p.lng,altitude:1.65},850);};
  const reset=()=>{setSelectedId(null);globeRef.current?.pointOfView({lat:18,lng:5,altitude:2.35},850);};

  return <div className="service-map">
    <div className="service-map-heading">
      <div><div className="service-eyebrow"><Activity size={14}/> SERVICE HEALTH OVERVIEW</div><h2>Global service map</h2><p>Explore the providers we monitor and inspect their latest reported status.</p></div>
      <div className="service-map-meta"><span className="source-live-dot"/> <span>Connected to provider status feeds</span><small>{mapped.length} sources monitored</small></div>
    </div>

    <div className="map-health-strip">
      <div className="health-summary"><span className="health-icon operational"><CheckCircle2 size={18}/></span><div><strong>{counts.operational}</strong><small>Operational</small></div></div>
      <div className="health-summary"><span className="health-icon issues"><AlertTriangle size={18}/></span><div><strong>{counts.issues}</strong><small>Reporting issues</small></div></div>
      <div className="health-summary"><span className="health-icon maintenance"><Activity size={18}/></span><div><strong>{counts.maintenance}</strong><small>Maintenance</small></div></div>
      <div className="health-summary"><span className="health-icon unknown"><CircleHelp size={18}/></span><div><strong>{counts.unknown}</strong><small>Unknown status</small></div></div>
      <div className="health-summary event-summary"><span className="health-icon events"><Activity size={18}/></span><div><strong>{activeIncidents.length}</strong><small>Unresolved events</small></div></div>
    </div>

    <div className="service-map-layout">
      <section className="map-visual-card">
        <div className="map-visual-toolbar"><div><strong>Provider locations</strong><span> · Status reported by each provider</span></div><div className="map-tools">
          <button type="button" onClick={()=>setAutoRotate(v=>!v)} title={autoRotate?'Pause globe rotation':'Resume globe rotation'}>{autoRotate?<Pause size={15}/>:<Play size={15}/>}<span>{autoRotate?'Pause':'Rotate'}</span></button>
          <button type="button" onClick={reset} title="Reset globe view"><LocateFixed size={15}/><span>Reset view</span></button>
        </div></div>
        <div className="map-globe-stage" ref={hostRef}>
          {width>0&&<Globe ref={globeRef} width={width} height={510} waitForGlobeReady={false} animateIn
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
            showAtmosphere atmosphereColor="#62b7c2" atmosphereAltitude={0.13}
            pointsData={mapped} pointLat="lat" pointLng="lng" pointColor="color"
            pointAltitude={0.018} pointRadius={0.34} pointResolution={14}
            pointLabel={(d:any)=>'<b>'+d.name+'</b><br/>'+d.city+'<br/>'+statusLabel(d.current_status)}
            onPointClick={(d:any)=>focus(d)} ringsData={rings} ringLat="lat" ringLng="lng"
            ringColor={(d:any)=>d.color} ringMaxRadius="maxR" ringPropagationSpeed="propagationSpeed" ringRepeatPeriod="repeatPeriod"
            enablePointerInteraction/>}
          <div className="map-stage-caption"><span className="source-live-dot"/> Live provider-reported status</div>
        </div>
        <div className="map-legend"><span><i style={{background:'#35c99a'}}/>Operational</span><span><i style={{background:'#e9ad4d'}}/>Issues</span><span><i style={{background:'#65a9ef'}}/>Maintenance</span><span><i style={{background:'#8493a5'}}/>Unknown</span></div>
      </section>

      <aside className="map-directory-card">
        {selected?<div className="provider-detail">
          <div className="detail-top"><button type="button" className="detail-back" onClick={()=>setSelectedId(null)}>← All providers</button><button type="button" className="detail-close" onClick={()=>setSelectedId(null)} aria-label="Close details"><X size={17}/></button></div>
          <div className="detail-provider-icon"><Activity size={22}/></div>
          <h3>{selected.name}</h3><p className="detail-category">{selected.category}</p>
          <div className="detail-status-row"><span className="detail-status-dot" style={{background:statusColor(selected.current_status)}}/><strong>{statusLabel(selected.current_status)}</strong></div>
          <div className="detail-facts"><div><small>Provider location</small><b><MapPin size={13}/> {selected.city}</b></div><div><small>Last checked</small><b>{fmt(selected.last_checked_at)}</b></div><div><small>Imported incidents</small><b>{incidents.filter(i=>i.provider_id===selected.id).length}</b></div></div>
          <div className="detail-incidents"><h4>Recent provider events</h4>{incidents.filter(i=>i.provider_id===selected.id).slice(0,4).length?incidents.filter(i=>i.provider_id===selected.id).slice(0,4).map(i=><div className="detail-incident" key={i.id}><span className={'event-status '+i.status}/><div><b>{i.title}</b><small>{fmt(i.updated_at)} · {i.status}</small></div>{i.source_url&&<a href={i.source_url} target="_blank" rel="noreferrer" aria-label="Open incident source"><ExternalLink size={14}/></a>}</div>):<p className="detail-empty">No incident records are currently associated with this provider.</p>}</div>
          <a className="official-source-link" href={selected.status_url} target="_blank" rel="noreferrer">Open official status page <ExternalLink size={14}/></a>
        </div>:<>
          <div className="directory-heading"><div><h3>Monitored providers</h3><p>Select a provider to view its status details.</p></div><span>{visible.length} / {mapped.length}</span></div>
          <label className="map-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search providers…"/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label="Clear search"><X size={14}/></button>}</label>
          <div className="map-filter-tabs">{[{id:'all',label:'All'},{id:'issues',label:'Issues'},{id:'maintenance',label:'Maintenance'},{id:'unknown',label:'Unknown'}].map(t=><button type="button" key={t.id} className={filter===t.id?'active':''} onClick={()=>setFilter(t.id)}>{t.label}</button>)}</div>
          <div className="map-directory-list">{visible.map(p=><button type="button" className="map-directory-item" key={p.id} onClick={()=>focus(p)}>
            <span className="directory-provider-mark" style={{color:p.color,background:p.color+'18'}}>{p.name.slice(0,1).toUpperCase()}</span>
            <span className="directory-provider-copy"><b>{p.name}</b><small>{p.city}</small></span>
            <span className="directory-provider-status"><i style={{background:p.color}}/>{statusLabel(p.current_status)}</span>
          </button>)}{visible.length===0&&<div className="directory-no-results">No providers match your search.</div>}</div>
          <div className="directory-footnote">Status information is supplied by each provider. Locations are approximate office locations, not outage locations.</div>
        </>}
      </aside>
    </div>
    <div className="map-data-disclaimer"><CircleHelp size={15}/><span><b>How to read this map:</b> Pins represent approximate provider headquarters or principal office cities. They do not represent data centres or affected outage regions. We only plot verified provider status and incident information; no geographic outage impact is inferred.</span></div>
  </div>;
}
