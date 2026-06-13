from pathlib import Path
root = Path('node_modules')
found = []
for p in root.rglob('package.json'):
    try:
        b = p.read_bytes()
    except Exception:
        continue
    if b.startswith(b"\xef\xbb\bf"):
        found.append(str(p))
print('bom_count', len(found))
for f in found:
    print(f)
