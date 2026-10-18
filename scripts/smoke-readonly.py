#!/usr/bin/env python3
"""Read-only release smoke test. Never submits contacts, bookings or payments."""
import argparse
import json
import urllib.error
import urllib.request

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:39137')
args=parser.parse_args()
def call(path,body=None):
    request=urllib.request.Request(args.base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
    try:
        with urllib.request.urlopen(request,timeout=25) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as error:return error.code,json.load(error)
status,ready=call('/api/spain-legal/readyz')
assert status==200 and ready['version']=='0.3.0' and ready['content']['video_count']>=3,(status,ready)
cases=[
    ('spanish_articles','/api/spain-legal/search',{'query':'nacionalidad','language':'es','max_results':3},200),
    ('videos','/api/spain-legal/search',{'query':'digital nomad','type':'video'},200),
    ('video_fetch','/api/spain-legal/fetch',{'id':'youtube:s2D42HhAobQ'},200),
    ('bad_boolean','/api/spain-legal/visa-options',{'nationality':'USA','has_eu_family_link':'false'},400),
    ('excluded_article','/api/spain-legal/fetch',{'id':'wp:post:2191'},404),
    ('native_tools','/mcp/spain-legal',{'jsonrpc':'2.0','id':1,'method':'tools/list','params':{}},200),
]
for name,path,body,expected in cases:
    status,data=call(path,body);assert status==expected,(name,status,data)
    if name in ('spanish_articles','videos'):assert data['result']['resources'],name
    if name=='native_tools':assert {'search','fetch'}.issubset({tool['name'] for tool in data['result']['tools']})
    print(name,status,'PASS')
status,data=call('/api/spain-legal/tools');assert status==200 and data['ok'],(status,data)
print('tool_catalog',status,'PASS')
print('readiness',json.dumps(ready))
