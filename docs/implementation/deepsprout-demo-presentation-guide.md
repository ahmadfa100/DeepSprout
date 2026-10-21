# DeepSprout — Demo presentation guide

A practical script for presenting DeepSprout without building anything live. It was written on 17 October 2026 against the working tree described in [the design and demo report](deepsprout-premium-individual-design-and-demo-report.md).

## Before the audience arrives (about 3 minutes)

1. Start the local server **on port 8897**. The Digital Shield extension only answers on this origin.
   ```sh
   python3 Client/serve.py --port 8897
   ```
2. Optional, for a live Shield demo: in Chrome, open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and select `Client/extensions/digital-shield`.
3. Open **http://127.0.0.1:8897/demo.html**, the presenter page.
4. On the **Rania Yasin** card, click **Prepare journey** (later **Restore journey**) and confirm. The page rebuilds her journal through the real engines in about 2 seconds. Keep the box ticked to pin the shared demo clock to **Fri 16 Oct 2026, 10:00**.
5. Click **Enter as Rania**. The Home page opens without onboarding or a product tour.

> Use the same address (`127.0.0.1:8897`) throughout. Browser storage is per origin, so `localhost:8897` is a different device as far as the demo is concerned.

## Prepared identities

| Who | Role | What is already there |
| --- | --- | --- |
| **Rania Yasin** (`rania@demo.example`) | Individual — main presentation journey | <ul><li>Week 3, day 19 of an active plan</li><li>Four valid baseline checks and two weekly Lab pairs</li><li>11 practices linked to scheduled days, plus one missed day</li><li>Two weekly reviews</li><li>Depth moved to Level 2; Practical ready for Level 2</li><li>A 10-minute walk routine</li><li>Four Garden trees with growth</li><li>An accepted **Start Today** admission (Circle A, Coach task assigned)</li><li>A waiting-list place on the **Weekend Nature Reset** camp</li></ul> |
| **Ahmad Saleh** (`ahmad@demo.example`) | Individual — the original seeded story | Frozen on Sat 17 Jan 2026. Older records are honestly labelled *legacy*. |
| New person | Fresh first run | Choose **Sign out and register** to show Register → Bimo → four checks → activation |
| Maya Haddad | Institution Representative · Coach | Start Today admissions (including Rania's), sessions and groups |
| Hala Mansour | Initiative Supervisor | Attendance and excuses |
| Karim Odeh | Coach | The task assigned to Rania's Circle A |
| Sami Nasser | Outdoor Provider · Supervisor | The Weekend Nature Reset waiting list with Rania's `b-rania` booking |
| Noor Khalil | Invited Student · Participant | Coach tasks, booking credential and attendance |
| Leen Salem | Platform Admin | Partner applications and governance |

You can also sign in from the Login page with any of these emails; the password is not checked in this demo. To switch people during the talk, use the avatar menu → **Switch person (demo)**, or go back to `demo.html`.

## The 6–8 minute walkthrough (as Rania)

| # | Page | Show | Safe interaction | Time |
| --- | --- | --- | --- | --- |
| 1 | **Home** | Today's practice and her four-tree Garden preview | — | 0:30 |
| 2 | **Recovery Plan** | <ul><li>"Today · Depth Practice, Level 2"</li><li>The status line *Active · Cycle 1 · 3 of 4 done this week*</li><li>The four-week track</li></ul> | <ul><li>**This week**: the calendar with done, rest and missed days</li><li>**Adjust**: pick a focus, then **Preview future changes** to see the visual schedule. You can stop before confirming.</li><li>**History**</li></ul> | 1:30 |
| 3 | **Activities** | <ul><li>**For You**: today's scheduled practice, with steps and duration</li><li>**Your levels**: Practical shows *Ready for Level 2*</li></ul> | <ul><li>**Start today's practice**, answer the five questions, then **Submit evidence**. The result card says it is a Garden source.</li><li>Optionally, **Try Level 2** on Practical.</li></ul> | 1:30 |
| 4 | **Insights** | <ul><li>Lab scales: starting point compared with weekly results, labelled Demo scenario, with no improvement claimed</li><li>This week day by day</li><li>Levels</li><li>Beyond the screen: Institution initiative and outdoor booking</li></ul> | Tap a **?** toggletip to show that the detail is one tap away | 1:00 |
| 5 | **Garden** | Four practice trees grown only from qualifying attempts | Click a tree to see what grew it | 0:30 |
| 6 | **Digital Shield** | The status band and the two capabilities | **If the extension is loaded:** pair, tick YouTube, choose **1** minute, accept, then **Start Protection**. Open youtube.com to show it blocked. **If not:** show the three setup steps and say it needs the extension. | 1:00 |
| 7 | **Explore** | Real Start Today and Weekend Nature Reset listings next to clearly marked sample listings | <ul><li>**View details** on **Start Today**: *Accepted · application APP-RAN1A5*</li><li>**View details** on **Weekend Nature Reset**: *Your booking · Waitlisted*, with safety and consent shown before any booking action</li></ul> | 1:00 |

### Optional cross-role coda (3–4 minutes)

1. Switch to **Sami** and open Outdoor Provider → **Waiting List**. Rania's place on the Weekend Nature Reset is listed; it is the same `b-rania` booking she sees in Explore.
2. Switch to **Karim** and open Coach → **Assignments**. "Name and try one small first step" is the task Rania sees under Activities → Assigned.
3. Switch to **Maya** and open Institution → **Applications & Students** for Start Today. *Accepted students 2 / 40* counts Rania's original application APP-RAN1A5; the default view lists pending applications first.

## What is real, simulated or synthetic

- **Real engines.**
  - Assessment validity and contracts, practice players and scoring, level eligibility, Recovery scheduling, reviews and revisions, Garden source rules and partner records all run the actual code paths.
  - Rania's scenario was produced *through* these engines; nothing was written directly.
- **Synthetic.**
  - Rania's journal is labelled *Demo · Scenario* by the demo chip. Her Lab rows on Insights carry a visible **Demo scenario** chip, and the Lab history says "Demo scenario · synthetic result".
  - Her weekly Lab values are deliberately flat or slightly worse than her starting point. The demo tells no improvement story — say so if asked.
  - Listening attempts used the transcript mode, so they never claim observed audio playback.
  - No Protected Work timer evidence was fabricated.
- **Browser-observed.** Digital Shield time appears only when the real extension observes it. Rania starts with *No browser usage data* — that is correct, not a bug.
- **Simulated.** Authentication (passwords are not checked), email, payment and QR scanning.

## Avoid during the live presentation

- Do not press **Reset shared records** or **Restore journey** mid-talk.
- Do not change the **Personal demo clock** on the Recovery Plan.
- Do not start a **Protected Work** practice unless you can wait 2 real minutes for its timer.
- Do not switch between `localhost` and `127.0.0.1`.
- Shield blocking only affects pages opened after you start it. Reload any YouTube tab that was already open.

## Resetting

| Goal | Action on `demo.html` |
| --- | --- |
| Rania back to the prepared state | **Restore journey**. Her current private keys are saved to a dated `deepsprout-demo-backup-v1:p-rania:<time>` key first, and only her keys are touched. |
| Ahmad back to the seeded story | **Restore seeded story**. His changes are backed up first. |
| Partner records back to seed | **Reset shared records**. Only works on a local server; private journals are kept. |

Integrity checks for the scenario run with:

```sh
node --test Client/tests/demo-scenario.test.mjs
```

The checks cover:
- valid instrument contracts
- attempt-linked completions
- the missed day
- review cycle and week references
- eligibility-based level-up
- Garden source keys
- no Shield telemetry
- operational records untouched
- the Person A/B boundary
