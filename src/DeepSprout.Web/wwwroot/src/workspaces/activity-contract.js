/** Minimal common definition adapter. Existing titles remain display/legacy fields. */
export const PRACTICE_TYPES = ['depth','listening','practical','protected-work'];
export const deprecatedPractice = record => /stillness|intentional pause|quiet break|just be|pause\s*&?\s*notice|ink room|evening stillness|weekly reflection|setback review|activity reflection/i.test(`${record?.title||record?.name||''} ${record?.category||''}`);
export function assignmentDefinition(s, title) {
  const d=s.activityCatalog.find(d=>d.title===title&&d.status==='Published');
  if(!d||deprecatedPractice(d))throw new Error('Choose an approved published Meaningful Practice.');
  const type=d.practiceType||PRACTICE_TYPES[['Depth Practice','Listening & Recall','Practical Micro-Challenge','Protected Work'].indexOf(title)];
  if(!PRACTICE_TYPES.includes(type))throw new Error('This catalog record is not an approved practice type.');
  return {activityId:d.id,activityVersion:d.version||1,contentVersion:d.contentVersion||`catalog-${d.id}-${d.version||1}`,definitionSnapshot:JSON.parse(JSON.stringify({...d,practiceType:type,kind:'assignment-reference',level:d.level||'Coach-selected',goalTags:d.goalTags||[],estimatedMinutes:d.duration,instructions:d.instructions||d.description,content:d.instructions||d.description,accessibilityModes:d.accessibilityModes||['coach-arranged'],repetition:{authority:'one eligible reviewed effect per original submission'},evidenceTier:'Coach review required',responseMethod:'coach-submission',validationVersion:'coach-review-1',rewardPolicyVersion:1}))};
}
