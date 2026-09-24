import pandas as pd, json, re, os, collections, statistics
D='/home/claude/data/cricos'
c=pd.read_csv(f'{D}/courses.csv',encoding='utf-8-sig',dtype=str)
cl=pd.read_csv(f'{D}/course_locations.csv',encoding='utf-8-sig',dtype=str)
inst=pd.read_csv(f'{D}/institutions.csv',encoding='utf-8-sig',dtype=str)
UNIS={ # code: (display name, short)
'00120C':('Australian National University','ANU'),'00212K':('University of Canberra','UC'),
'00026A':('The University of Sydney','USyd'),'00098G':('UNSW Sydney','UNSW'),'00099F':('University of Technology Sydney','UTS'),
'00002J':('Macquarie University','Macquarie'),'00917K':('Western Sydney University','WSU'),'00102E':('University of Wollongong','UOW'),
'00109J':('University of Newcastle','UON'),'00003G':('University of New England','UNE'),'00005F':('Charles Sturt University','CSU'),
'01241G':('Southern Cross University','SCU'),'00004G':('Australian Catholic University','ACU'),'01032F':('University of Notre Dame Australia','Notre Dame'),
'00116K':('The University of Melbourne','UniMelb'),'00008C':('Monash University','Monash'),'00122A':('RMIT University','RMIT'),
'00113B':('Deakin University','Deakin'),'00115M':('La Trobe University','La Trobe'),'00111D':('Swinburne University of Technology','Swinburne'),
'00124K':('Victoria University','VU'),'00103D':('Federation University Australia','FedUni'),
'00025B':('The University of Queensland','UQ'),'00213J':('Queensland University of Technology','QUT'),'00233E':('Griffith University','Griffith'),
'00117J':('James Cook University','JCU'),'00219C':('CQUniversity','CQU'),'00244B':('University of Southern Queensland','UniSQ'),
'01595D':('University of the Sunshine Coast','UniSC'),'00017B':('Bond University','Bond'),
'04249J':('Adelaide University','Adelaide Uni'),'00114A':('Flinders University','Flinders'),'03389E':('Torrens University Australia','Torrens'),
'00126G':('The University of Western Australia','UWA'),'00301J':('Curtin University','Curtin'),'00125J':('Murdoch University','Murdoch'),
'00279B':('Edith Cowan University','ECU'),'00586B':('University of Tasmania','UTAS'),'00300K':('Charles Darwin University','CDU'),
}
LEVELS={'Bachelor Degree':'UG','Bachelor Honours Degree':'UG','Associate Degree':'UG','Diploma':'DIP',
 'Masters Degree (Coursework)':'PG','Masters Degree (Extended)':'PG','Graduate Diploma':'PG','Graduate Certificate':'PG',
 'Masters Degree (Research)':'RES','Doctoral Degree':'RES'}
LEVEL_SHORT={'Bachelor Degree':'Bachelor','Bachelor Honours Degree':'Honours','Associate Degree':'Associate Degree','Diploma':'Diploma',
 'Masters Degree (Coursework)':'Masters','Masters Degree (Extended)':'Masters (Extended)','Graduate Diploma':'Grad Diploma','Graduate Certificate':'Grad Certificate',
 'Masters Degree (Research)':'Masters (Research)','Doctoral Degree':'PhD / Doctorate'}
def money(s):
  try: return float(str(s).replace('$','').replace(',',''))
  except: return None
