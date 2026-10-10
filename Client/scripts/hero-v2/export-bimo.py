#!/usr/bin/env python3
"""Export approved native Bimo motion to a script-free, browser-compatible Rive rig.
Requires Rive CLI 1.5.1. Never uploads, signs or changes the approved experiment.
"""
from pathlib import Path
import argparse, json, shutil, subprocess, tempfile, xml.etree.ElementTree as ET


def run(*args):
    subprocess.run(['rive', *map(str, args)], check=True)


def read_capture(file):
    frames, current = [], {}
    for line in file.read_text().splitlines():
        row = json.loads(line)
        if row.get('kind') == 'header':
            continue
        current.update({value['path']: value['value'] for value in row['values']})
        frames.append((round(row['time'], 3), dict(current)))
    return frames


def export(source, output):
    output.mkdir(parents=True, exist_ok=True)
    run(source, '--verify')
    run('inspect', source, '--summary')
    with tempfile.TemporaryDirectory(prefix='bimo-native-motion-') as tmp:
        captures = {}
        for stage, name in enumerate(['awake', 'focus']):
            target = Path(tmp) / (name + '.jsonl')
            run(source, f'--data-dump={target}', f'--data=emotionStage={stage}',
                '--data=pointerLookEnabled=false', '--data=useExternalLook=true',
                '--data-dump-every=100ms', '--advance=16s', '--viewport=700x860')
            captures[name] = read_capture(target)
    inputs = {'lookX', 'lookY', 'emotionStage', 'overload', 'facing',
              'pointerLookEnabled', 'useExternalLook', 'debugStateText', 'debugInputText'}
    keys = [key for key, value in captures['awake'][0][1].items()
            if isinstance(value, (float, int)) and not isinstance(value, bool) and key not in inputs]
    tracks = {name: [[round(t - 2, 3), *[round(values[k], 6) for k in keys]]
                     for t, values in frames if 2 <= t <= 14]
              for name, frames in captures.items()}
    assert all(len(track) == 121 and track[0][0] == 0 for track in tracks.values())
    (output / 'motion-clips.json').write_text(json.dumps(
        {'keys': keys, 'sampleInterval': .1, 'duration': 12, 'tracks': tracks}, separators=(',', ':')))
    tree = ET.parse(source / 'scene.rml')
    root = tree.getroot()
    # Same geometry, bindings and state machine; runtime scripts have already generated these poses.
    for node in list(root):
        if node.tag == 'ScriptAsset':
            root.remove(node)
    artboard = root.find('Artboard')
    for node in list(artboard):
        if node.tag == 'LayoutComponent' and node.get('name') == 'Pointer area':
            artboard.remove(node)
    vm = root.find('ViewModel')
    props = {node.get('id'): node.get('name') for node in vm if node.tag.startswith('ViewModelProperty')}
    values = next(values for t, values in captures['awake'] if t == 2)
    for node in vm.find('ViewModelInstance'):
        name = props.get(node.get('viewModelPropertyId'))
        if name in values:
            value = values[name]
            node.set('propertyValue', str(value).lower() if isinstance(value, bool) else str(value))
    offline = output / 'bimo-offline-source'
    offline.mkdir(exist_ok=True)
    tree.write(offline / 'scene.rml', encoding='unicode')
    (offline / 'rive.yaml').write_text('name: bimo-v2-offline\n')
    run(offline, '--verify')
    run('inspect', offline, '--summary')
    run(offline, '--once')
    shutil.copy2(offline / 'build/bimo-v2-offline.riv', output / 'bimo.riv')
    print(f'Exported {len(keys)} channels × 2 clips; original geometry, no runtime scripts or watermark.')


if __name__ == '__main__':
    client = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=client / 'assets/hero-v2/bimo-source')
    parser.add_argument('--output', type=Path, default=client / 'assets/hero-v2')
    args = parser.parse_args()
    export(args.source, args.output)
