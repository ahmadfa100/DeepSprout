#!/usr/bin/env python3
"""Make a labeled review sheet; never modifies source reference or capture images."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import argparse
client=Path(__file__).resolve().parents[2]
a=argparse.ArgumentParser();a.add_argument('--gold',type=Path,default=client/'references/hero-gold');a.add_argument('--size',default='1440x900');args=a.parse_args()
out=client/'references/hero-v2-validation';frames=['00-arrival','01-lift','02-vertical-alignment','03-perfect-balance','04-grow','05-living-idle']
w,h,label=768,480,34
sheet=Image.new('RGB',(w*2,(h+label)*6),'#f7f8f2');draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',19)
refs={f.name.strip():f for f in args.gold.glob('*.png')}
for i,name in enumerate(frames):
 y=i*(h+label)
 for col,prefix,file in [(0,'GOLD',refs[name+'.png']),(1,'V2 LIVE',out/f'{args.size}-{name}.png')]:
  draw.text((col*w+14,y+8),f'{prefix}  •  {name}',fill='#213e35',font=font)
  image=Image.open(file).convert('RGB').resize((w,h),Image.Resampling.LANCZOS)
  sheet.paste(image,(col*w,y+label))
sheet.save(out/f'{args.size}-gold-comparison.jpg',quality=93)
print(out/f'{args.size}-gold-comparison.jpg')
