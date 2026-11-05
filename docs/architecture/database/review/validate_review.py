"""Validate generated review artifacts without connecting to or changing the database."""
import collections
import csv
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from pypdf import PdfReader

here=Path(__file__).resolve().parent
root=here.parents[3]
data=json.loads((here/'live-schema.json').read_text(encoding='utf-8'))
comparison=json.loads((here/'snapshot-column-comparison.json').read_text(encoding='utf-8'))
matrix=list(csv.DictReader((here/'table-decision-matrix.csv').open(encoding='utf-8-sig')))
html=(here/'DeepSprout-Database-Study-Guide-AR-EN.html').read_text(encoding='utf-8')
summary=list(csv.DictReader((root/'docs/architecture/database/phase-b/final-regression/summary.csv').open(encoding='utf-8-sig')))

assert len(data['tables'])==131
assert len([t for t in data['tables'] if t['SchemaName']!='dbo'])==129
assert len(matrix)==129 and len({x['CurrentTable'] for x in matrix})==129
assert html.count('<section class="table"')==131
assert collections.Counter(x['ReviewVerdict'] for x in matrix)=={'KEEP':71,'REJECT':33,'CONDITIONAL':15,'DEFER-POLICY':9,'SAFE':1}
assert collections.Counter(x['RecommendedAction'] for x in matrix)=={'KEEP':119,'DEFER':9,'MERGE':1}
assert len(comparison['live_only_keys'])==45 and len(comparison['live_only_fks'])==4
assert not any(comparison[k] for k in ('snapshot_only_columns','live_only_columns','metadata_differences','snapshot_only_checks','live_only_checks','snapshot_only_indexes','live_only_indexes','snapshot_only_keys','snapshot_only_fks'))
assert (here/'diagrams/all-tables.mmd').read_text(encoding='utf-8').count('||--o{')==261
assert len(list((here/'diagrams').glob('*.mmd')))==20
svgs=list((here/'diagrams').glob('*.svg'))
assert len(svgs)==20
for svg in svgs:ET.parse(svg)
assert len(summary)==17 and sum(int(x['Pass']) for x in summary)==330 and sum(int(x['Fail']) for x in summary)==0
pdf=PdfReader(str(here/'DeepSprout-Database-Study-Guide-AR-EN.pdf'))
assert len(pdf.pages)>100
sample=' '.join((pdf.pages[i].extract_text() or '') for i in (0,1,len(pdf.pages)//2,len(pdf.pages)-1))
assert 'DeepSprout' in sample and 'dbo.sysdiagrams' in sample
print(f"PASS: 131 physical tables, 129 matrix rows, 261 ERD paths, 20 SVG diagrams, {len(pdf.pages)} PDF pages, archived regression 330/0 across 17 suites")