c=c[(c['Expired']=='No')&(c['CRICOS Provider Code'].isin(UNIS))&(c['Course Level'].isin(LEVELS))].copy()
c=c[~c['Course Name'].str.contains(r'\b(?:Study Abroad|Exchange|Non.?award|Foundation)\b',case=False,regex=True)]
cl=cl[cl['CRICOS Course Code'].isin(c['CRICOS Course Code'])]
cities=cl.groupby('CRICOS Course Code').apply(lambda g: sorted(set((str(x).title(),y) for x,y in zip(g['Location City'],g['Location State']))),include_groups=False).to_dict()
# Map suburbs to metro cities by state + known suburbs
METRO={'NSW':'Sydney','VIC':'Melbourne','QLD':'Brisbane','WA':'Perth','SA':'Adelaide','ACT':'Canberra','TAS':'Hobart','NT':'Darwin'}
REGIONAL={ # suburb -> city label (non-metro)
'Wollongong':'Wollongong','Newcastle':'Newcastle','Callaghan':'Newcastle','Armidale':'Armidale','Wagga Wagga':'Wagga Wagga','Bathurst':'Bathurst','Albury':'Albury',
'Lismore':'Lismore','Coffs Harbour':'Coffs Harbour','Gold Coast':'Gold Coast','Southport':'Gold Coast','Robina':'Gold Coast','Bilinga':'Gold Coast','Coolangatta':'Gold Coast',
'Townsville':'Townsville','Douglas':'Townsville','Cairns':'Cairns','Smithfield':'Cairns','Rockhampton':'Rockhampton','Norman Gardens':'Rockhampton','Toowoomba':'Toowoomba',
'Sippy Downs':'Sunshine Coast','Maroochydore':'Sunshine Coast','Geelong':'Geelong','Waurn Ponds':'Geelong','Ballarat':'Ballarat','Mount Helen':'Ballarat','Bendigo':'Bendigo',
'Launceston':'Launceston','Newnham':'Launceston','Burnie':'Burnie','Hobart':'Hobart','Sandy Bay':'Hobart','Darwin':'Darwin','Casuarina':'Darwin','Bunbury':'Bunbury','Joondalup':'Perth',
'Orange':'Orange','Port Macquarie':'Port Macquarie','Mackay':'Mackay','Bundaberg':'Bundaberg','Gladstone':'Gladstone','Ipswich':'Brisbane','Springfield':'Brisbane','Warrnambool':'Warrnambool','Mildura':'Mildura','Churchill':'Gippsland','Shepparton':'Shepparton','Wodonga':'Albury-Wodonga','Whyalla':'Whyalla','Mount Gambier':'Mount Gambier','Alice Springs':'Alice Springs','Dubbo':'Dubbo','Tamworth':'Tamworth','Goulburn':'Goulburn'}
def city_label(sub,st):
  for k,v in REGIONAL.items():
    if sub.lower()==k.lower(): return v
  return METRO.get(st, sub)
FIELDS=collections.OrderedDict([
 ('it','IT & Computer Science'),('data-ai','Data Science & AI'),('business','Business & Management'),('accounting-finance','Accounting & Finance'),
 ('engineering','Engineering'),('nursing','Nursing'),('health','Health & Allied Health'),('medicine','Medicine, Dentistry & Pharmacy'),
 ('education','Teaching & Education'),('law','Law & Justice'),('psychology','Psychology'),('society','Arts, Humanities & Social Sciences'),
 ('creative','Creative Arts, Media & Design'),('architecture','Architecture & Construction'),('science','Science'),('environment','Agriculture & Environment'),
 ('hospitality','Hospitality & Tourism')])
def field_of(row):
  n=str(row['Course Name']).lower(); nf=str(row['Field of Education 1 Narrow Field'])[:4]; bf=str(row['Field of Education 1 Broad Field'])[:2]
  out=set()
  if re.search(r'data science|artificial intelligence|machine learning|data analytics|business analytics',n): out.add('data-ai')
  if bf=='02' and 'data-ai' not in out: out.add('it')
  if nf in('0801','0811') or re.search(r'accounting|finance|actuar',n): out.add('accounting-finance')
  if bf=='08' and nf not in('0801','0811'): out.add('business')
  if bf=='03': out.add('engineering')
  if nf=='0603': out.add('nursing')
  if nf in('0601','0605','0607','0609') or re.search(r'medicine|pharmacy|dental|dentistry',n): out.add('medicine')
  if bf=='06' and not out & {'nursing','medicine'}: out.add('health')
  if bf=='07': out.add('education')
  if nf in('0909','0911'): out.add('law')
  if nf=='0907' or 'psycholog' in n: out.add('psychology')
  if bf=='09' and not out & {'law','psychology'}: out.add('society')
  if bf=='10': out.add('creative')
  if bf=='04': out.add('architecture')
  if bf=='01' and 'data-ai' not in out: out.add('science')
  if bf=='05': out.add('environment')
  if bf=='11': out.add('hospitality')
  return sorted(out)
