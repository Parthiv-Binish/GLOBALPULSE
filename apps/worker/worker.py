import asyncio,os
from datetime import datetime,timezone
from urllib.parse import urlparse
import httpx
URL=os.getenv('SUPABASE_URL','').rstrip('/');KEY=os.getenv('SUPABASE_SERVICE_ROLE_KEY','')
HEAD={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'}
async def db(c,method,table,params=None,payload=None):
 r=await c.request(method,URL+'/rest/v1/'+table,headers=HEAD,params=params or {},json=payload);r.raise_for_status();return r.json() if r.content else []
def normalize(doc):
 state=(doc.get('status') or {}).get('indicator','unknown');items=[]
 for x in doc.get('incidents',[]):
  raw=x.get('status','investigating');status=raw if raw in ('investigating','identified','monitoring','resolved') else ('resolved' if raw=='postmortem' else 'investigating')
  items.append({'source_event_id':x['id'],'title':x.get('name') or 'Provider incident','status':status,'impact':x.get('impact') or 'unknown','shortlink':x.get('shortlink'),'source_url':x.get('shortlink'),'created_at':x['created_at'],'updated_at':x['updated_at']})
 return state,items
async def cycle():
 if not URL or not KEY:raise RuntimeError('Set Supabase server credentials')
 async with httpx.AsyncClient(timeout=20,follow_redirects=True) as c:
  providers=await db(c,'GET','providers',{'select':'id,name,status_url','enabled':'eq.true','integration_type':'eq.statuspage'})
  errors=0
  for p in providers:
   try:
    u=urlparse(p['status_url'])
    if u.scheme!='https' or not u.hostname:raise ValueError('Only HTTPS provider sources are accepted')
    r=await c.get(p['status_url'].rstrip('/')+'/api/v2/summary.json');r.raise_for_status();state,items=normalize(r.json())
    await db(c,'PATCH','providers',{'id':'eq.'+p['id']},{'current_status':state,'last_checked_at':datetime.now(timezone.utc).isoformat()})
    for item in items:item['provider_id']=p['id'];await db(c,'POST','incidents',{'on_conflict':'provider_id,source_event_id'},item)
    print('provider poll complete',p['name'],'incidents',len(items),'status',state)
   except Exception as e:errors+=1;print('provider poll failed',p['id'],type(e).__name__,str(e))
  now=datetime.now(timezone.utc).isoformat();await db(c,'POST','ingestion_runs',{}, {'started_at':now,'completed_at':now,'providers_checked':len(providers),'status':'failed' if errors else 'completed','error_summary':str(errors)+' provider(s) failed' if errors else None})
if __name__=='__main__':asyncio.run(cycle())