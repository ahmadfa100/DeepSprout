"""Read-only comparison of live SQL columns with EF Core ModelSnapshot column metadata."""
import collections
import json
import re
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
data=json.loads((HERE/'live-schema.json').read_text(encoding='utf-8'))
snapshot=(ROOT/'Server/src/DeepSprout.Infrastructure/Migrations/DeepSproutDbContextModelSnapshot.cs').read_text(encoding='utf-8')

def sql_type(c):
    t=c['TypeName']
    if t in ('nvarchar','nchar'):return f"{t}({'max' if c['MaxLength']==-1 else c['MaxLength']//2})"
    if t in ('varchar','char','varbinary','binary'):return f"{t}({'max' if c['MaxLength']==-1 else c['MaxLength']})"
    if t in ('decimal','numeric'):return f"{t}({c['PrecisionValue']},{c['ScaleValue']})"
    if t in ('datetime2','datetimeoffset','time'):return f"{t}({c['ScaleValue']})"
    return 'rowversion' if t=='timestamp' else t

live={(x['SchemaName']+'.'+x['TableName'],x['ColumnName']):x for x in data['columns'] if x['SchemaName']!='dbo'}
entities=list(re.finditer(r'modelBuilder\.Entity\("([^"]+)", b =>',snapshot))
props={}
entity_tables={}
for i,e in enumerate(entities):
    block=snapshot[e.start():entities[i+1].start() if i+1<len(entities) else len(snapshot)]
    tm=re.search(r'b\.ToTable\("([^"]+)", "([^"]+)"',block)
    if not tm:continue
    table=tm.group(2)+'.'+tm.group(1)
    entity_tables[e.group(1)]=table
    matches=list(re.finditer(r'b\.Property<([^>]+)>\("([^"]+)"\)',block))
    for j,m in enumerate(matches):
        part=block[m.end():matches[j+1].start() if j+1<len(matches) else block.find('b.HasKey',m.end()) if block.find('b.HasKey',m.end())!=-1 else len(block)]
        typ=re.search(r'\.HasColumnType\("([^"]+)"\)',part)
        default=re.search(r'\.HasDefaultValueSql\("([^"]+)"\)',part)
        nullable=m.group(1).endswith('?') or (m.group(1) in ('string','byte[]') and '.IsRequired()' not in part)
        props[(table,m.group(2))]={'type':typ.group(1) if typ else None,'nullable':nullable,'default':default.group(1) if default else None}

issues=[]
for key,v in props.items():
    if key not in live:continue
    actual=live[key]
    if v['type'] and v['type'].lower()!=sql_type(actual).lower():issues.append((key,'type',v['type'],sql_type(actual)))
    if v['nullable']!=bool(actual['IsNullable']):issues.append((key,'nullable',v['nullable'],actual['IsNullable']))
    # SQL Server wraps default definitions in parentheses; compare normalized literal text.
    norm=lambda s:re.sub(r'[\s()]','',s or '').lower()
    if norm(v['default'])!=norm(actual['DefaultDefinition']):issues.append((key,'default',v['default'],actual['DefaultDefinition']))

report={
    'snapshot_properties':len(props), 'live_product_columns':len(live),
    'snapshot_only_columns':[list(k) for k in sorted(set(props)-set(live))],
    'live_only_columns':[list(k) for k in sorted(set(live)-set(props))],
    'metadata_differences':[{'table':k[0],'column':k[1],'kind':kind,'snapshot':a,'live':b} for k,kind,a,b in issues],
}
snapshot_checks=set(re.findall(r'HasCheckConstraint\("([^"]+)"',snapshot))
live_checks={x['CheckName'] for x in data['checks'] if x['SchemaName']!='dbo'}
report['snapshot_check_names']=len(snapshot_checks)
report['live_check_names']=len(live_checks)
report['snapshot_only_checks']=sorted(snapshot_checks-live_checks)
report['live_only_checks']=sorted(live_checks-snapshot_checks)

snapshot_fks=[]
for i,e in enumerate(entities):
    source=entity_tables.get(e.group(1))
    if not source:continue
    block=snapshot[e.start():entities[i+1].start() if i+1<len(entities) else len(snapshot)]
    fk_starts=list(re.finditer(r'b\.HasOne\("([^"]+)"',block))
    for j,m in enumerate(fk_starts):
        chain=block[m.start():fk_starts[j+1].start() if j+1<len(fk_starts) else len(block)]
        fk=re.search(r'\.HasForeignKey\(([^)]*)\)',chain)
        if not fk:continue
        target=entity_tables.get(m.group(1))
        if not target:continue
        child=tuple(re.findall(r'"([^"]+)"',fk.group(1)))
        principal=re.search(r'\.HasPrincipalKey\(([^)]*)\)',chain)
        parent=tuple(re.findall(r'"([^"]+)"',principal.group(1))) if principal else ('Id',)
        snapshot_fks.append((source,target,child,parent))
