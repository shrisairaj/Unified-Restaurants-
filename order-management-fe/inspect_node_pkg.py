from pathlib import Path
p = Path(r'd:\unified restaurent\Unified-Restaurants-\order-management-fe\node_modules\css-loader\package.json')
b = p.read_bytes()
print(repr(b[:40]))
print('len', len(b))
