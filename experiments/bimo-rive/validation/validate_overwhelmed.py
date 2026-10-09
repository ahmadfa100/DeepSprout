"""Prepare an isolated host-input replay; check real CLI per-frame telemetry.

No production handler or input is replaced. The fixture only writes the same
public lookX/lookY values a host would supply, on a fixed timeline.
"""
import argparse
import json
import math
import shutil
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
BUILD = PROJECT / 'build'
FIXTURE = BUILD / 'overwhelmed-validation'
DRIVER = '''
    -- Validation-only deterministic external host target timeline.
    if self.useExternalLook ~= nil and self.useExternalLook.value then
        local targetX, targetY = -0.45, -0.25
        if self.time >= 2 and self.time < 13 then
            targetX, targetY = 0.80, -0.55
        elseif self.time >= 13 and self.time < 14.2 then
            local step = math.floor((self.time - 13) / 0.15) % 4
            if step == 0 then targetX, targetY = -1, 0
            elseif step == 1 then targetX, targetY = 1, 0
            elseif step == 2 then targetX, targetY = 0, -1
            else targetX, targetY = 0, 1 end
        elseif self.time >= 14.2 then
            targetX, targetY = 0, 0
        end
        if self.lookX ~= nil then self.lookX.value = targetX end
        if self.lookY ~= nil then self.lookY.value = targetY end
    end
'''


def prepare():
    FIXTURE.mkdir(parents=True, exist_ok=True)
    for name in ['scene.rml', 'rive.yaml', 'JetBrainsMono.ttf']:
        shutil.copyfile(PROJECT / name, FIXTURE / name)
    controller = (PROJECT / 'bimo_controller.luau').read_text()
    marker = 'function advance(self: Rig, seconds: number): boolean\n    self.time += seconds\n'
    assert controller.count(marker) == 1
    (FIXTURE / 'bimo_controller.luau').write_text(controller.replace(marker, marker + DRIVER))
    print(FIXTURE)


def frames(path):
    current = {}
    result = []
    for line in path.read_text().splitlines():
        record = json.loads(line)
        if 'frame' not in record:
            continue
        for entry in record.get('values', []):
            current[entry['path']] = entry['value']
        result.append((record['frame'], record['time'], current.copy()))
    return result


def check(first, second):
    trace = frames(first)
    assert trace == frames(second), 'Identical input replay produced different telemetry'
    max_anchor_error = 0
    max_ankle_travel = 0
    min_knee_width = 999
    seen_stages = set()
    held_frames = 0
    for frame, time, vm in trace:
        for name, value in vm.items():
            if isinstance(value, (int, float)):
                assert math.isfinite(value), (frame, name, value)
        seen_stages.add(vm['emotionStage'])
        if frame == 0:
            continue
        assert vm['pointerLookEnabled'] is False, ('Pointer lock', frame)
        assert vm['useExternalLook'] is True
        if vm['emotionStage'] == 3 and 2.9 <= time <= 12.9:
            held_frames += 1
            assert abs(vm['lookX'] - .8) < .00001 and abs(vm['lookY'] + .55) < .00001
        a = vm['pelvisRotation']
        c, s = math.cos(a), math.sin(a)
        knees = []
        for side, prefix in [(-1, 'left'), (1, 'right')]:
            hip_x = vm['bodyRootX'] + vm['pelvisX'] + c * side * 56 + s * 4
            hip_y = vm['bodyRootY'] + vm['pelvisY'] + s * side * 56 - c * 4
            thigh = a + vm[prefix + 'ThighRotation']
            knee_x = hip_x - math.sin(thigh) * 127
            knee_y = hip_y + math.cos(thigh) * 127
            knees.append(knee_x)
            shin = thigh + vm[prefix + 'KneeRotation']
            x, y = vm[prefix + 'AnkleX'], vm[prefix + 'AnkleY']
            foot_x = knee_x + math.cos(shin) * x - math.sin(shin) * y
            foot_y = knee_y + math.sin(shin) * x + math.cos(shin) * y
            max_anchor_error = max(max_anchor_error, math.hypot(foot_x - (350 + side * 63), foot_y - 798))
            max_ankle_travel = max(max_ankle_travel, abs(y - 85))
            assert abs(shin + vm[prefix + 'FootRotation']) < .00001
        min_knee_width = min(min_knee_width, knees[1] - knees[0])
    assert {2, 3} <= seen_stages
    assert held_frames >= 600, ('Missing ten-second hold', held_frames)
    assert max_anchor_error < .001, max_anchor_error
    assert min_knee_width >= 112, min_knee_width
    assert max_ankle_travel < 7, max_ankle_travel
    report = dict(frames=len(trace), deterministic=True, stages=sorted(seen_stages),
                  overwhelmed_hold_frames=held_frames, max_foot_anchor_error_px=max_anchor_error,
                  min_knee_separation_px=min_knee_width, max_ankle_joint_travel_px=max_ankle_travel)
    (BUILD / 'overwhelmed-validation-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--check', nargs=2, type=Path, metavar=('FIRST', 'SECOND'))
    args = parser.parse_args()
    if args.prepare:
        prepare()
    if args.check:
        check(*args.check)
