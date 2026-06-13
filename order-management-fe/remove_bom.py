import os
from pathlib import Path

root = Path('src')
count = 0
modified = []
for ext in ('.js', '.jsx', '.ts', '.tsx', '.json'):
    for p in root.rglob(f'*{ext}'):
        try:
            b = p.read_bytes()
        except Exception:
            continue
        if b.startswith(b'\xef\xbb\xbf'):
            p.write_bytes(b[3:])
            count += 1
            modified.append(str(p))

print(f"Removed BOM from {count} files")
for m in modified:
    print(m)
