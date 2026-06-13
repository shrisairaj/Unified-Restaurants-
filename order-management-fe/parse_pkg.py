import json
from pathlib import Path
p = Path('node_modules/css-loader/package.json')
print('path', p)
with p.open('r', encoding='utf-8') as f:
    data = json.load(f)
print('name', data.get('name'), 'version', data.get('version'))
