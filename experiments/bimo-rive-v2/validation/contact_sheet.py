"""Optional Pillow review sheets; does not change rig artwork or V1 files."""
from pathlib import Path
from PIL import Image, ImageDraw

BUILD = Path(__file__).resolve().parents[1] / 'build'
NAMES = ['intro-focus', 'deep-focus', 'notice', 'concerned', 'overwhelmed']

def sheet(files, output, cols=5, width=350, height=430):
    rows = (len(files)+cols-1)//cols
    canvas = Image.new('RGB', (width*cols, (height+26)*rows), '#f8f8f4')
    draw = ImageDraw.Draw(canvas)
    for i, file in enumerate(files):
        picture = Image.open(BUILD/file).convert('RGB')
        picture.thumbnail((width, height))
        x, y = i%cols*width, i//cols*(height+26)
        canvas.paste(picture, (x,y))
        draw.text((x+8,y+height+5), file.replace('.png',''), fill='#254a35')
    canvas.save(BUILD/output)

sheet([name+'.png' for name in NAMES], 'states-v2.png')
sheet([f'{name}-target-{target}.png' for name in NAMES[2:]
       for target in ['left','right','above-left','below-right']], 'gaze-extremes.png', 4,280,344)
sheet([name+'-left.png' for name in NAMES[2:]], 'mirrored-staging.png',3)
sheet([f'transition-{frame}.png' for frame in [12,24,42]], 'transition-review.png',3)
canvas = Image.new('RGB', (1750,280), '#f8f8f4')
draw = ImageDraw.Draw(canvas)
for i,name in enumerate(NAMES):
    picture = Image.open(BUILD/(name+'.png')).crop((0,348,700,860)).resize((350,256))
    canvas.paste(picture,(350*i,0))
    draw.text((350*i+12,263),name,fill='#254a35')
canvas.save(BUILD/'body-silhouettes.png')
old_path = BUILD.parents[1]/'bimo-rive'/'build'/'overwhelmed-after-concerned.png'
if old_path.exists():
    canvas = Image.new('RGB',(700,456),'#f8f8f4');draw = ImageDraw.Draw(canvas)
    for x,path,label in [(0,old_path,'V1 CONCERNED'),(350,BUILD/'concerned.png','V2 CONCERNED')]:
        picture = Image.open(path).convert('RGB');picture.thumbnail((350,430))
        canvas.paste(picture,(x,0));draw.text((x+12,436),label,fill='#254a35')
    canvas.save(BUILD/'v1-v2-concerned.png')
print('Review sheets written to',BUILD)
