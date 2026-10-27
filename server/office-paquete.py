"""Read Office cells and preserve native package parts when merging authored values."""
import sys,json,zipfile,posixpath,io,re,copy
from xml.dom import minidom as D
N='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
def children(e,name):return [x for x in e.childNodes if x.nodeType==x.ELEMENT_NODE and x.localName==name]
def allnodes(e,name):return e.getElementsByTagNameNS(N,name)
def text(e):return ''.join(x.data for x in e.childNodes if x.nodeType in (x.TEXT_NODE,x.CDATA_SECTION_NODE))
def colnum(a):
 n=0
 for x in re.match('[A-Z]+',a)[0]:n=n*26+ord(x)-64
 return n

def package(path):
 z=zipfile.ZipFile(path)
 if sum(i.file_size for i in z.infolist())>50000000:raise ValueError('El archivo supera el límite de lectura.')
 ss=[]
 if 'xl/sharedStrings.xml' in z.namelist():ss=[''.join(text(t) for t in allnodes(s,'t')) for s in allnodes(D.parseString(z.read('xl/sharedStrings.xml')),'si')]
 rel={r.getAttribute('Id'):r.getAttribute('Target') for r in D.parseString(z.read('xl/_rels/workbook.xml.rels')).getElementsByTagName('Relationship')}
 paths={}
 for s in allnodes(D.parseString(z.read('xl/workbook.xml')),'sheet'):
  t=rel[s.getAttribute('r:id')];paths[s.getAttribute('name')]=t.lstrip('/') if t.startswith('/') else posixpath.normpath('xl/'+t)
 return z,ss,paths

def cell(c,ss):
 v=children(c,'v');v=text(v[0]) if v else '';f=children(c,'f');typ=c.getAttribute('t')
 if typ=='s':value={'stringValue':ss[int(v)]}
 elif typ=='inlineStr':value={'stringValue':''.join(text(t) for t in allnodes(c,'t'))}
 elif typ=='b':value={'boolValue':v=='1'}
 elif v:
  try:value={'numberValue':float(v)}
  except ValueError:value={'stringValue':v}
 else:value={}
 return {'effectiveValue':value,'userEnteredValue':{'formulaValue':'='+text(f[0])} if f else value}

def matches(ref,r,c):
 for part in ref.split():
  ends=part.replace('$','').split(':');a=ends[0];b=ends[-1]
  if int(re.search(r'\d+',a)[0])<=r<=int(re.search(r'\d+',b)[0]) and colnum(a)<=c<=colnum(b):return True
 return False

def read(path):
 z,ss,paths=package(path);hojas=[]
 for nombre in ['Nuevo sistema','Finalizados']:
  if nombre not in paths:raise ValueError('Falta la hoja '+nombre)
  root=D.parseString(z.read(paths[nombre]));rows=[];rules=[]
  for rule in allnodes(root,'dataValidation'):
   f=children(rule,'formula1');f=text(f[0]) if f else ''
   if rule.getAttribute('type')=='list':rules.append((rule.getAttribute('sqref'),{'condition':{'type':'ONE_OF_LIST','values':[{'userEnteredValue':x} for x in f[1:-1].split(',')]}} if f.startswith('"') and f.endswith('"') else {'condition':{'type':'ONE_OF_RANGE'}}))
  for row in allnodes(root,'row'):
   idx=int(row.getAttribute('r'))-1
   if idx>10000:raise ValueError('La hoja supera 10000 filas.')
   while len(rows)<=idx:rows.append([])
   for c in children(row,'c'):
    col=colnum(c.getAttribute('r'))
    while len(rows[idx])<col:rows[idx].append({})
    rows[idx][col-1]=cell(c,ss)
  for idx,row in enumerate(rows):
   for c in range(max(len(row),12)):
    rule=next((data for ref,data in rules if matches(ref,idx+1,c+1)),None)
    if rule:
     while len(row)<=c:row.append({})
     row[c]['dataValidation']=rule
  hojas.append({'nombre':nombre,'sheetId':len(hojas),'rowCount':max(1000,len(rows)),'rows':rows})
 z.close();return {'titulo':'Concentrado de Incidentes.xlsm','hojas':hojas}

def merge(original,authored,updates,destino):
 z,ss,paths=package(original);a,ass,apaths=package(authored);modified={}
 for nombre,refs in updates.items():
  if not refs:continue
  dom=D.parseString(z.read(paths[nombre]));data=allnodes(dom,'sheetData')[0]
  src=D.parseString(a.read(apaths[nombre]));sources={c.getAttribute('r'):c for c in allnodes(src,'c')}
  rows={int(r.getAttribute('r')):r for r in children(data,'row')}
  for ref in refs:
   rn=int(re.search(r'\d+',ref)[0]);cn=colnum(ref);row=rows.get(rn)
   if row is None:
    row=dom.createElementNS(N,'row');row.setAttribute('r',str(rn));following=next((r for k,r in sorted(rows.items()) if k>rn),None);data.insertBefore(row,following);rows[rn]=row
   old=next((c for c in children(row,'c') if c.getAttribute('r')==ref),None)
   if old is None:
    old=dom.createElementNS(N,'c');old.setAttribute('r',ref)
    seed=next((c for c in children(rows.get(2,row),'c') if colnum(c.getAttribute('r'))==cn),None)
    if seed is not None and seed.hasAttribute('s'):old.setAttribute('s',seed.getAttribute('s'))
    row.insertBefore(old,next((c for c in children(row,'c') if colnum(c.getAttribute('r'))>cn),None))
   for x in list(old.childNodes):
    if x.nodeType==x.ELEMENT_NODE and x.localName in ('v','f','is'):old.removeChild(x)
   if old.hasAttribute('t'):old.removeAttribute('t')
   source=sources.get(ref)
   if source is not None:
    value=cell(source,ass)['userEnteredValue']
    if 'formulaValue' in value:raise ValueError('No se escribirán fórmulas generadas.')
    if 'stringValue' in value:
     old.setAttribute('t','inlineStr');isnode=dom.createElementNS(N,'is');t=dom.createElementNS(N,'t');t.setAttribute('xml:space','preserve');t.appendChild(dom.createTextNode(value['stringValue']));isnode.appendChild(t);old.appendChild(isnode)
    elif 'numberValue' in value or 'boolValue' in value:
     vnode=dom.createElementNS(N,'v');number=value.get('numberValue',int(value.get('boolValue',False)));vnode.appendChild(dom.createTextNode(str(number)));old.appendChild(vnode)
     if 'boolValue' in value:old.setAttribute('t','b')
  modified[paths[nombre]]=dom.toxml(encoding='utf-8')
 # Unchanged ZIP entries, including VBA, styles, relationships and validations, stay intact.
 with zipfile.ZipFile(destino,'w',compression=zipfile.ZIP_DEFLATED) as out:
  for entry in z.infolist():out.writestr(entry,modified.get(entry.filename,z.read(entry.filename)))
 z.close();a.close()
if __name__=='__main__':
 if sys.argv[1]=='read':
  with open(sys.argv[3],'w',encoding='utf8') as f:json.dump(read(sys.argv[2]),f,ensure_ascii=False)
 elif sys.argv[1]=='merge':merge(sys.argv[2],sys.argv[3],json.load(open(sys.argv[4],encoding='utf8')),sys.argv[5])
