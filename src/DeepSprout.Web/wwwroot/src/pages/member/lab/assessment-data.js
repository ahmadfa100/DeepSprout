/**
 * Content and metadata for the four baseline instruments.
 *
 * Each instrument carries a version string. Attempts record the version they
 * were taken with, because two attempts are only comparable when the version
 * and conditions match (spec 4.4).
 */
window.DeepSproutAssessments = {
  'digital-habits': {
    id: 'digital-habits',
    title: 'Digital Habits',
    kind: 'Self-report questionnaire',
    version: 'DH-1.0',
    minutes: 4,
    icon: 'i-phone',
    tone: '',
    blurb: 'Short, honest questions about short-video use, stopping, and the situations around it.',
    records: 'Clearly labelled self-reports and your chosen goals. Nothing here is a performance score.',
    evidence: 'self-reported',
    intro: {
      heading: 'A few honest questions',
      body: 'There are no right answers and nothing is timed. Answer for a normal week rather than your best or worst one.',
      points: [
        'Eight statements, each on a five-point scale.',
        'Your answers are stored as self-reports — they are never mixed with the timed tasks.',
        'You can stop and come back; your progress is kept.'
      ]
    },
    scale: ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'],
    items: [
      { id: 'q1', text: 'I open a short-video feed without deciding to.' },
      { id: 'q2', text: 'I stay on a feed much longer than I intended.' },
      { id: 'q3', text: 'I find it hard to stop once I have started scrolling.' },
      { id: 'q4', text: 'I scroll to avoid something I should be doing.' },
      { id: 'q5', text: 'I check a feed in the first few minutes after waking up.' },
      { id: 'q6', text: 'Scrolling cuts into my sleep.' },
      { id: 'q7', text: 'I feel worse after a long scrolling session than before it.' },
      { id: 'q8', text: 'I reach for my phone when I have a few free minutes.', reverse: false }
    ]
  },

  'sustained-attention': {
    id: 'sustained-attention',
    title: 'Sustained Attention',
    kind: 'Timed response task',
    version: 'SA-1.0',
    minutes: 4,
    icon: 'i-clock',
    tone: 'sky',
    blurb: 'A simple shape appears at irregular intervals. Respond as quickly as you can, and keep going when nothing happens.',
    records: 'Hits, missed targets, early responses, average reaction time and how steady those times were.',
    evidence: 'verified',
    intro: {
      heading: 'Watch, wait, respond',
      body: 'A green circle will appear in the box at irregular intervals. Press the space bar — or tap the box — as soon as you see it.',
      points: [
        'The gaps between targets are deliberately uneven. Long quiet stretches are part of the task.',
        'Responding when nothing is there is recorded as an early response.',
        'The task runs for about 24 targets and takes roughly two minutes.'
      ]
    },
    trials: 24,
    minGap: 1400,
    maxGap: 4200,
    stimulusMs: 1100
  },

  'inhibitory-control': {
    id: 'inhibitory-control',
    title: 'Inhibitory Control',
    kind: 'Go / no-go task',
    version: 'IC-1.0',
    minutes: 3,
    icon: 'i-hand',
    tone: 'lilac',
    blurb: 'Respond to one signal and hold back on the other. The hard part is the holding back.',
    records: 'Correct responses, missed go signals, commission errors on no-go signals and average reaction time.',
    evidence: 'verified',
    intro: {
      heading: 'Go on green, hold on amber',
      body: 'A shape flashes in the box. Press the space bar — or tap — for a green circle. Do nothing at all for an amber square.',
      points: [
        'Most signals are green, which makes the amber ones genuinely hard to resist.',
        'Responding to an amber square is recorded as a commission error.',
        'About 40 signals, roughly two minutes.'
      ]
    },
    trials: 40,
    noGoRatio: 0.28,
    stimulusMs: 850,
    gapMs: 700
  },

  'depth-challenge': {
    id: 'depth-challenge',
    title: 'Depth Challenge',
    kind: 'Reading comprehension',
    version: 'DC-1.0-a',
    minutes: 6,
    icon: 'i-book',
    tone: 'gold',
    blurb: 'A short passage, then questions about its ideas, its details and what it implies.',
    records: 'Question accuracy, reading time and the passage version and difficulty tier used.',
    evidence: 'verified',
    intro: {
      heading: 'Read once, then answer',
      body: 'Read the passage at your normal pace. When you move on, the passage is put away and the questions appear.',
      points: [
        'You cannot return to the passage once you start the questions.',
        'Five questions covering the main idea, specific details and an implication.',
        'Reading time is recorded alongside accuracy — speed on its own is not the point.'
      ]
    },
    passageTitle: 'The cost of switching',
    difficulty: 'Tier 1',
    passage: [
      'For most of the last century, researchers studying attention worked with a comfortable assumption: that interruptions cost you the time they take. Stop reading for thirty seconds to answer a message, and you lose thirty seconds. The arithmetic was tidy, and it was wrong.',
      'What later work showed is that the interruption leaves a residue. After returning to a task, people do not resume at the point they left. They spend a stretch of time rebuilding the context they had been holding — where they were in an argument, what a paragraph was doing, which thread they were following. The rebuilding is largely invisible. It feels like reading, but very little is being taken in.',
      'This matters more for some tasks than for others. Sorting a list of names tolerates interruption well, because almost no context is being held. Following a long argument tolerates it badly, because the context is the whole point. The more a task depends on holding several things in mind at once, the more expensive each switch becomes.',
      'Short-video feeds are unusual because they compress this cost into very small units. A single clip may last twelve seconds, but it arrives as a complete switch: new voice, new setting, new premise. Watching forty of them in a row is not one long activity. It is forty separate arrivals, each demanding a small rebuild of context that is then discarded. The feed asks for attention constantly and rewards holding it almost never.',
      'None of which makes a feed harmful by itself. The useful question is narrower, and more practical: what are you trying to do afterwards, and how much context does that thing require you to hold?'
    ],
    questions: [
      {
        id: 'q1',
        text: 'What is the main point the passage is making?',
        options: [
          'Interruptions cost more than the time they take, because context has to be rebuilt.',
          'Short-video feeds are harmful and should be avoided entirely.',
          'Researchers in the last century were not careful about their methods.',
          'Reading is a more valuable activity than watching video.'
        ],
        answer: 0
      },
      {
        id: 'q2',
        text: 'According to the passage, why does sorting a list of names tolerate interruption well?',
        options: [
          'It is a task people find enjoyable.',
          'Almost no context is being held while doing it.',
          'It can be finished quickly.',
          'It does not require reading.'
        ],
        answer: 1
      },
      {
        id: 'q3',
        text: 'What does the passage say happens immediately after returning to an interrupted task?',
        options: [
          'People work faster to make up the lost time.',
          'People resume exactly where they left off.',
          'People spend time rebuilding context while feeling like they are working.',
          'People usually abandon the task.'
        ],
        answer: 2
      },
      {
        id: 'q4',
        text: 'Why does the passage describe forty clips as "forty separate arrivals"?',
        options: [
          'Because each clip is made by a different person.',
          'Because the clips are watched on forty different occasions.',
          'Because each clip is a complete switch requiring its own small rebuild of context.',
          'Because forty is the typical length of a viewing session.'
        ],
        answer: 2
      },
      {
        id: 'q5',
        text: 'Which conclusion does the passage actually support?',
        options: [
          'The effect of a feed depends on what you are trying to do afterwards.',
          'Attention is a fixed resource that cannot be trained.',
          'Any interruption is equally costly regardless of the task.',
          'Watching video damages the ability to read.'
        ],
        answer: 0
      }
    ]
  }
};
