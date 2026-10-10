"""Exercise the real CLI input path, deterministic replay and planted-foot math.

Run from any directory with Python 3 and rive 1.5.1 installed. All generated
telemetry and screenshots stay in this V2 project's ignored build directory.
"""
import hashlib
import json
import math
import subprocess
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
BUILD = PROJECT / 'build'
BUILD.mkdir(exist_ok=True)
NAMES = ['intro-focus', 'deep-focus', 'notice', 'concerned', 'overwhelmed']


def run(*args):
    completed = subprocess.run(['rive', str(PROJECT), *args], capture_output=True, text=True)
    if completed.returncode:
        raise RuntimeError(completed.stdout + completed.stderr)
    assert 'runtime error' not in (completed.stdout + completed.stderr).lower()


def frames(path):
    current, result = {}, []
    for line in path.read_text().splitlines():
        item = json.loads(line)
        if 'frame' not in item:
            continue
        for entry in item.get('values', []):
            current[entry['path']] = entry['value']
        result.append((item['frame'], item['time'], current.copy()))
    return result


def replay(path):
    args = [f'--data-dump={path}', '--data-dump-every=1', '--advance=600',
            '--pointer=move@690,100', '--advance=30', '--key=2', '--advance=600',
            '--pointer=move@10,800', '--advance=30', '--key=3', '--advance=600',
            '--key=h', '--advance=30', '--key=l', '--advance=30',
            '--key=k', '--advance=30', '--key=j', '--advance=30',
            '--key=4', '--advance=600', '--key=5', '--advance=600']
    for target in ['h', 'l', 'k', 'j', 'c', 'h', 'l']:
        args += [f'--key={target}', '--advance=8', '--pointer=move@10,20']
    for key in [4, 5, 3, 5, 4, 2, 5, 4, 5]:
        args += [f'--key={key}', '--advance=6']
    args += ['--key=m', '--advance=600', '--key=1', '--advance=120',
             '--pointer=move@650,800', '--advance=30']
    run(*args)


def check(trace):
    max_error, max_travel, min_knees = 0, 0, float('inf')
    holds = {s: 0 for s in range(5)}
    seen_lock = False
    for frame, _, vm in trace:
        for name, value in vm.items():
            if isinstance(value, (int, float)):
                assert math.isfinite(value), (frame, name, value)
        if frame == 0:
            continue
        stage = vm['emotionStage']
        holds[stage] += 1
        if stage > 0:
            seen_lock = True
        if seen_lock:
            assert vm['pointerLookEnabled'] is False, ('Lost pointer lock', frame)
        if stage == 1 and vm['closedEyeOpacity'] > .999:
            assert abs(vm['eyeX']) < .01 and abs(vm['eyeY']-25) < .01
        a = vm['pelvisRotation']
        c, s = math.cos(a), math.sin(a)
        knees = []
        for side, prefix in [(-1, 'left'), (1, 'right')]:
            hx, hy = vm[prefix+'HipX'], vm[prefix+'HipY']
            hip_x = vm['bodyRootX'] + vm['pelvisX'] + c*hx-s*hy
            hip_y = vm['bodyRootY'] + vm['pelvisY'] + s*hx+c*hy
            thigh = a + vm[prefix+'ThighRotation']
            knee_x, knee_y = hip_x-math.sin(thigh)*127, hip_y+math.cos(thigh)*127
            knees.append(knee_x)
            shin = thigh+vm[prefix+'KneeRotation']
            x, y = vm[prefix+'AnkleX'], vm[prefix+'AnkleY']
            foot_x = knee_x+math.cos(shin)*x-math.sin(shin)*y
            foot_y = knee_y+math.sin(shin)*x+math.cos(shin)*y
            max_error = max(max_error, math.hypot(foot_x-(350+side*63), foot_y-798))
            max_travel = max(max_travel, abs(y-85))
            assert abs(shin+vm[prefix+'FootRotation']) < .00001
            variants = [vm[prefix+'Hand'+name] for name in ['Relaxed','PalmUp','Open','Guarded','Tense']]
            assert abs(sum(variants)-1) < .00001
            assert all(0 <= value <= 1.00001 for value in variants)
        min_knees = min(min_knees, knees[1]-knees[0])
    assert max_error < .005, max_error
    assert min_knees > 100, min_knees
    assert max_travel < 12, max_travel
    assert all(count >= 600 for count in holds.values()), holds
    final = trace[-1][2]
    assert final['emotionStage'] == 0 and final['pointerLookEnabled'] is False
    assert final['useExternalLook'] is True and final['lookX'] == 1 and final['lookY'] == 0
    assert 'MOVE ' in final['debugInputText']
    return dict(sampled_frames=len(trace), state_frames=holds, permanent_pointer_lock=True,
                external_gaze_preserved=True, hand_weights_normalized=True,
                max_foot_anchor_error_px=max_error, max_ankle_travel_px=max_travel,
                min_knee_separation_px=min_knees)


def capture():
    for stage, name in enumerate(NAMES):
        run(f'--screenshot={BUILD/name}.png', f'--data=emotionStage={stage}', '--advance=120')
    for stage in [2, 3, 4]:
        name = NAMES[stage]
        run(f'--screenshot={BUILD/name}-left.png', f'--data=emotionStage={stage}',
            '--data=facing=-.85', '--advance=120')
        for x, y, target in [(-1,0,'left'),(1,0,'right'),(-1,-1,'above-left'),(1,1,'below-right')]:
            run(f'--screenshot={BUILD/name}-target-{target}.png',
                f'--data=emotionStage={stage}', '--data=useExternalLook=true',
                f'--data=lookX={x}', f'--data=lookY={y}', '--advance=120')
    # Actual keyboard transition captures, including the midpoints where hands blend.
    for frames_count in [12, 24, 42]:
        run(f'--screenshot={BUILD}/transition-{frames_count}.png', '--key=4', '--advance=120',
            '--key=5', f'--advance={frames_count}')


def main():
    first, second = BUILD/'replay-a.jsonl', BUILD/'replay-b.jsonl'
    replay(first); replay(second)
    a, b = frames(first), frames(second)
    assert a == b, 'Identical input replay produced different output'
    report = check(a)
    report['deterministic_replay'] = True
    # Separate real-dispatch checks: initial pointer works, explicit reset works.
    run(f'--data-dump={BUILD}/pointer-intro.json', '--pointer=move@690,100', '--advance=30')
    intro = {v['path']:v['value'] for v in json.loads((BUILD/'pointer-intro.json').read_text())['viewModel']['properties']}
    assert intro['lookX'] > .9 and intro['lookY'] < -.4 and intro['pointerLookEnabled'] is True
    run(f'--data-dump={BUILD}/reset.json', '--key=2', '--advance=60', '--key=r',
        '--pointer=move@690,100', '--advance=30')
    reset = {v['path']:v['value'] for v in json.loads((BUILD/'reset.json').read_text())['viewModel']['properties']}
    assert reset['emotionStage'] == 0 and reset['pointerLookEnabled'] is True and reset['lookX'] > .9
    report['intro_pointer_and_explicit_reset'] = True
    baseline = BUILD/'v1-source-hashes.json'
    if baseline.exists():
        for name, expected in json.loads(baseline.read_text()).items():
            actual = hashlib.sha256((PROJECT.parent/'bimo-rive'/name).read_bytes()).hexdigest()
            assert actual == expected, ('V1 modified', name)
        report['v1_source_hashes_unchanged'] = True
    capture()
    (BUILD/'validation-report.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
