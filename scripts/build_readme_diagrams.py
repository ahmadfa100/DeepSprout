#!/usr/bin/env python3
"""Generate the editable, brand-aligned SVG diagrams used by README.md."""

from html import escape
from pathlib import Path


OUT = Path(__file__).resolve().parents[1] / "docs/assets/readme"
OUT.mkdir(parents=True, exist_ok=True)
INK, MUTED, GREEN, SAGE, PALE, IVORY = "#173c33", "#60746a", "#168557", "#dcead9", "#edf4e9", "#fffaf1"


def txt(x, y, value, size=24, color=INK, weight=500, anchor=None):
    anchor_attr = f' text-anchor="{anchor}"' if anchor else ""
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="DM Sans,Arial,sans-serif" font-size="{size}" font-weight="{weight}"{anchor_attr}>{escape(value)}</text>'


def rect(x, y, w, h, fill="#fffefa", rx=22, stroke="#d8e6d7"):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'


def line(x1, y1, x2, y2, dashed=False):
    dash = ' stroke-dasharray="8 9"' if dashed else ""
    return f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{GREEN}" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow)"{dash}/>'


def card(x, y, w, h, no, title, subtitle, fill="#fffefa"):
    return "".join((rect(x, y, w, h, fill), txt(x+24, y+32, no, 14, GREEN, 700),
                    txt(x+24, y+70, title, 24, INK, 700), txt(x+24, y+101, subtitle, 16, MUTED)))


