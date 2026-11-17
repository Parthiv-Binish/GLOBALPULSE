import os
from datetime import datetime,timezone
import httpx
from fastapi import FastAPI,HTTPException,Query
from fastapi.middleware.cors import CORSMiddleware
URL=os.getenv('SUPABASE_URL','').rstrip('/');KEY=os.getenv('SUPABASE_SERVICE_ROLE_KEY','')
app=FastAPI(title='GlobalPulse API',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in os.getenv('CORS_ORIGINS','http://localhost:5173').split(',')],allow_methods=['GET'],allow_headers=['*'])
async def read(table,params):
 if not URL or not KEY:raise HTTPException(503,'Database is not configured')
 async with httpx.AsyncClient(timeout=15) as c:
  r=await c.get(URL+'/rest/v1/'+table,headers={'apikey':KEY,'Authorization':'Bearer '+KEY},params=params);r.raise_for_status();return r.json()
@app.get('/health')
async def health():return {'status':'ok','service':'globalpulse-api','timestamp':datetime.now(timezone.utc).isoformat(),'database_configured':bool(URL and KEY)}
@app.get('/api/v1/providers')
async def providers():
 try:return {'items':await read('providers',{'select':'id,name,category,status_url,enabled,last_checked_at,current_status','enabled':'eq.true','order':'name.asc'})}
 except HTTPException:raise
 except Exception:raise HTTPException(503,'Provider directory unavailable')
@app.get('/api/v1/incidents')
async def incidents(status:str|None=None,limit:int=Query(100,ge=1,le=200)):
 p={'select':'id,title,status,impact,created_at,updated_at,shortlink,provider_id,source_url,providers(name)','order':'updated_at.desc','limit':str(limit)}
 if status:p['status']='eq.'+status
 try:
  rows=await read('incidents',p)
  for x in rows:x['provider_name']=(x.pop('providers',None) or {}).get('name')
  return {'items':rows}
 except HTTPException:raise
 except Exception:raise HTTPException(503,'Incident feed unavailable')
@app.get('/api/v1/metrics')
async def metrics():
 try:
  a=await read('incidents',{'select':'id','status':'in.(investigating,identified,monitoring)'})
  b=await read('providers',{'select':'id','enabled':'eq.true'})
  c=await read('ingestion_runs',{'select':'completed_at','order':'completed_at.desc','limit':'1'})
  return {'active_incidents':len(a),'providers_monitored':len(b),'last_ingestion_at':c[0]['completed_at'] if c else None}
 except HTTPException:raise
 except Exception:raise HTTPException(503,'Metrics unavailable')