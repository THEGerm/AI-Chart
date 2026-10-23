"""Build data/rulebooks/car-6.json from the CAR 6 transcription.

base-1956.txt: CAR 6 as amended to December 20, 1956 (DRS CAR6.pdf), transcribed from the scan.
amendments.py: Amdt 6-1 to 6-7 as quoted edit operations, each checked to match exactly once.
Run: python3 fetch/car6/build_car6.py
"""
import json,hashlib,re,copy,sys
import pathlib
HERE=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from amendments import A
D=str(HERE)+'/'
lines=open(D+'base-1956.txt').read().split('\n')
secs={}; order=[]; sub=None; cur=None
for ln in lines:
    if ln.startswith('@SUB '): sub=ln[5:].strip(); continue
    if ln.startswith('@SEC '):
        num,head,pg=[x.strip() for x in ln[5:].split('|')]
        cur=dict(section=num,subpart=sub,heading=head,page=pg,lines=[]); secs[num]=cur; continue
    if cur is None or ln=='' : continue
    if ln.startswith('+'): cur['lines'][-1]+=' '+ln[1:]
    elif ln.startswith('&'): cur['lines'][-1]+=ln[1:]
    else: cur['lines'].append(ln)
state={k:dict(subpart=v['subpart'],heading=v['heading'],text='\n'.join(v['lines']),status='in_force') for k,v in secs.items()}
for k,v in secs.items(): assert v['lines'],k
def sha(t): return hashlib.sha256(t.encode('utf-8')).hexdigest()
out={}
def rec(k,amd,seq,eff,src):
    s=state[k]
    out.setdefault(k,dict(section=k,subpart=s['subpart'],heading=s['heading'],versions=[]))
    out[k]['heading']=s['heading']; out[k]['versions'].append(dict(amendment=amd,seq=seq,effective=eff,heading=s['heading'],status=s['status'],text=s['text'],sha256=sha(s['text']),source=src,guid=None,illegible=s['text'].count('[illegible]')+s['heading'].count('[illegible]')))
for k in secs: rec(k,'6-0',0,'1956-12-20','CAR6.pdf p.%s'%secs[k]['page'])
pages={'6-1':'pp.1-3','6-2':'pp.1-3','6-3':'pp.1-2','6-4':'pp.2-3','6-5':'pp.2-4','6-6':'p.1','6-7':'pp.4-6'}
changed={}
for n in range(1,8):
    a='6-%d'%n; info=A[a]; touched=[]
    for k,kind,args in info['ops']:
        if kind=='add':
            assert k not in state,(a,k)
            h,sp,t=args; state[k]=dict(subpart=sp,heading=h,text=t,status='in_force')
        elif kind=='copyfrom':
            src=state[args[0]]; state[k]=dict(subpart=src['subpart'],heading=src['heading'],text=src['text'],status='in_force')
        else:
            s=state[k]; t=s['text']
            if kind=='replace':
                o,nw=args; assert t.count(o)==1,(a,k,o[:60],t.count(o)); s['text']=t.replace(o,nw)
            elif kind in('cut','cutreplace'):
                st,en=args[0],args[1]; nw=args[2] if kind=='cutreplace' else ''
                i=t.index(st); assert t.count(st)==1,(a,k,st)
                j=len(t) if en is None else t.index(en,i)
                s['text']=(t[:i]+nw+t[j:]).rstrip('\n')
            elif kind=='settext': s['text']=args[0]
            elif kind=='append': s['text']=t+'\n'+args[0]
            elif kind=='prepend': s['text']=args[0]+t
            elif kind=='heading': s['heading']=args[0]
            elif kind=='revoke': s['status']='revoked'; s['text']='[Deleted]'
            elif kind=='copyfrom':
                assert k not in state or True
                src=state[args[0]]; state[k]=dict(subpart=src['subpart'],heading=src['heading'],text=src['text'],status='in_force')
            else: raise Exception(kind)
        if k not in touched: touched.append(k)
    changed[a]=touched
    for k in touched: rec(k,a,n*10,info['effective'],'%s %s'%(info['source'],pages[a]))
def key(k): return tuple(int(x) for x in k.split('.'))
# check no stray
for k,v in state.items(): assert '\n\n' not in v['text'],k
amends=[dict(id='6-0',seq=0,label='Dec 20, 1956 edition (6-0)',effective='1956-12-20',final_rule='Civil Air Regulations Part 6, revision of part incorporating all amendments in effect on December 20, 1956 (By the Civil Aeronautics Board, M. C. Mulligan, Secretary); GPO reprint "As amended to December 20, 1956", 1957')]
for n in range(1,8):
    a='6-%d'%n; amends.append(dict(id=a,seq=n*10,label=a,effective=A[a]['effective'],adopted=A[a]['adopted'],final_rule=A[a]['final_rule']))
doc={"rulebook":"CAR 6","authority":"CAB/FAA","id":"car-6",
 "title":"Civil Air Regulations Part 6, Rotorcraft Airworthiness; Normal Category (recodified December 20, 1956)",
 "source":"FAA DRS doctype CAR (CAR6.pdf, CAR_06_0Na.pdf), transcribed from scans","built":"2026-10-21","confidence":"reconstructed",
 "amendments":amends,"sections":{k:out[k] for k in sorted(out,key=key)}}
json.dump(doc,open(HERE.parent.parent/'data'/'rulebooks'/'car-6.json','w'),ensure_ascii=False,indent=1)
nv=sum(len(v['versions']) for v in out.values())
print('sections',len(out),'versions',nv)
for a,t in changed.items(): print(a,len(t),' '.join(t))
ill=[(k,v['amendment'],v['illegible'],v['source']) for k,s in out.items() for v in s['versions'] if v['illegible']]
print('illegible',ill)
