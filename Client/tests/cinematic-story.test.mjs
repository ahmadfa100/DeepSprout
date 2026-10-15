import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {storyState,cardPose,CARD_LAYOUT,PHASES} from '../src/js/reels/cinematic-math.js';

// A fast fling, a reverse, and a revisited frame must produce identical state.
const sequence=[0,.13,.35,.54,.79,1,.79,.54,.35,.13,0,.35];
const seen=new Map();
for(const p of sequence){
 const value={story:storyState(p),cards:CARD_LAYOUT.map((_,i)=>cardPose(i,storyState(p).gravity))};
 if(seen.has(p))assert.deepEqual(value,seen.get(p),'scroll reversal is deterministic');
 seen.set(p,value);
}
assert.equal(storyState(0).world,1);
assert.equal(storyState(0).dark,0);
assert.equal(storyState(1).release,1);
assert.equal(storyState(1).message,0);
assert.equal(storyState(-1).progress,0);
assert.equal(storyState(2).progress,1);
assert.equal(PHASES.capture[1],PHASES.release[0]);
assert.equal(storyState(.5).message,1,'the emotional message has a readable hold');
for(const mobile of [false,true]){
 for(let i=0;i<(mobile?4:CARD_LAYOUT.length);i++){
  let previous=0;
  for(let j=0;j<=200;j++){
   const pose=cardPose(i,j/200,mobile);
   assert.ok(Object.values(pose).every(Number.isFinite),'finite at every boundary');
   assert.ok(pose.pull>=previous,'capture progresses without orbit resets');
   assert.ok(pose.opacity>=0&&pose.opacity<=1);
   assert.ok(pose.scale>0,'cards never invert');
   previous=pose.pull;
  }
  assert.equal(cardPose(i,0,mobile).opacity,0);
  assert.equal(cardPose(i,1,mobile).opacity,0,'all cards resolve before the release');
  assert.ok(cardPose(i,.3,mobile).opacity>0,'cards are visible during attraction');
 }
}
const client=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(client,'hero-reels-lab.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 const ref=match[1].split('?')[0];
 if(!/^(https?:|data:)/.test(ref))assert.ok(existsSync(resolve(client,ref)),`asset or route exists: ${ref}`);
}
assert.ok(!html.includes('id="focus-check"')&&!html.includes('id="replay"'));
assert.ok(html.includes('href="login.html"')&&html.includes('href="register.html"'));
assert.ok(html.includes('Illustrative session')&&html.includes('not mobile-app blocking'));
console.log('cinematic-story: deterministic phases, reversible capture, bounded transforms, local assets and navigation OK');
