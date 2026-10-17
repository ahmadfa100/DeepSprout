/* Chapter 8 · Personal Individual journey (§4–§12, §21.1, §21.4 K, D04–D09, D43, D46). */
export default f => ({
  id: 'personal', n: 8, title: 'Personal Individual journey', short: 'Personal journey',
  layout: { individual: [200, 270], setup: [500, 270], starting: [500, 270], plan: [800, 270], lab: [200, 420], 'lab.2': [400, 420], 'lab.3': [600, 420], 'lab.4': [800, 420], garden: [500, 120], practice: [200, 420], 'practice.2': [400, 420], 'practice.3': [600, 420], 'practice.4': [800, 420], routine: [300, 270], flower: [700, 270], shield: [300, 420], 'shield.2': [700, 420], insights: [800, 270], explore: [300, 420], community: [700, 420], coach: [800, 120], rep: [800, 420] },
  steps: [
    {
      id: 'pers-start', overview: true,
      title: 'Meet Bimo and set up quickly',
      summary: 'A new Individual sees two short Bimo screens, then answers a few quick setup questions: main goal, distracting sites, browsing device, offline interests and one small offline commitment.',
      brief: 'A new Individual meets Bimo and answers a few quick setup questions.',
      show: ['individual', 'setup'],
      at: { individual: [300, 270], setup: [700, 270] },
      edges: ['individual>setup'], flows: ['individual>setup'], token: 'spark',
      note: { kind: 'info', title: 'Useful questions only', text: 'Setup answers personalise the plan. They are stored separately from performance scores: liking walking never improves an attention result.' },
      details: {
        what: 'The first-run sequence began.',
        who: 'The Individual.',
        changed: 'Private personal setup and the first small offline commitment.',
        visible: 'Only the Individual. Progress is saved at every meaningful stage.',
        rules: ['Bimo appears in two short screens using approved original artwork only (§4.2).', 'Skip Introduction skips the explanation, never the four assessments.', 'One small personal offline commitment is required before the first plan activation (§4.3).'],
        where: ['onboarding.html']
      },
      spec: ['§4.1', '§4.2', '§4.3', 'D04'], scenarios: ['A']
    },
    {
      id: 'pers-lab', overview: true,
      title: 'Four baseline assessments',
      summary: 'The Individual completes four short tasks: Digital Habits, Sustained Attention, Inhibitory Control and Depth Challenge. Results are private by default.',
      brief: 'Four short baseline tasks, private by default and never a diagnosis.',
      show: ['individual', 'lab', 'lab.2', 'lab.3', 'lab.4'],
      at: { individual: [500, 120] },
      labels: { lab: 'Digital Habits', 'lab.2': 'Sustained Attention', 'lab.3': 'Inhibitory Control', 'lab.4': 'Depth Challenge' },
      shorts: { lab: 'Habits', 'lab.2': 'Attention', 'lab.3': 'Inhibition', 'lab.4': 'Depth' },
      edges: ['individual>lab', 'individual>lab.2', 'individual>lab.3', 'individual>lab.4'], flows: ['individual>lab', 'individual>lab.2', 'individual>lab.3', 'individual>lab.4'], token: 'flask',
      status: { lab: 'Baseline', 'lab.2': 'Baseline', 'lab.3': 'Baseline', 'lab.4': 'Baseline' },
      note: { kind: 'info', title: 'Tasks, not diagnoses', text: 'Each result is stored with its version and timing. There is no combined brain score and no medical interpretation.' },
      details: {
        what: 'Four versioned baseline attempts were recorded.',
        who: 'The Individual.',
        changed: 'Four Assessment Attempts with version, timestamps and validity.',
        visible: 'Only the Individual (Lab and Starting Point).',
        rules: ['Four assessments, not four diagnoses; no fake brain-health percentage (§4.4).', 'Pause, resume, retry and saved partial progress are required states.', 'Partial progress is never treated as a completed baseline (§4.5).'],
        where: ['lab.html']
      },
      spec: ['§4.4', '§24.5', 'D43'], scenarios: ['A']
    },
    {
      id: 'pers-activate',
      title: 'Starting Point, plan preview, activation',
      summary: 'Your Starting Point shows the four results with their caveats. A short plan-building scene leads to a Plan Preview, and the Individual activates it.',
      show: ['individual', 'starting', 'plan'],
      edges: ['individual>starting', 'starting>plan'], flows: ['individual>starting', 'starting>plan'], sequence: true, token: 'map',
      status: { plan: ['Preview', 'Active'] },
      note: { kind: 'event', title: 'Plan activated', text: 'A 28-day cycle, the strongly favoured configurable default, with a four-week direction and only Week 1 detailed. A short, skippable orientation follows.' },
      details: {
        what: 'The first Recovery Plan was activated.',
        who: 'The Individual, after reviewing the preview.',
        changed: 'Recovery Plan Draft → Preview → Active; first cycle and Week 1 schedule.',
        visible: 'Home, Recovery Plan and Activities.',
        rules: ['Four baselines → Starting Point → Plan activation → short skippable orientation → Home (D04).', 'Do not start commitments merely because a preview was generated (§4.5).', '28 days is a product default, not a promise of recovery (§5.1).'],
        where: ['src/pages/member/onboarding/starting-point.html', 'recovery-plan.html', 'index.html']
      },
      spec: ['§4.5', '§5.1', '§5.7', 'D04'], scenarios: ['A']
    },
    {
      id: 'pers-week',
      title: 'Weekly Review shapes the next week',
      summary: 'Around each week’s end, a light Weekly Review shows verified, reported and missing data separately, asks one or two simple questions and proposes the next detailed week.',
      show: ['individual', 'plan'],
      at: { individual: [300, 270], plan: [700, 270] },
      edges: ['individual>plan'], flows: ['individual>plan'], token: 'check',
      status: { plan: ['Week 1', 'Week 2'] },
      note: { kind: 'info', title: 'Future-only changes', text: 'Adjusting the plan changes future commitments only. History, assessment data and earned rewards never disappear. A skipped review continues conservatively.' },
      details: {
        what: 'The Individual reviewed their week and accepted the next one.',
        who: 'The Individual.',
        changed: 'A plan revision with reason and dates; the next week’s detailed schedule.',
        visible: 'Recovery Plan and Home.',
        rules: ['Accept Next Week, Keep Current Pace or Adjust; never silently raise difficulty (§5.5).', 'Missed days are neutral, not relapse (§5.6).', 'Weekly Review is not a fifth test or a Stillness activity.'],
        where: ['weekly-review.html', 'recovery-plan.html']
      },
      spec: ['§5.2', '§5.5', '§5.6'], scenarios: ['A']
    },
    {
      id: 'pers-practice', overview: true,
      title: 'Four practices, four trees',
      summary: 'A valid attempt at Depth Practice, Listening & Recall, Practical Micro-Challenge or Protected Work progresses only that practice’s tree in the one fixed Personal Garden.',
      brief: 'Each valid practice grows only its own tree in the Personal Garden.',
      show: ['garden', 'practice', 'practice.2', 'practice.3', 'practice.4'],
      labels: { practice: 'Depth Practice', 'practice.2': 'Listening & Recall', 'practice.3': 'Micro-Challenge', 'practice.4': 'Protected Work' },
      shorts: { practice: 'Depth', 'practice.2': 'Listening', 'practice.3': 'Challenge', 'practice.4': 'Protected' },
      subs: { garden: 'Four trees, one scene' },
      edges: ['practice>garden', 'practice.2>garden', 'practice.3>garden', 'practice.4>garden'], flows: ['practice>garden'], token: 'leaf',
      note: { kind: 'event', title: 'Depth tree progressed', text: 'One valid Depth Practice attempt progressed the Depth tree only. Extra repetitions do not generate limitless growth.' },
      details: {
        what: 'A valid practice attempt produced one tree effect.',
        who: 'The Individual (attempt); reward rules (effect).',
        changed: 'One Practice Attempt; one Depth-tree progress effect under the policy version.',
        visible: 'Garden, Activities history and Insights → Meaningful Practice.',
        rules: ['Exactly four Personal trees, mapped one-to-one to the four practices; no central fifth tree (D07, D08).', 'No recent data is neutral; nothing dims or wilts (D06).', 'Thresholds and species remain open policy values.'],
        where: ['training.html', 'garden.html', 'insights.html']
      },
      spec: ['§7.2', '§9.1', '§9.2', 'D06', 'D07', 'D08'], scenarios: ['A']
    },
    {
      id: 'pers-routine',
      title: 'Offline routine, self-reported',
      summary: 'The Individual ticks off their chosen offline routine, such as a short walk or a book. A qualifying record may unlock a small, bounded flower.',
      show: ['routine', 'flower'],
      subs: { routine: 'Self-reported', flower: 'Personal Garden' },
      edges: ['routine>flower'], flows: ['routine>flower'], token: 'flower',
      note: { kind: 'info', title: 'Honestly labeled', text: 'A checklist tick is self-report, not verified evidence. Arbitrary personal to-dos earn nothing.' },
      details: {
        what: 'A routine day was recorded.',
        who: 'The Individual.',
        changed: 'One self-reported routine record; possibly one bounded flower effect.',
        visible: 'Activities → My Offline Routine, Garden and Insights → Offline & Experiences.',
        rules: ['Eligible routine → bounded flower (D09).', 'Never infinite growth from self-authored tasks (§7.4).'],
        where: ['training.html', 'garden.html']
      },
      spec: ['§7.4', '§9.2', 'D09'], scenarios: ['A']
    },
    {
      id: 'pers-shield',
      title: 'Digital Shield: two capabilities',
      summary: 'Manual Website Protection blocks chosen sites for a countdown. The Shared Website Usage Reminder prompts once a chosen daily limit is reached. Both work only inside a supported browser.',
      show: ['individual', 'shield', 'shield.2'],
      at: { individual: [500, 120] },
      labels: { shield: 'Website Protection', 'shield.2': 'Usage Reminder' },
      shorts: { shield: 'Protection', 'shield.2': 'Reminder' },
      subs: { shield: 'Countdown block', 'shield.2': 'Shared daily limit' },
      edges: ['individual>shield', 'individual>shield.2'], flows: ['individual>shield', 'individual>shield.2'], token: 'shield',
      note: { kind: 'caution', title: 'Browser-scoped', text: 'The Shield cannot block phone apps or detect Reels-only time. The current demo stores preferences locally and does not block anything.' },
      details: {
        what: 'The two Shield capabilities.',
        who: 'The Individual.',
        changed: 'Shield settings; protection sessions; reminder prompts.',
        visible: 'Shield and, when supported, Insights → Digital Usage.',
        rules: ['Exactly two capabilities (§6).', 'The reminder offers Continue Anyway or Back to DeepSprout and does not override an active strict block (§6.2).', 'No claim of bypass-proof or mobile-app enforcement (§6.4).'],
        where: ['shield.html', 'insights.html']
      },
      simulated: 'Blocking and usage measurement require the optional browser extension; the current page is a local preview.',
      spec: ['§6', '§6.4', '§24.5'], scenarios: ['A']
    },
    {
      id: 'pers-insights',
      title: 'Insights keep every source labeled',
      summary: 'Insights shows digital usage, plan adherence, practice, Lab results, and offline and experience records, each labeled with its source and period. Missing data reads “No data”, never zero.',
      show: ['practice', 'shield', 'lab', 'insights'],
      at: { practice: [200, 140], shield: [500, 140], lab: [800, 140], insights: [500, 420] },
      labels: { practice: 'Practice attempts', shield: 'Browser usage', lab: 'Lab results' },
      shorts: { practice: 'Practice', shield: 'Usage', lab: 'Lab' },
      subs: { practice: 'System-scored', shield: 'Browser-observed', lab: 'Versioned tasks' },
      edges: ['practice>insights', 'shield>insights', 'lab>insights'], flows: ['practice>insights', 'shield>insights', 'lab>insights'], token: 'chart',
      note: { kind: 'info', title: 'No invented scores', text: 'There is no recovery percentage and no shared 0–100 axis for unrelated measures. Comparisons appear only when valid matched data exists.' },
      details: {
        what: 'Separate sources feed separate Insights domains.',
        who: 'Computed from the Individual’s own records.',
        changed: 'Nothing is recorded; Insights reads sources.',
        visible: 'Only the Individual.',
        rules: ['Five domains: Digital Usage, Plan Adherence, Meaningful Practice, Lab Assessments, Offline & Experiences (§10.2).', 'Without extension data: “No browser usage data available” (§10.2).', 'Self-reported, browser-observed, system-scored and Supervisor-confirmed evidence are never interchangeable (§1.3).'],
        where: ['insights.html']
      },
      spec: ['§10.1', '§10.2', '§10.3'], scenarios: ['A']
    },
    {
      id: 'pers-explore',
      title: 'Explore and Community',
      summary: 'Explore offers real Initiatives, sessions and Provider experiences, separate from personal Activities. Community is a finite, moderated place to share. Sharing earns no growth.',
      show: ['individual', 'explore', 'community'],
      at: { individual: [500, 120] },
      edges: ['individual>explore', 'individual>community'], flows: ['individual>explore', 'individual>community'], token: 'arrow',
      note: { kind: 'info', title: 'Different purposes', text: 'Opportunities in Explore are optional; a Recovery Cycle never requires buying a trip. Posts, likes and comments never grant Garden growth.' },
      details: {
        what: 'The two social and opportunity destinations.',
        who: 'The Individual.',
        changed: 'Nothing until the person applies, books or posts.',
        visible: 'Explore listings are public to members; Community posts are moderated.',
        rules: ['Explore is not the Activities tab for browsing practices (§7.7).', 'Sharing and likes grant no Garden growth (§7.5, §12.1).', 'Community’s final redesign is deliberately postponed (§12).'],
        where: ['explore.html', 'community.html', 'admin/moderation']
      },
      spec: ['§11', '§12', '§7.5'], scenarios: ['A']
    },
    {
      id: 'pers-reassess',
      title: 'Official reassessment opens weekly',
      summary: 'An official reassessment window opens weekly, using Digital Habits plus one rotating task rather than all four. It is free and separate from the 28-day plan cycle.',
      show: ['individual', 'lab', 'insights'],
      at: { individual: [200, 270], lab: [500, 270], insights: [800, 270] },
      labels: { lab: 'Weekly recheck' }, shorts: { lab: 'Recheck' },
      subs: { lab: 'Habits + 1 rotating' },
      edges: ['individual>lab', 'lab>insights'], flows: ['individual>lab', 'lab>insights'], sequence: true, token: 'flask',
      status: { lab: 'Window open' },
      note: { kind: 'info', title: 'Comparable or not shown', text: 'A comparison appears only when versions and protocol match. Practice effects are explained. Practice never counts as an official reassessment.' },
      details: {
        what: 'An official weekly recheck was completed.',
        who: 'The Individual.',
        changed: 'Eligible official Assessment Attempts.',
        visible: 'Lab and Insights → Lab Assessments.',
        rules: ['Official reassessment eligibility opens weekly (D05).', 'Digital Habits + one rotating task is the current direction; window length and protocol remain open (D43).', 'Essential reassessment and history are free (§20.2).'],
        where: ['lab.html', 'insights.html']
      },
      spec: ['§4.4', '§5.8', 'D05', 'D43'], scenarios: ['A']
    },
    {
      id: 'pers-privacy', overview: true,
      title: 'Personal records stay private',
      summary: 'Lab results, Recovery Plan, Shield data and personal routines belong to the Individual. Coaches, Representatives, Supervisors and Providers never see them through Initiative work.',
      brief: 'Lab, Recovery and Shield records stay private; partner staff never see them.',
      show: ['individual', 'lab', 'plan', 'coach', 'rep'],
      at: { individual: [500, 270], lab: [200, 120], plan: [200, 420], coach: [800, 120], rep: [800, 420] },
      labels: { lab: 'Lab results', rep: 'Representative' },
      edges: ['individual>lab:side', 'individual>plan:side'],
      status: { coach: '!No access', rep: '!No access' },
      dim: ['coach', 'rep'],
      focus: ['individual'],
      note: { kind: 'caution', title: 'Private by default', text: 'Initiative attendance does not change Lab results, browser measurements or Recovery metrics, and partner roles cannot read them.' },
      details: {
        what: 'The privacy boundary between personal recovery and Institution operations.',
        who: 'Not applicable.',
        changed: 'Nothing.',
        visible: 'Only the Individual sees their private records.',
        rules: ['View private Lab, Shield or Recovery: denied to every partner role; Admin only under an exceptional audited legal grant (§23.1).', 'Initiative or camp participation never fabricates Lab, Shield or Recovery improvement (D46).', 'An unrelated awareness Initiative does not alter a personal recovery score (§1.1).'],
        fails: ['A partner role requesting these records is denied (PRIV-18).'],
        where: ['lab.html', 'recovery-plan.html', 'shield.html', 'admin/users']
      },
      spec: ['§1.3', '§23.1', '§24.1', '§25.1 PRIV-18', 'D46'], scenarios: ['A', 'C']
    }
  ]
});
