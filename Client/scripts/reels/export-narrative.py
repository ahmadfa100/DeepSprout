#!/usr/bin/env python3
"""Record the approved V2 controller, keeping its source and Rive geometry unchanged."""
import json, subprocess, tempfile, shutil
from pathlib import Path
client=Path(__file__).resolve().parents[2]
source=client/'assets/hero-v2/bimo-source'
keys=json.loads((client/'assets/hero-v2/motion-clips.json').read_text())['keys']
tracks={}
with tempfile.TemporaryDirectory(prefix='bimo-narrative-') as tmp:
    tmp=Path(tmp); native=tmp/'source';shutil.copytree(source,native)
    for stage in [2,3,4]:
        for direction,x in [('left',-.8),('center',0),('right',.8)]:
            target=tmp/f'{stage}-{direction}.jsonl'
            subprocess.run(['rive',str(native),f'--data-dump={target}',f'--data=emotionStage={stage}',f'--data=lookX={x}','--data=lookY=-0.45','--data=pointerLookEnabled=false','--data=useExternalLook=true','--data-dump-every=100ms','--advance=10s','--viewport=700x860'],check=True,stdout=subprocess.DEVNULL)
            current={}; rows=[]
            for line in target.read_text().splitlines():
                row=json.loads(line)
                if row.get('kind')=='header':continue
                current.update({v['path']:v['value'] for v in row['values']})
                t=round(row['time'],3)
                if 2<=t<=8:rows.append([round(t-2,3),*[round(current[k],6) for k in keys]])
            assert len(rows)==61
            tracks[f'{stage}-{direction}']=rows
out=client/'assets/reels/bimo-narrative.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'keys':keys,'sampleInterval':.1,'duration':6,'tracks':tracks},separators=(',',':')))
print(f'Exported {len(tracks)} approved clips to {out}')
