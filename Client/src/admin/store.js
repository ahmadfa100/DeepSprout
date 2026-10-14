// Local, replaceable development data source. This is not authentication or a backend.
export const DATA_KEY = 'deepsprout-admin-demo-v1';
export const SESSION_KEY = 'deepsprout-admin-demo-session';
export const goals = ['Less scrolling', 'Deeper focus', 'More offline time', 'Calmer routine'];
export const categories = ['Digital Protection & Habit Control', 'Meaningful Practice', 'Offline Life', 'Stillness & Reflection', 'Community'];
export const modes = ['Assigned', 'On Demand', 'Triggered', 'Scheduled Review'];
export const evidenceTypes = ['In-platform recorded', 'Self-reported offline', 'None'];

const seed = () => ({
  users: [
    ['u1','Lina Haddad','lina@example.test','Student','active','2026-07-03','Complete','Active','Connected'],
    ['u2','Omar Saad','omar@example.test','Student','active','2026-07-11','In progress','Active','Not connected'],
    ['u3','Sara Nasser','sara@example.test','Student','active','2026-08-01','Complete','Active','Connected'],
    ['u4','Yousef Karim','yousef@example.test','Student','active','2026-08-18','Not started','None','Not connected'],
    ['u5','Maya Salem','maya@example.test','Student','active','2026-08-26','Complete','Active','Connected'],
    ['u6','Rami Faris','rami@example.test','Student','paused','2026-09-05','In progress','Paused','Not connected'],
    ['u7','Noor Darwish','noor@example.test','Member','active','2026-09-12','Complete','Active','Connected'],
    ['u8','Hadi Mansour','hadi@example.test','Member','active','2026-09-22','Not started','None','Not connected'],
    ['u9','Dina Khoury','dina@example.test','Trainer','active','2026-06-21','—','None','Not connected'],
    ['u10','Kareem Musa','kareem@example.test','Trainer','active','2026-07-02','—','None','Not connected']
  ].map(([id,name,email,role,status,joined,assessment,plan,shield])=>({id,name,email,role,status,joined,assessment,plan,shield})),
  groups: [
    {id:'g1',name:'Green Horizons',code:'GH-101',trainerId:'u9',members:['u1','u2','u3'],created:'2026-08-03',status:'active'},
    {id:'g2',name:'Focus Circle',code:'FC-204',trainerId:'u10',members:['u4','u5'],created:'2026-09-01',status:'active'},
    {id:'g3',name:'Autumn Practice',code:'AP-305',trainerId:'u9',members:['u6'],created:'2026-09-12',status:'archived'}
  ],
  activities: [
    {id:'a1',name:'Depth Reading',description:'Read without switching tasks.',instructions:'Choose a short article or book. Read, then record your session.',category:'Meaningful Practice',goals:['Deeper focus'],minutes:15,mode:'On Demand',evidence:'In-platform recorded',completion:'Timer finishes',reward:true,planEligible:true,status:'published',image:'',alt:''},
    {id:'a2',name:'Phone-free Walk',description:'Spend a few minutes outdoors without a phone.',instructions:'Take a short walk, then reflect on what you noticed.',category:'Offline Life',goals:['More offline time','Less scrolling'],minutes:10,mode:'Assigned',evidence:'Self-reported offline',completion:'One reflection per day',reward:true,planEligible:true,status:'published',image:'',alt:''},
    {id:'a3',name:'Intentional Pause',description:'Pause before opening a distracting site.',instructions:'Notice your intention and choose your next step.',category:'Digital Protection & Habit Control',goals:['Less scrolling'],minutes:2,mode:'Triggered',evidence:'In-platform recorded',completion:'One recorded pause',reward:false,planEligible:true,status:'published',image:'',alt:''},
    {id:'a4',name:'Evening Stillness',description:'Make space for a calmer evening.',instructions:'Put the phone aside and take a few quiet breaths.',category:'Stillness & Reflection',goals:['Calmer routine'],minutes:8,mode:'On Demand',evidence:'Self-reported offline',completion:'One check-in per day',reward:true,planEligible:true,status:'draft',image:'',alt:''},
    {id:'a5',name:'Weekly Reflection',description:'Review what felt easier this week.',instructions:'Write one small win and one challenge.',category:'Meaningful Practice',goals:['Deeper focus','Less scrolling'],minutes:5,mode:'Scheduled Review',evidence:'In-platform recorded',completion:'One weekly review',reward:false,planEligible:true,status:'published',image:'',alt:''}
  ],
  plans: [
    {id:'p1',userId:'u1',goal:'Deeper focus',status:'active',start:'2026-09-03',stage:'Rebuild',progress:62},
    {id:'p2',userId:'u2',goal:'Less scrolling',status:'active',start:'2026-09-10',stage:'Reset',progress:34},
    {id:'p3',userId:'u3',goal:'More offline time',status:'active',start:'2026-09-15',stage:'Rebuild',progress:48},
    {id:'p4',userId:'u5',goal:'Calmer routine',status:'active',start:'2026-09-19',stage:'Assess',progress:24},
    {id:'p5',userId:'u6',goal:'Less scrolling',status:'paused',start:'2026-09-23',stage:'Reset',progress:18},
    {id:'p6',userId:'u7',goal:'Deeper focus',status:'active',start:'2026-10-02',stage:'Assess',progress:12}
  ],
  planTemplates: [
    {id:'pt1',name:'Gentle Scroll Reset',goal:'Less scrolling',dailyLimit:1,reviewDay:'Sunday',ruleVersion:'1.0',status:'active'},
    {id:'pt2',name:'Depth Practice',goal:'Deeper focus',dailyLimit:2,reviewDay:'Sunday',ruleVersion:'1.0',status:'active'},
    {id:'pt3',name:'Offline Rhythm',goal:'More offline time',dailyLimit:1,reviewDay:'Saturday',ruleVersion:'1.0',status:'active'},
    {id:'pt4',name:'Calm Evening',goal:'Calmer routine',dailyLimit:1,reviewDay:'Sunday',ruleVersion:'1.0',status:'active'}
  ],
  assessments: [
    {id:'as1',name:'Digital Habits',minutes:8,version:'1.2',status:'active',completions:6,instructions:'Reflect on current screen routines.',questions:['When do you reach for your phone most often?','Which apps feel hardest to leave?']},
    {id:'as2',name:'Sustained Attention',minutes:12,version:'1.0',status:'active',completions:5,instructions:'Complete one focused task in a quiet setting.',questions:['Follow the timed focus task.']},
    {id:'as3',name:'Inhibitory Control',minutes:10,version:'1.0',status:'active',completions:4,instructions:'Follow the response task instructions carefully.',questions:['Respond only to the indicated prompt.']},
    {id:'as4',name:'Depth Challenge',minutes:15,version:'1.1',status:'active',completions:3,instructions:'Read a short passage, then answer the reflection prompts.',questions:['What was the main idea of the passage?']}
  ],
  shield: {categories:['Social feeds','Short video','News loops'],presets:[{id:'sp1',name:'Evening wind-down',start:'19:00',message:'Take a breath. Is this where you want your attention right now?'},{id:'sp2',name:'Study focus',start:'09:00',message:'Your focus time matters. Choose your next step intentionally.'}],warning:'Extension telemetry is unavailable in this frontend demo.'},
  gardenRules: [
    {id:'gr1',name:'Offline walk',event:'Eligible Offline Walk Completed',evidence:'Self-reported offline',effect:'Small flower',condition:'Once per day after reflection',limit:'1/day',version:'1.0',status:'active',reason:'Recognizes a documented offline choice.'},
    {id:'gr2',name:'Focus milestone',event:'Four focus sessions completed',evidence:'In-platform recorded',effect:'Young sprout',condition:'Four distinct sessions',limit:'1/week',version:'1.0',status:'active',reason:'A larger milestone needs recorded participation.'},
    {id:'gr3',name:'Personal task',event:'Personal To-Do checked',evidence:'None',effect:'No growth',condition:'Never reward',limit:'0',version:'1.0',status:'active',reason:'Personal tasks are not verified participation.'}
  ],
  community: {posts:[{id:'post1',author:'Lina H.',title:'My first phone-free walk',body:'I noticed the trees on my street today.',status:'visible'},{id:'post2',author:'Omar S.',title:'A small focus win',body:'I read for fifteen minutes without switching apps.',status:'visible'}],reports:[{id:'r1',postId:'post2',reason:'Possible personal information',status:'pending',created:'2026-10-10'},{id:'r2',postId:'post1',reason:'Off-topic concern',status:'dismissed',created:'2026-10-08'}],jointGoals:[{id:'j1',name:'7-Day Reading Focus',members:12,status:'active'},{id:'j2',name:'Evening Unplug',members:8,status:'active'}]},
  content: {published:{'landing.hero.lead':{text:'Your screen time can feel lighter. Find your focus, build gentle routines, and celebrate every small step with DeepSprout.',style:'body',color:'default',align:'left'},'landing.features.intro':{text:'Simple tools that turn your intentions into a rhythm you can actually enjoy.',style:'body',color:'default',align:'left'},'landing.feature.focus.title':{text:'Find your focus',style:'heading',color:'default',align:'left'},'landing.feature.focus.image':{image:'assets/home/features-v2.png',alt:'Illustrated focus timer among green leaves',fit:'cover',position:'center'}},draft:null,versions:[]},
  settings:{adminName:'Demo Administrator',siteName:'DeepSprout',announcement:'',brandAccent:'Forest green'},
  events:[{id:'e1',action:'Activity Published',resource:'Depth Reading',admin:'Demo seed',time:'2026-10-08T10:00:00.000Z',summary:'Published activity for plan eligibility.'},{id:'e2',action:'Group Created',resource:'Focus Circle',admin:'Demo seed',time:'2026-09-01T09:00:00.000Z',summary:'Added a student training group.'},{id:'e3',action:'Community Report Submitted',resource:'r1',admin:'System sample',time:'2026-10-10T14:00:00.000Z',summary:'Report awaits moderation.'}],
  activityCompletions:[{date:'2026-09-07',category:'Meaningful Practice',count:7},{date:'2026-09-14',category:'Meaningful Practice',count:9},{date:'2026-09-21',category:'Offline Life',count:5},{date:'2026-09-28',category:'Stillness & Reflection',count:6},{date:'2026-10-05',category:'Meaningful Practice',count:11},{date:'2026-10-05',category:'Digital Protection & Habit Control',count:8}]
});

export function read() {
  try { const raw = localStorage.getItem(DATA_KEY); if (raw) { const data=JSON.parse(raw);if(!data.planTemplates){data.planTemplates=seed().planTemplates;write(data);}return data; } }
  catch { /* a private browser may disable storage */ }
  const data = seed(); write(data); return data;
}
export function write(data) { try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch { /* session remains usable in memory */ } return data; }
export function reset() { const data=seed(); write(data); return data; }
export function mutate(data, action, resource, summary) {
  data.events.unshift({id:`e${Date.now()}`,action,resource,admin:data.settings.adminName,time:new Date().toISOString(),summary});
  write(data);
}
export function uid(prefix) { return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`; }
export function isDemo() { try { if(localStorage.getItem(SESSION_KEY)==='active')return true; } catch {} try { return sessionStorage.getItem(SESSION_KEY)==='active'; } catch { return false; } }
export function startDemo() { try { localStorage.setItem(SESSION_KEY,'active'); } catch { sessionStorage.setItem(SESSION_KEY,'active'); } }
export function endDemo() { try { localStorage.removeItem(SESSION_KEY); } catch {} try { sessionStorage.removeItem(SESSION_KEY); } catch {} }
