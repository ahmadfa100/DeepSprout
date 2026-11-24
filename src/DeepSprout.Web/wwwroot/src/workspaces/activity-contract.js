/** Minimal common definition adapter. Existing titles remain display/legacy fields. */
export const CURRENT_PRACTICES = [
  {id:'activity-0',practiceType:'depth',title:'Depth Practice',description:'Read an original passage and answer comprehension questions.'},
  {id:'activity-1',practiceType:'listening',title:'Listening & Recall',description:'Listen to an original recording and answer recall questions.'},
  {id:'activity-visual-observation',practiceType:'visual-observation',title:'Visual Observation & Analysis',description:'Study scenes and answer scored questions about details, changes and spatial reasoning.'},
  {id:'activity-digital-judgment',practiceType:'digital-judgment',title:'Reasoning & Digital Judgment',description:'Inspect fictional sources and choose conclusions supported by the evidence.'}
];
const LEGACY_TYPES = {'Practical Micro-Challenge':'practical','Protected Work':'protected-work'};
const PRACTICE_TYPES = CURRENT_PRACTICES.map(item=>item.practiceType);
export const retiredPractice = record => Object.hasOwn(LEGACY_TYPES, record?.title);
export const deprecatedPractice = record => /stillness|intentional pause|quiet break|just be|pause\s*&?\s*notice|ink room|evening stillness|weekly reflection|setback review|activity reflection/i.test(`${record?.title||record?.name||''} ${record?.category||''}`);
export const catalogPractice = definition => ({...definition,difficulty:'Introductory to advanced',duration:5,status:'Published',version:1});

// Retain the original catalog IDs for historical assignment and review references.
export function refreshPracticeCatalog(s) {
  let changed=false;
  for (const record of s.activityCatalog) {
    if (!retiredPractice(record) || record.retired) continue;
    (record.history ||= []).push({version:record.version,description:record.description,status:record.status});
    Object.assign(record,{retired:true,status:'Archived',practiceType:LEGACY_TYPES[record.title]});
    changed=true;
  }
  for (const definition of CURRENT_PRACTICES) {
    if (s.activityCatalog.some(record=>record.id===definition.id)) continue;
    s.activityCatalog.push(catalogPractice(definition));
    changed=true;
  }
  return changed;
}

export function assignmentDefinition(s, title, {historicalSample=false}={}) {
  const d=s.activityCatalog.find(d=>d.title===title&&(d.status==='Published'||historicalSample&&retiredPractice(d)));
  if(!d||deprecatedPractice(d))throw new Error('Choose an approved published Meaningful Practice.');
  const type=d.practiceType||CURRENT_PRACTICES.find(item=>item.title===title)?.practiceType||LEGACY_TYPES[title];
  if(!PRACTICE_TYPES.includes(type)&&!(historicalSample&&retiredPractice(d)))throw new Error('This catalog record is not an approved practice type.');
  return {activityId:d.id,activityVersion:d.version||1,contentVersion:d.contentVersion||`catalog-${d.id}-${d.version||1}`,definitionSnapshot:JSON.parse(JSON.stringify({...d,practiceType:type,kind:'assignment-reference',level:d.level||'Coach-selected',goalTags:d.goalTags||[],estimatedMinutes:d.duration,instructions:d.instructions||d.description,content:d.instructions||d.description,accessibilityModes:d.accessibilityModes||['coach-arranged'],repetition:{authority:'one eligible reviewed effect per original submission'},evidenceTier:'Coach review required',responseMethod:'coach-submission',validationVersion:'coach-review-1',rewardPolicyVersion:1}))};
}