rows=[]
for _,r in c.iterrows():
  w=money(r['Duration (Weeks)']); fee=money(r['Tuition Fee']); tot=money(r['Estimated Total Course Cost'])
  if not w or not fee or w!=w or fee!=fee or w<8: continue
  years=max(w/52,0.25)
  annual=round(fee/max(years,1.0) if years>=1 else fee)  # courses <1yr: show total as annual
  locs=cities.get(r['CRICOS Course Code'],[])
  cl_=sorted(set(city_label(s,st) for s,st in locs))
  sts=sorted(set(st for s,st in locs))
  rows.append(dict(code=r['CRICOS Course Code'],uni=r['CRICOS Provider Code'],name=re.sub(r'\s+',' ',r['Course Name']).strip(),
    level=LEVEL_SHORT[r['Course Level']],tier=LEVELS[r['Course Level']],weeks=int(w),fee=round(fee),annual=annual,
    fields=field_of(r),cities=cl_,states=sts,work=r['Work Component']=='Yes'))
print('courses',len(rows))
# dedupe identical name+uni+level keeping lowest fee? keep all (different campuses/codes) but collapse exact dup name+uni+level+fee
seen={};ded=[]
for x in rows:
  k=(x['uni'],x['name'].lower(),x['level'],x['fee'])
  if k in seen:
    y=seen[k]; y['cities']=sorted(set(y['cities'])|set(x['cities'])); y['states']=sorted(set(y['states'])|set(x['states'])); continue
  seen[k]=x; ded.append(x)
rows=ded; print('deduped',len(rows))
out='/home/claude/build/unipath_data'; os.makedirs(out+'/courses',exist_ok=True)
# universities
inst=inst.set_index('CRICOS Provider Code')
unis=[]
for code,(name,short) in UNIS.items():
  cs=[x for x in rows if x['uni']==code]
  web=str(inst.loc[code,'Website']) if code in inst.index else ''
  if web and not web.startswith('http'): web='https://'+web
  def med(t):
    v=[x['annual'] for x in cs if x['tier']==t and x['weeks']>=52]
    return round(statistics.median(v)) if v else None
  cc=collections.Counter(ci for x in cs for ci in x['cities'])
  st=collections.Counter(s for x in cs for s in x['states'])
  slug=re.sub(r'[^a-z0-9]+','-',name.lower().replace('the ','')).strip('-')
  unis.append(dict(code=code,name=name,short=short,slug=slug,website=web,state=st.most_common(1)[0][0] if st else '',
    cities=[k for k,_ in cc.most_common(6)],n_courses=len(cs),n_ug=sum(x['tier']=='UG' for x in cs),n_pg=sum(x['tier']=='PG' for x in cs),
    median_ug=med('UG'),median_pg=med('PG'),
    fields=dict(collections.Counter(f for x in cs for f in x['fields']).most_common())))
json.dump(unis,open(out+'/universities.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(FIELDS,open(out+'/fields.json','w'))
U={u['code']:i for i,u in enumerate(unis)}
# course shards per field, compact arrays
for f in FIELDS:
  arr=[[x['code'],U[x['uni']],x['name'],x['level'],x['tier'],x['weeks'],x['fee'],x['annual'],x['cities'],1 if x['work'] else 0] for x in rows if f in x['fields']]
  json.dump(arr,open(f'{out}/courses/{f}.json','w'),ensure_ascii=False,separators=(',',':'))
  print(f,len(arr),os.path.getsize(f'{out}/courses/{f}.json')//1024,'KB')
json.dump(rows,open('/home/claude/build/unipath_all_courses.json','w'))
print('unassigned',sum(1 for x in rows if not x['fields']))
cities=collections.Counter(ci for x in rows for ci in x['cities']); print(cities.most_common(30))
for u in unis: print(u['short'],u['n_courses'],u['median_ug'],u['median_pg'],u['cities'][:3])
