import json
import base64
import gzip
import os
import re

with open('mockup.html', 'r') as f:
    content = f.read()

match = re.search(r'<script type="__bundler/manifest">(.*?)</script>', content, re.DOTALL)
if match:
    manifest_str = match.group(1)
    manifest = json.loads(manifest_str)
    
    os.makedirs('mockup_source', exist_ok=True)
    
    for uuid, entry in manifest.items():
        data = base64.b64decode(entry['data'])
        if entry.get('compressed'):
            data = gzip.decompress(data)
        
        ext = '.js'
        if 'babel' in entry['mime'] or 'jsx' in entry['mime']:
            ext = '.jsx'
            
        with open(f'mockup_source/{uuid}{ext}', 'wb') as out:
            out.write(data)
            
    print("Unpacked successfully.")
else:
    print("Manifest not found")