def shell(title, description, width, height, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="{GREEN}"/></marker></defs>
<rect width="{width}" height="{height}" rx="30" fill="{IVORY}"/>
{body}</svg>'''


def write(name, title, desc, w, h, body):
    (OUT / name).write_text(shell(title, desc, w, h, body), encoding="utf-8")


# Hero is a concept illustration, not an application screenshot.
hero = [f'<path d="M0 335 C240 240 310 420 545 332 S860 242 1200 347 V500 H0Z" fill="{PALE}"/>',
        '<circle cx="1010" cy="110" r="150" fill="#e2edd8"/>',
        txt(62, 79, "DEEPSPROUT / DIGITAL WELLBEING", 18, GREEN, 700),
        txt(62, 169, "Less scrolling.", 59, INK, 700), txt(62, 237, "More living.", 59, INK, 700),
        txt(65, 292, "A personal path from short-form feeds to meaningful days.", 23, MUTED),
        rect(810, 80, 250, 320, "#fffefa", 36),
        '<rect x="827" y="98" width="216" height="284" rx="25" fill="#f0f3eb"/>',
        '<rect x="846" y="120" width="178" height="70" rx="12" fill="#dce6d8"/>',
        '<rect x="846" y="200" width="178" height="70" rx="12" fill="#e6ebe3"/>',
        '<rect x="846" y="280" width="178" height="70" rx="12" fill="#ebeee8"/>',
        '<path d="M902 404 C868 359 910 330 932 306 C953 281 962 257 954 232" fill="none" stroke="#477c59" stroke-width="8" stroke-linecap="round"/>',
        '<path d="M930 304 C884 306 882 263 892 251 C923 252 938 270 930 304Z" fill="#8eb892"/>',
        '<path d="M950 268 C959 233 991 229 1002 240 C996 263 979 279 950 268Z" fill="#9dc6a0"/>',
        '<circle cx="760" cy="395" r="9" fill="#d8a96a"/><circle cx="1125" cy="324" r="6" fill="#8eb892"/>']
write("deepsprout-hero.svg", "DeepSprout — less scrolling, more living", "Editorial illustration of a short-form feed giving way to a growing sprout.", 1200, 500, "".join(hero))

# Personal journey: first-run path over a nested weekly cycle.
body = [txt(48, 64, "One journey, many deliberate steps", 32, INK, 700),
        txt(48, 96, "Baseline establishes a starting point; weekly decisions shape each Recovery Cycle.", 19, MUTED)]
steps = [("01", "Create account", "One person identity"), ("02", "Meet Bimo", "Welcome and context"),
         ("03", "Personal setup", "Goal and availability"), ("04", "Four baselines", "Lab starting measures"),
         ("05", "Plan preview", "Review and activate")]
for i, (n, title, sub) in enumerate(steps):
    x = 45 + i*230
    body.append(card(x, 132, 210, 126, n, title, sub))
    if i < 4: body.append(line(x+211, 196, x+228, 196))
body += [rect(45, 308, 1110, 179, PALE, 25, SAGE), txt(72, 354, "Recovery Cycle · usually 28 days", 27, INK, 700),
         txt(72, 389, "Weekly actions", 21, GREEN, 700), txt(307, 389, "→  Review actual evidence", 21, INK, 600),
         txt(615, 389, "→  Accept / keep / adjust", 21, INK, 600),
         txt(73, 439, "Lab rechecks have their own weekly window; Insights retain source and uncertainty.", 18, MUTED),
         txt(48, 545, "Cycle review → next cycle, maintenance, pause or archive; history stays with the journey.", 21, INK, 600)]
write("recovery-cycle.svg", "DeepSprout personal recovery journey", "Account creation, Bimo, setup, baselines and plan activation lead to weekly actions and review within a continuous journey.", 1200, 585, "".join(body))

body = [txt(48, 68, "Four Meaningful Practices", 34, INK, 700), txt(48, 102, "Distinct activities, evidence types and levels — selected for the person's plan.", 20, MUTED)]
practices = [("01 / READ", "Depth Practice", "Passage + comprehension", "System-scored answers"),
             ("02 / LISTEN", "Listening & Recall", "Original audio + questions", "Playback + scored recall"),
             ("03 / MAKE", "Practical Micro-Challenge", "Concrete prompt + outcome", "Self-reported artifact"),
             ("04 / DO", "Protected Work", "Intentional work session", "Time + self-reported result")]
for i,(tag,name,desc,evidence) in enumerate(practices):
    x,y = 45+(i%2)*570, 145+(i//2)*205
    body += [rect(x,y,540,180), txt(x+28,y+38,tag,16,GREEN,700),txt(x+28,y+80,name,29,INK,700),
             txt(x+28,y+116,desc,19,MUTED),txt(x+28,y+151,evidence,17,GREEN,600)]
write("meaningful-practices.svg", "Four DeepSprout Meaningful Practices", "Depth Practice, Listening and Recall, Practical Micro-Challenge and Protected Work each have different evidence.", 1200, 585, "".join(body))

body=[txt(48,65,"Connected workspaces",34,INK,700),txt(48,100,"One person's journey can connect to programs, initiatives and experiences.",20,MUTED)]
roles=[("Individual","Personal journey"),("Coach","Programs + reviews"),("Invited Student","Group tasks"),
       ("Institution","Initiatives"),("Supervisor","Attendance + evidence"),("Outdoor Provider","Experiences + bookings")]
for i,(name,sub) in enumerate(roles):
    x,y=45+(i%3)*380,145+(i//3)*180
    body += [rect(x,y,350,142),txt(x+23,y+56,name,27,INK,700),txt(x+23,y+93,sub,18,MUTED)]
for y in (216,396):
    body += [line(397,y,423,y),line(777,y,803,y)]
body += [rect(45,535,1110,90,PALE),txt(69,577,"Platform Admin",25,INK,700),
         txt(305,576,"approval · publishing · governance · policy · audit views",20,MUTED),
         txt(48,668,"Roles are scoped grants. Subscription entitlements are a separate concern.",20,GREEN,600)]
for x in (220,600,980):
    body.append(line(x,533,x,471))
write("workspaces-diagram.svg", "DeepSprout workspaces", "Individual, Coach, Student, Institution, Supervisor and Outdoor Provider share platform records under Admin governance.", 1200, 710, "".join(body))

body=[txt(48,65,"Architecture: present and target",34,INK,700),txt(48,103,"The repository is a static, browser-local demonstration today.",20,MUTED),
      rect(45,139,1110,191),txt(70,182,"CURRENT / STATIC DEMO",18,GREEN,700),
      txt(70,230,"HTML + CSS + JavaScript",25,INK,700),txt(415,230,"→",27,GREEN,700),
      txt(475,230,"Browser-local journals + shared records",23,INK,600),
      txt(70,282,"Client/ pages, assets and hash-routed workspaces; local preview server only.",19,MUTED),
      rect(45,370,1110,266,PALE),txt(70,414,"TARGET / PRODUCTION ARCHITECTURE",18,GREEN,700),
      txt(70,470,"Angular client",25,INK,700),txt(318,470,"→",27,GREEN,700),
      txt(372,470,"ASP.NET Core API + services",24,INK,700),txt(735,470,"→",27,GREEN,700),
      txt(790,470,"EF Core + SQL Server",23,INK,700),
      txt(70,523,"Authenticated identity · role and resource scopes · versioned transitions · audit trail",19,MUTED),
      txt(70,569,"Optional validated browser extension",21,INK,600),
      txt(70,601,"Separate hosting is required for APIs and data; GitHub Pages serves static files only.",18,MUTED)]
write("architecture.svg", "DeepSprout current and target architecture", "Current browser-local HTML, CSS and JavaScript compared with proposed Angular, ASP.NET Core, Entity Framework Core and SQL Server services.", 1200, 680, "".join(body))

body=[txt(48,65,"Operational cycles share original records",33,INK,700),txt(48,100,"Publication, participation, evidence and review cross workspace boundaries.",20,MUTED)]
flows=[("INSTITUTION", "Initiative published", "Apply · assign · attend", "Review · report · Group Garden"),
       ("INDEPENDENT COACH", "Coach approved · Program live", "Invite Student · submit task", "Review · report · Group Garden"),
       ("OUTDOOR PROVIDER", "Experience published", "Book / wait · attend", "Evaluate · complete · report")]
for i,(tag,a,b,c) in enumerate(flows):
    y=145+i*162
    body += [rect(45,y,1110,139,"#fffefa" if i!=1 else PALE),txt(68,y+33,tag,16,GREEN,700),
             txt(69,y+75,a,19,INK,600),txt(447,y+75,b,19,INK,600),txt(819,y+75,c,19,INK,600),
             line(393,y+70,432,y+70),line(767,y+70,805,y+70)]
body += [txt(48,682,"Admin governs approvals and publishing; Supervisors verify attendance and excuses where assigned.",19,MUTED)]
write("operational-workflows.svg", "DeepSprout operational workflows", "Institution, independent Coach and Outdoor Provider lifecycles link publication, participation, review and outcomes.", 1200, 720, "".join(body))

# An explanatory Garden illustration. It depicts the current four practice
# sources without pretending to be a captured application screenshot.
body=[txt(48,66,"Growth has a source",34,INK,700),txt(48,103,"The Garden reflects qualifying practice and verified participation, not time spent in the app.",20,MUTED),
      rect(45,140,1110,320,"#fffefa",28),
      '<path d="M75 407 Q600 435 1125 407" fill="none" stroke="#d1dece" stroke-width="8"/>']
for x,height,label in [(190,75,"Depth"),(460,110,"Listening"),(735,88,"Challenge"),(1000,130,"Protected Work")]:
    y=395-height
    body += [f'<path d="M{x} 403 V{y}" stroke="#477c59" stroke-width="8" stroke-linecap="round"/>',
             f'<path d="M{x} {y+42} C{x-45} {y+30} {x-48} {y-8} {x-6} {y+9} L{x} {y+42}Z" fill="#a7c99e"/>',
             f'<path d="M{x} {y+22} C{x+45} {y+12} {x+49} {y-25} {x+8} {y-5} L{x} {y+22}Z" fill="#6ea676"/>',
             txt(x,445,label,19,INK,600,"middle")]
body += [txt(48,523,"Practice tree sources",22,INK,700),txt(48,555,"Valid, eligible original attempts; one source counts once.",18,MUTED),
         txt(650,523,"Other earned details",22,INK,700),txt(650,555,"Routine, attendance and completion follow separate rules.",18,MUTED)]
write("garden-growth.svg", "DeepSprout Garden earned growth", "Four practice types grow four trees from qualifying evidence, while other participation can earn bounded details.", 1200, 600, "".join(body))
print(f"Wrote 7 diagrams to {OUT}")