live_fk_parts=collections.defaultdict(list)
for x in data['foreign_key_columns']:
    live_fk_parts[(x['FromSchema']+'.'+x['FromTable'],x['ForeignKeyName'])].append(x)
live_fks=[]
for (source,_),pairs in live_fk_parts.items():
    pairs.sort(key=lambda x:x['Ordinal'])
    live_fks.append((source,pairs[0]['ToSchema']+'.'+pairs[0]['ToTable'],tuple(x['FromColumn'] for x in pairs),tuple(x['ToColumn'] for x in pairs)))
snap_counter=collections.Counter(snapshot_fks)
live_counter=collections.Counter(live_fks)
report['snapshot_fks']=len(snapshot_fks)
report['live_fks']=len(live_fks)
report['snapshot_only_fks']=[list(x) for x in (snap_counter-live_counter).elements()]
report['live_only_fks']=[list(x) for x in (live_counter-snap_counter).elements()]

snapshot_indexes=[]
for i,e in enumerate(entities):
    block=snapshot[e.start():entities[i+1].start() if i+1<len(entities) else len(snapshot)]
    tm=re.search(r'b\.ToTable\("([^"]+)", "([^"]+)"',block)
    if not tm:continue
    table=tm.group(2)+'.'+tm.group(1)
    starts=list(re.finditer(r'b\.HasIndex\(([^)]*)\)',block))
    for j,m in enumerate(starts):
        chain=block[m.end():starts[j+1].start() if j+1<len(starts) else block.find('b.ToTable',m.end()) if block.find('b.ToTable',m.end())!=-1 else len(block)]
        columns=tuple(re.findall(r'"([^"]+)"',m.group(1)))
        snapshot_indexes.append((table,columns,'.IsUnique()' in chain,'.HasFilter(' in chain))
live_index_rows=collections.defaultdict(list)
for x in data['indexes']:
    if x['SchemaName']!='dbo':live_index_rows[(x['SchemaName']+'.'+x['TableName'],x['IndexName'])].append(x)
live_indexes=[]
for (table,_),rows in live_index_rows.items():
    if rows[0]['IsPrimaryKey'] or rows[0]['IsUniqueConstraint']:continue
    columns=tuple(x['ColumnName'] for x in sorted(rows,key=lambda x:x['KeyOrdinal']) if x['KeyOrdinal']>0)
    live_indexes.append((table,columns,bool(rows[0]['IsUnique']),bool(rows[0]['HasFilter'])))
si=collections.Counter(snapshot_indexes);li=collections.Counter(live_indexes)
report['snapshot_indexes']=len(snapshot_indexes)
report['live_nonconstraint_indexes']=len(live_indexes)
report['snapshot_only_indexes']=[list(x) for x in (si-li).elements()]
report['live_only_indexes']=[list(x) for x in (li-si).elements()]

snapshot_keys=[]
for i,e in enumerate(entities):
    block=snapshot[e.start():entities[i+1].start() if i+1<len(entities) else len(snapshot)]
    tm=re.search(r'b\.ToTable\("([^"]+)", "([^"]+)"',block)
    if not tm:continue
    table=tm.group(2)+'.'+tm.group(1)
    for kind,args in re.findall(r'b\.(HasKey|HasAlternateKey)\(([^)]*)\)',block):
        snapshot_keys.append((table,'PK' if kind=='HasKey' else 'UQ',tuple(re.findall(r'"([^"]+)"',args))))
live_key_rows=collections.defaultdict(list)
for x in data['key_columns']:
    if x['SchemaName']!='dbo':live_key_rows[(x['SchemaName']+'.'+x['TableName'],x['ConstraintName'],x['ConstraintType'])].append(x)
live_keys=[]
for (table,_,kind),rows in live_key_rows.items():
    live_keys.append((table,kind,tuple(x['ColumnName'] for x in sorted(rows,key=lambda x:x['KeyOrdinal']))))
sk=collections.Counter(snapshot_keys);lk=collections.Counter(live_keys)
report['snapshot_keys']=len(snapshot_keys)
report['live_keys']=len(live_keys)
report['snapshot_only_keys']=[list(x) for x in (sk-lk).elements()]
report['live_only_keys']=[list(x) for x in (lk-sk).elements()]
(HERE/'snapshot-column-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print({k:(len(v) if isinstance(v,list) else v) for k,v in report.items()})
for x in issues[:20]:print(x)
