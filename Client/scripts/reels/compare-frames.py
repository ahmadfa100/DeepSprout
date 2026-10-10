#!/usr/bin/env python3
"""Build a labeled gold/live contact sheet; resize only for side-by-side review."""
from pathlib import Path
from PIL import Image, ImageDraw
client=Path(__file__).resolve().parents[2]
out=client/'references/reels-validation'
names=['00-post-hero-calm','01-tiny-distraction','02-temptation-orbit','03-first-collapse','04-swarm-spiral','05-black-hole-burst','06-the-trap']
width,height,gap=668,390,22
sheet=Image.new('RGB',(width*2+gap*3,(height+62)*7+gap),(17,15,28));draw=ImageDraw.Draw(sheet)
for i,name in enumerate(names):
    y=gap+i*(height+62)
    draw.text((gap,y),name.replace('-',' ').upper(),fill='#e6d5ff')
    for j,(folder,prefix) in enumerate([('reels-gold',''),('reels-validation','1440x900-')]):
        image=Image.open(client/'references'/folder/(prefix+name+'.png')).convert('RGB')
        image.thumbnail((width,height),Image.Resampling.LANCZOS)
        x=gap+j*(width+gap)
        sheet.paste(image,(x,y+23))
        draw.text((x,y+height+30),'GOLD MASTER' if j==0 else 'LIVE / 1440 x 900',fill='#aa93c0')
sheet.save(out/'gold-comparison.jpg',quality=91)
print(out/'gold-comparison.jpg')
