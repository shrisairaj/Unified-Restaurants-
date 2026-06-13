import os
from pathlib import Path
root = Path('node_modules')
count = 0
modified = []
for p in root.rglob('package.json'):
    try:
        b = p.read_bytes()
    except Exception:
        continue
    idx = b.find(b'{')
    if idx > 0:
        p.write_bytes(b[idx:])
        count += 1
        modified.append(str(p))
print(f"Fixed {count} package.json files under node_modules")
for m in modified:
    print(m)
