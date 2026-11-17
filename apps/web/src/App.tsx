import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import {
  Activity, AlertCircle, Bell, CheckCircle2, ChevronRight, CircleUserRound,
  Cloud, ExternalLink, Globe2, LayoutDashboard, LogOut, Plus, RefreshCw,
  Search, Settings, ShieldCheck, Trash2, X, Map
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

type Provider = { id: string; name: string; slug: string; category: string; status_url: string; enabled: boolean; current_status: string | null; last_checked_at: string | null };
type Incident = { id: string; title: string; status: string; impact: string; updated_at: string; source_url: string | null; provider_name: string; provider_id: string };
type Profile = { id: string; display_name: string | null; role: 'user' | 'admin' };
type Page = 'overview' | 'map' | 'incidents' | 'providers' | 'alerts' | 'admin' | 'account';
const GlobalMap = lazy(() => import('./components/GlobalMap'));

function time(value?: string | null) { return value ? new Date(value).toLocaleString() : 'Not yet'; }
function safeSlug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login'|'signup'|'reset'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [profileName, setProfileName] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [metrics, setMetrics] = useState({active_incidents:0,providers_monitored:0,last_ingestion_at:null as string|null});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [subscriptions, setSubscriptions] = useState<{id:string;provider_id:string|null;category:string|null}[]>([]);
  const [auditLogs, setAuditLogs] = useState<{id:string;action:string;entity_type:string;created_at:string;details:Record<string,unknown>}[]>([]);
  const [providerForm, setProviderForm] = useState({name:'',category:'Cloud',status_url:''});
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [showProviderForm, setShowProviderForm] = useState(false);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({data}) => { setSession(data.session); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!supabase || !session?.user) { setProfile(null); return; }
      const {data,error} = await supabase.from('profiles').select('id,display_name,role').eq('id',session.user.id).single();
      if (active) {
        setProfile(error ? null : data as Profile);
        if (!error) setProfileName(data.display_name || '');
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [session]);

  const loadData = async () => {
    setLoading(true); setLoadError('');
    try {
      const [a,b,c] = await Promise.all([
        fetch(API+'/api/v1/incidents'), fetch(API+'/api/v1/providers'), fetch(API+'/api/v1/metrics')
      ]);
      if (!a.ok || !b.ok || !c.ok) throw new Error('The live API is temporarily unavailable.');
      const [i,p,m] = await Promise.all([a.json(),b.json(),c.json()]);
      setIncidents(i.items || []); setProviders(p.items || []); setMetrics(m);
    } catch (e) { setLoadError(e instanceof Error ? e.message : 'Unable to load live data.'); }
    finally { setLoading(false); }
  };

  const loadSubscriptions = async () => {
    if (!supabase || !session?.user) { setSubscriptions([]); return; }
    const {data} = await supabase.from('subscriptions').select('id,provider_id,category').eq('user_id',session.user.id);
    setSubscriptions(data || []);
  };

  const loadAuditLogs = async () => {
    if (!supabase || profile?.role !== 'admin') { setAuditLogs([]); return; }
    const {data} = await supabase.from('audit_logs').select('id,action,entity_type,created_at,details').order('created_at',{ascending:false}).limit(20);
    setAuditLogs(data || []);
  };

  useEffect(() => {
    if (!authReady) return;
    void loadData();
    const timer = window.setInterval(() => void loadData(), 60000);
    return () => window.clearInterval(timer);
  }, [authReady]);

  useEffect(() => { void loadSubscriptions(); }, [session]);
  useEffect(() => { void loadAuditLogs(); }, [profile]);

  const filtered = useMemo(() => incidents.filter(i => (i.title+' '+i.provider_name+' '+i.status).toLowerCase().includes(query.toLowerCase())),[incidents,query]);
  const subscribedProviderIds = new Set(subscriptions.map(s=>s.provider_id).filter((id): id is string => Boolean(id)));
  const watchedIncidents = incidents.filter(i=>subscribedProviderIds.has(i.provider_id));

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setAuthError(''); setAuthMessage('');
    try {
      if (authMode === 'signup') {
        const {error} = await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{name:authName},emailRedirectTo:window.location.origin}});
        if (error) throw error;
        setAuthMessage('Account request received. Check your email to confirm your address, then sign in.');
        setAuthMode('login');
      } else if (authMode === 'reset') {
        const {error} = await supabase.auth.resetPasswordForEmail(authEmail,{redirectTo:window.location.origin});
        if (error) throw error;
        setAuthMessage('If this address is registered, a password reset email has been sent.');
      } else {
        const {error} = await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});
        if (error) throw error;
      }
    } catch (e) { setAuthError(e instanceof Error ? e.message : 'Authentication failed.'); }
    finally { setBusy(false); }
  };

  const signOut = async () => { await supabase?.auth.signOut(); setPasswordRecovery(false); setPage('overview'); };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !session?.user) return;
    const {error} = await supabase.from('profiles').update({display_name:profileName.trim()}).eq('id',session.user.id);
    if (error) setAuthError(error.message);
    else { setProfile({id:session.user.id,display_name:profileName.trim(),role:profile?.role || 'user'}); setAuthMessage('Profile updated.'); }
  };

  const deleteOwnAccount = async () => {
    if (!supabase || !session) return;
    const confirmed = window.confirm('Permanently delete your GLOBALPULSE account and subscriptions? This cannot be undone.');
    if (!confirmed) return;
    setBusy(true);
    const {error} = await supabase.functions.invoke('delete-account',{method:'POST'});
    if (error) { setAuthError(error.message || 'Account deletion failed.'); setBusy(false); return; }
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setPage('overview'); setBusy(false);
  };

  const updateRecoveredPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || newPassword.length < 8) return;
    setBusy(true); setAuthError('');
    const {error} = await supabase.auth.updateUser({password:newPassword});
    if (error) setAuthError(error.message);
    else { setPasswordRecovery(false); setNewPassword(''); setAuthMessage('Password updated successfully.'); }
    setBusy(false);
  };
  const subscribe = async (providerId: string) => {
    if (!supabase || !session?.user) { setAuthMessage('Sign in to manage alerts.'); return; }
    const exists = subscriptions.find(s => s.provider_id === providerId);
    if (exists) {
      await supabase.from('subscriptions').delete().eq('id',exists.id);
    } else {
      await supabase.from('subscriptions').insert({user_id:session.user.id,provider_id:providerId});
    }
    await loadSubscriptions();
  };

  const addProvider = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase || !session?.user || profile?.role !== 'admin') return;
    setFormError(''); setFormMessage('');
    const parsed = (() => { try { return new URL(providerForm.status_url); } catch { return null; } })();
    if (!parsed || parsed.protocol !== 'https:' || !parsed.hostname.includes('.') || parsed.username || parsed.password || parsed.port) {
      setFormError('Enter a valid public HTTPS status page URL without credentials or a custom port.'); return;
    }
    const approvedHosts = ['www.cloudflarestatus.com','www.githubstatus.com','status.atlassian.com','status.digitalocean.com','status.twilio.com','status.openai.com','discordstatus.com','www.zoomstatus.com','status.mongodb.com','status.supabase.com','www.netlifystatus.com','www.akamaistatus.com','status.npmjs.org','status.newrelic.com'];
    if (!approvedHosts.includes(parsed.hostname) || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      setFormError('Use an approved official status source host. New integrations require source verification and an application update.'); return;
    }
    const slug = safeSlug(providerForm.name);
    if (!providerForm.name.trim() || !slug || !providerForm.category.trim()) { setFormError('Complete all required fields.'); return; }
    setBusy(true);
    const {data,error} = await supabase.from('providers').insert({
      name:providerForm.name.trim(),slug,category:providerForm.category.trim(),
      status_url:providerForm.status_url.trim().replace(/\/$/,''),enabled:false,integration_type:'statuspage'
    }).select('id').single();
    if (error) setFormError(error.message);
    else {
      await supabase.from('audit_logs').insert({actor_id:session.user.id,action:'provider.created',entity_type:'provider',entity_id:data.id,details:{name:providerForm.name.trim()}});
      setFormMessage('Provider saved disabled. Verify the official source before enabling it.');
      setProviderForm({name:'',category:'Cloud',status_url:''}); setShowProviderForm(false); await loadData();
    }
    setBusy(false);
  };

  const toggleProvider = async (provider: Provider) => {
    if (!supabase || !session?.user || profile?.role !== 'admin') return;
    const {error} = await supabase.from('providers').update({enabled:!provider.enabled}).eq('id',provider.id);
    if (error) setFormError(error.message);
    else {
      await supabase.from('audit_logs').insert({actor_id:session.user.id,action:provider.enabled?'provider.disabled':'provider.enabled',entity_type:'provider',entity_id:provider.id});
      await loadData();
    }
  };

  const deleteProvider = async (provider: Provider) => {
    if (!supabase || !session?.user || profile?.role !== 'admin') return;
    if (!window.confirm('Delete this provider and its imported incidents? This cannot be undone.')) return;
    const {error} = await supabase.from('providers').delete().eq('id',provider.id);
    if (error) setFormError(error.message);
    else { await supabase.from('audit_logs').insert({actor_id:session.user.id,action:'provider.deleted',entity_type:'provider',details:{name:provider.name}}); await loadData(); }
  };

  if (!authReady) return <div className="boot"><Activity/> Initializing GLOBALPULSE…</div>;
  if (!supabase) return <div className="auth-shell"><div className="auth-card"><Activity/><h1>GLOBALPULSE</h1><p>Authentication configuration is missing.</p><code>VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</code></div></div>;
  if (passwordRecovery && session) return <div className="auth-shell"><form className="auth-card" onSubmit={updateRecoveredPassword}>
    <div className="brand"><Activity/><span>GLOBALPULSE</span></div><small>ACCOUNT SECURITY</small>
    <h1>Choose a new password</h1><p>Use at least 8 characters. Your password is never visible to GLOBALPULSE administrators.</p>
    <label>New password<input required minLength={8} type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 8 characters"/></label>
    {authError && <div className="notice error">{authError}</div>}
    <button className="primary full" disabled={busy}>{busy?'Updating…':'Update password'} <ChevronRight size={16}/></button>
  </form></div>;
  if (!session) return <div className="auth-shell"><form className="auth-card" onSubmit={submitAuth}>
    <div className="brand"><Activity/><span>GLOBALPULSE</span></div><small>INFRASTRUCTURE INTELLIGENCE</small>
    <h1>{authMode==='signup'?'Create your account':authMode==='reset'?'Reset password':'Welcome back'}</h1>
    <p>Verified service incidents. Clear signals. No fabricated data.</p>
    {authMode==='signup' && <label>Full name<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Your name"/></label>}
    <label>Email address<input required type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com"/></label>
    {authMode!=='reset' && <label>Password<input required type="password" minLength={8} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters"/></label>}
    {authError && <div className="notice error">{authError}</div>}{authMessage && <div className="notice">{authMessage}</div>}
    <button className="primary full" disabled={busy}>{busy?'Please wait…':authMode==='signup'?'Create account':authMode==='reset'?'Send reset link':'Sign in'} <ChevronRight size={16}/></button>
    <div className="auth-links">
      {authMode==='login' && <><button type="button" className="link" onClick={()=>{setAuthMode('signup');setAuthError('');setAuthMessage('')}}>Create account</button><button type="button" className="link" onClick={()=>{setAuthMode('reset');setAuthError('');setAuthMessage('')}}>Forgot password?</button></>}
      {authMode!=='login' && <button type="button" className="link" onClick={()=>{setAuthMode('login');setAuthError('');setAuthMessage('')}}>Back to sign in</button>}
    </div>
    <footer>© {new Date().getFullYear()} GLOBALPULSE</footer>
  </form></div>;

  const nav = [
    {id:'overview' as Page,label:'Overview',icon:LayoutDashboard},
    {id:'map' as Page,label:'Global map',icon:Map},
    {id:'incidents' as Page,label:'Incidents',icon:AlertCircle},
    {id:'providers' as Page,label:'Providers',icon:Globe2},
    {id:'alerts' as Page,label:'My alerts',icon:Bell},
    ...(profile?.role==='admin'?[{id:'admin' as Page,label:'Administration',icon:Settings}]:[]),
    {id:'account' as Page,label:'Account',icon:CircleUserRound}
  ];
  const title = ({overview:'Infrastructure overview',map:'Global service map',incidents:'Incident intelligence',providers:'Provider directory',alerts:'Your subscriptions',admin:'Provider administration',account:'Account settings'} as Record<Page,string>)[page];

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><Activity/><b>GLOBALPULSE</b></div><p className="tag">INFRASTRUCTURE INTELLIGENCE</p>
      <nav>{nav.map(item=><button key={item.id} className={'nav '+(page===item.id?'active':'')} onClick={()=>setPage(item.id)}><item.icon size={17}/>{item.label}</button>)}</nav>
      <div className="sidefoot"><span className="dot"/> Authenticated session<br/><small>{profile?.role==='admin'?'ADMINISTRATOR':'STANDARD ACCOUNT'}</small></div>
    </aside>
    <main>
      <header><div><small>GLOBAL OPERATIONS / {page.toUpperCase()}</small><h1>{title}</h1></div><div className="header-actions"><span className="user-chip">{profile?.display_name || session.user.email}</span><button className="icon-button" onClick={()=>void loadData()} title="Refresh"><RefreshCw size={16}/></button><button className="icon-button" onClick={()=>void signOut()} title="Sign out"><LogOut size={16}/></button></div></header>
      {loadError && <div className="notice error"><AlertCircle size={16}/>{loadError}<button className="link" onClick={()=>void loadData()}>Retry</button></div>}
      {page==='overview' && <>
        <section className="hero"><div><small>GLOBAL SERVICE INTELLIGENCE</small><h2>Know when the<br/><em>internet shifts.</em></h2><p>Verified infrastructure incidents, sourced directly from provider status systems.</p><span className="live"><i/> LIVE MONITORING · SOURCE ATTRIBUTED</span></div><div className="orb"><Globe2 size={112}/></div></section>
        <section className="stats">
          <article><AlertCircle/><small>ACTIVE INCIDENTS</small><strong>{metrics.active_incidents}</strong><label>Provider reported</label></article>
          <article><Globe2/><small>MONITORED PROVIDERS</small><strong>{metrics.providers_monitored}</strong><label>Enabled sources</label></article>
          <article><CheckCircle2/><small>LAST INGESTION</small><strong>{metrics.last_ingestion_at?'Recorded':'—'}</strong><label>{time(metrics.last_ingestion_at)}</label></article>
        </section>
        <section className="columns"><article className="panel"><div className="panelhead"><div><small>LIVE EVENT STREAM</small><h3>Recent incidents</h3></div><span>{incidents.length} EVENTS</span></div><div className="search"><Search size={16}/><input placeholder="Search incidents or providers" value={query} onChange={e=>setQuery(e.target.value)}/></div><IncidentList items={filtered.slice(0,8)} loading={loading} total={incidents.length}/></article><ProviderPanel providers={providers.slice(0,8)} subscriptions={subscriptions} onSubscribe={subscribe}/></section>
      </>}
      {page==='map' && <Suspense fallback={<section className="panel"><div className="empty"><RefreshCw/><b>Loading interactive globe…</b></div></section>}><GlobalMap providers={providers.filter(p=>p.enabled)} incidents={incidents}/></Suspense>}
      {page==='incidents' && <section className="panel"><div className="panelhead"><div><small>PROVIDER-REPORTED EVENTS</small><h3>Incident history</h3></div><span>{filtered.length} RESULTS</span></div><div className="search"><Search size={16}/><input placeholder="Search title, provider or status" value={query} onChange={e=>setQuery(e.target.value)}/></div><IncidentList items={filtered} loading={loading} total={incidents.length}/></section>}
      {page==='providers' && <section className="panel"><div className="panelhead"><div><small>VERIFIED SOURCE DIRECTORY</small><h3>Monitored providers</h3></div><span>{providers.length} SOURCES</span></div><ProviderPanel providers={providers} subscriptions={subscriptions} onSubscribe={subscribe}/></section>}
      {page==='alerts' && <section className="panel"><div className="panelhead"><div><small>PERSONAL WATCHLIST</small><h3>Provider subscriptions</h3></div><span>{subscriptions.length} SUBSCRIBED</span></div><p className="panel-intro">Choose providers to keep in your watchlist. This version stores your preferences; email and push delivery will be activated when notification credentials and delivery policies are configured.</p>{providers.filter(p=>subscriptions.some(s=>s.provider_id===p.id)).length===0?<div className="empty"><Bell/><b>No provider subscriptions yet</b><p>Open the provider directory and subscribe to sources you want to follow.</p></div>:providers.filter(p=>subscriptions.some(s=>s.provider_id===p.id)).map(p=><div className="provider-row" key={p.id}><Globe2/><div><b>{p.name}</b><small>{p.category}</small></div><button className="secondary" onClick={()=>void subscribe(p.id)}>Unsubscribe</button></div>)}</section>}
      {page==='admin' && <section className="panel"><div className="panelhead"><div><small>CONTROL PLANE</small><h3>Provider registry</h3></div><button className="primary" onClick={()=>{setShowProviderForm(v=>!v);setFormError('');setFormMessage('')}}>{showProviderForm?<X size={16}/>:<Plus size={16}/>} {showProviderForm?'Close':'Add provider'}</button></div>
        <div className="panel-intro">Only add official provider-owned Statuspage-compatible status URLs. New providers are disabled until reviewed. Enabling a source permits automated polling.</div>
        {formError && <div className="notice error">{formError}</div>}{formMessage && <div className="notice">{formMessage}</div>}
        {showProviderForm && <form className="provider-form" onSubmit={addProvider}><label>Provider name<input required value={providerForm.name} onChange={e=>setProviderForm({...providerForm,name:e.target.value})} placeholder="Provider name"/></label><label>Category<select value={providerForm.category} onChange={e=>setProviderForm({...providerForm,category:e.target.value})}>{['Cloud','SaaS','Telecom','DNS','CDN','Internet infrastructure','Payments','Developer tools','Other'].map(v=><option key={v}>{v}</option>)}</select></label><label className="wide">Official status page URL<input required type="url" value={providerForm.status_url} onChange={e=>setProviderForm({...providerForm,status_url:e.target.value})} placeholder="https://status.example.com"/></label><div className="wide form-hint">Connector: Statuspage API v2 summary.json · HTTPS only · No credentials or custom ports</div><button className="primary" disabled={busy}>Save disabled provider</button></form>}
        {providers.length===0?<div className="empty"><Globe2/><b>Provider registry is empty</b><p>Add a real provider source to begin monitoring.</p></div>:providers.map(p=><div className="provider-row" key={p.id}><Globe2/><div><b>{p.name}</b><small>{p.category} · {p.status_url}</small></div><span className={'pill '+(p.enabled?'good':'muted')}>{p.enabled?'Enabled':'Disabled'}</span><button className="secondary" onClick={()=>void toggleProvider(p)}>{p.enabled?'Disable':'Enable'}</button><button className="danger-icon" onClick={()=>void deleteProvider(p)} title="Delete provider"><Trash2 size={15}/></button></div>)}
        <div className="integrity"><ShieldCheck/><p><b>Admin access is protected by database RLS.</b><br/>Your account must be explicitly promoted to admin by the project owner. User accounts cannot promote themselves.</p></div>
        <div className="panelhead"><div><small>GOVERNANCE</small><h3>Recent administrator actions</h3></div><span>{auditLogs.length} RECORDS</span></div>
        {auditLogs.length===0?<div className="empty"><ShieldCheck/><b>No admin actions recorded</b><p>Changes made through this console will appear here.</p></div>:auditLogs.map(log=><div className="audit-row" key={log.id}><div><b>{log.action}</b><small>{log.entity_type} · {time(log.created_at)}</small></div><code>{JSON.stringify(log.details || {})}</code></div>)}
      </section>}
      {page==='account' && <section className="panel account-panel"><div className="panelhead"><div><small>IDENTITY & ACCESS</small><h3>Account profile</h3></div></div><div className="account-detail"><CircleUserRound/><div><b>{profile?.display_name || 'GLOBALPULSE user'}</b><small>{session.user.email}</small><small>Role: {profile?.role || 'user'}</small></div></div><form className="profile-form" onSubmit={saveProfile}><label>Display name<input value={profileName} onChange={e=>setProfileName(e.target.value)} maxLength={80} placeholder="Your display name"/></label><button className="secondary">Save profile</button></form>{authMessage && <div className="notice">{authMessage}</div>}{authError && <div className="notice error">{authError}</div>}<div className="panel-intro">Your account is managed by Supabase Auth. Password reset is available from the sign-in screen. Account deletion removes your authentication profile and subscriptions.</div><div className="account-actions"><button className="secondary" onClick={()=>void signOut()}><LogOut size={15}/> Sign out</button><button className="danger" disabled={busy} onClick={()=>void deleteOwnAccount()}><Trash2 size={15}/> Delete account</button></div></section>}
      <footer>© {new Date().getFullYear()} GLOBALPULSE · SOURCE-ATTRIBUTED INFRASTRUCTURE INTELLIGENCE</footer>
    </main>
  </div>;
}

function IncidentList({items,loading,total}:{items:Incident[];loading:boolean;total:number}) {
  if (loading && total===0) return <div className="empty"><RefreshCw/><b>Connecting to live sources…</b></div>;
  if (!items.length) return <div className="empty"><CheckCircle2/><b>{total?'No matching incidents':'No incidents recorded'}</b><p>{total?'Try a different search.':'No source data has been ingested yet. This is a real empty state, not sample data.'}</p></div>;
  return <>{items.map(i=><div className="incident" key={i.id}><AlertCircle/><div><b>{i.title}</b><small>{i.provider_name} · {time(i.updated_at)}</small><p>{i.impact || 'Impact not supplied by provider'}</p></div><span className={'status '+i.status}>{i.status}</span>{i.source_url&&<a href={i.source_url} target="_blank" rel="noreferrer" aria-label="Open source"><ExternalLink size={15}/></a>}</div>)}</>;
}

function ProviderPanel({providers,subscriptions,onSubscribe}:{providers:Provider[];subscriptions:{id:string;provider_id:string|null}[];onSubscribe:(id:string)=>void}) {
  if (!providers.length) return <article className="panel"><div className="panelhead"><div><small>SOURCE DIRECTORY</small><h3>Provider coverage</h3></div><span>0 SOURCES</span></div><div className="empty"><Globe2/><b>No providers configured</b><p>Only official, verified sources will appear here.</p></div><div className="integrity"><ShieldCheck/><p><b>Source-first data integrity</b><br/>No fabricated incidents, providers, or uptime metrics.</p></div></article>;
  return <article className="panel"><div className="panelhead"><div><small>SOURCE DIRECTORY</small><h3>Provider coverage</h3></div><span>{providers.length} SOURCES</span></div>{providers.map(p=><div className="provider-row" key={p.id}><Globe2/><div><b>{p.name}</b><small>{p.category} · {p.current_status || 'Unknown'} · Checked {time(p.last_checked_at)}</small></div><button className="watch" onClick={()=>onSubscribe(p.id)}>{subscriptions.some(s=>s.provider_id===p.id)?'Following':'Follow'}</button></div>)}<div className="integrity"><ShieldCheck/><p><b>Source-first data integrity</b><br/>Every event is attributed to its provider source.</p></div></article>;
}
