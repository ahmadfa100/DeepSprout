#!/usr/bin/env python3
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json, argparse
client=Path(__file__).resolve().parents[2]
a=argparse.ArgumentParser();a.add_argument('--sequence',default='normal-transition');args=a.parse_args()
base=client/'references/hero-v2-patch-validation';folder=base/args.sequence
j=json.loads((folder/'metrics.json').read_text());frames=j['frames'];w,h,head=210,258,36
sheet=Image.new('RGB',(w*5,(h+head)*5),'#f5f5eb');draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',14)
for i,row in enumerate(frames):
 x=(i%5)*w;y=(i//5)*(h+head);im=Image.open(folder/f'{i:02}.png').convert('RGBA').resize((w,h),Image.Resampling.LANCZOS)
 sheet.paste(im,(x,y+head),im)
 draw.text((x+10,y+5),f"{row['time']:.3f}s  •  {row['runtime']}",font=font,fill='#183e30')
 draw.text((x+10,y+20),f"painted: {row['pixels']:,}",font=font,fill='#517359')
sheet.save(base/f'{args.sequence}-contact.jpg',quality=95)
print(base/f'{args.sequence}-contact.jpg')
