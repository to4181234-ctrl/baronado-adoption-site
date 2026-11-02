#!/usr/bin/env python3
"""Install fonts from four original user-supplied archives into this project.
No font binaries are distributed within the Next.js source archive.
Usage: python notes/install_user_fonts.py /path/to/MonaFont-otf.zip /path/to/Pretendard-1.3.9.zip '/path/to/Galmuri-v2.40.4 (1).zip' /path/to/GmarketSansOTF.zip
"""
from pathlib import Path
import sys,zipfile
M={
 'MonaFont-otf.zip':{'MonaS/01 Main/MonaS12.otf':'MonaS12-Regular.otf','MonaS/01 Main/MonaS12-Bold.otf':'MonaS12-Bold.otf','Mona/01 Main/Mona12.otf':'Mona12-Regular.otf','Mona/01 Main/Mona12-Bold.otf':'Mona12-Bold.otf'},
 'Pretendard-1.3.9.zip':{'web/variable/woff2/PretendardVariable.woff2':'PretendardVariable.woff2'},
 'Galmuri-v2.40.4 (1).zip':{'GalmuriMono11.woff2':'GalmuriMono11-Regular.woff2'},
 'GmarketSansOTF.zip':{'GmarketSansOTF/GmarketSansLight.otf':'GmarketSansLight.otf','GmarketSansOTF/GmarketSansMedium.otf':'GmarketSansMedium.otf','GmarketSansOTF/GmarketSansBold.otf':'GmarketSansBold.otf'}
}
if len(sys.argv)!=5: raise SystemExit('Provide the 4 original font ZIP paths.')
out=Path(__file__).resolve().parents[1]/'public/fonts/figma';out.mkdir(parents=True,exist_ok=True)
for path in map(Path,sys.argv[1:]):
 with zipfile.ZipFile(path) as z:
  # Uploads may add (1) to filenames; identify archives by their contents.
  matches=[mapping for mapping in M.values() if set(mapping).issubset(z.namelist())]
  if len(matches)!=1:raise SystemExit('Unrecognized or incomplete font ZIP: '+path.name)
  for entry,dest in matches[0].items():
   (out/dest).write_bytes(z.read(entry))
print('Installed', len(list(out.iterdir())),'font files locally.')
