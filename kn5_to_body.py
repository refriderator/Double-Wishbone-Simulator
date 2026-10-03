#!/usr/bin/env python3
"""Turns an Assetto Corsa .kn5 model into assets/body-model.js, the car body shown in the simulator's 3D view.

    python3 tools/kn5_to_body.py path/to/model_lod_d.kn5 [--skip tyre,tire,ae031]

What it does: reads every mesh, drops the wheels (the simulator draws its own), turns the model so x is forward,
y is up and z is to the right, and puts the origin at mid-wheelbase at wheel-centre height. Needs only Python 3.
A low-detail LOD file (a few thousand triangles) is the right input; the full model is far too heavy."""
import struct, sys, base64, json, pathlib

def parse(path):
    b = pathlib.Path(path).read_bytes(); o = [6]
    if b[:6] != b'sc6969': raise SystemExit('not a kn5 file')
    def rd(fmt):
        v = struct.unpack_from('<' + fmt, b, o[0]); o[0] += struct.calcsize(fmt); return v if len(v) > 1 else v[0]
    def text():
        n = rd('i'); t = b[o[0]:o[0] + n].decode('utf8', 'replace'); o[0] += n; return t
    ver = rd('i')
    if ver > 5: rd('i')
    for _ in range(rd('i')):                       # embedded textures: skipped
        rd('i'); text(); o[0] += rd('i')
    mats = []
    for _ in range(rd('i')):                       # materials: only the names are used
        name = text(); text(); rd('h')
        if ver > 4: rd('i')
        for _ in range(rd('i')): text(); rd('f'); o[0] += 36
        for _ in range(rd('i')): text(); rd('i'); text()
        mats.append(name)
    meshes = []
    def mul(A, B): return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
    def node(W):
        kind = rd('i'); name = text(); kids = rd('i'); o[0] += 1
        if kind == 1:
            m = rd('16f'); W = mul([list(m[i * 4:i * 4 + 4]) for i in range(4)], W)      # row vectors: v' = v . M
        elif kind in (2, 3):
            o[0] += 3
            stride = 44
            if kind == 3:
                for _ in range(rd('i')): text(); o[0] += 64
                stride = 76
            nv = rd('i'); v0 = o[0]; o[0] += nv * stride
            ni = rd('i'); idx = struct.unpack_from('<%dH' % ni, b, o[0]); o[0] += ni * 2
            mat = rd('i'); rd('i')
            o[0] += 25 if kind == 2 else 8
            pos = []
            for i in range(nv):
                x, y, z = struct.unpack_from('<3f', b, v0 + i * stride)
                pos.append(tuple(x * W[0][j] + y * W[1][j] + z * W[2][j] + W[3][j] for j in range(3)))
            meshes.append(dict(name=name, mat=mats[mat], pos=pos, idx=idx))
        else:
            raise SystemExit('unknown node type %d' % kind)
        for _ in range(kids): node(W)
    node([[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)])
    return meshes

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args: raise SystemExit(__doc__)
    skip = ['tyre', 'tire', 'ae031']          # ae031 is this mod's wheel-rim mesh
    for a in sys.argv[1:]:
        if a.startswith('--skip'): skip = sys.argv[sys.argv.index(a) + 1].lower().split(',') if a == '--skip' else a.split('=')[1].lower().split(',')
    meshes = parse(args[0])
    is_tyre = lambda m: any(t in (m['name'] + ' ' + m['mat']).lower() for t in ('tyre', 'tire'))
    tyres = [p for m in meshes if is_tyre(m) for p in m['pos']]
    if not tyres: raise SystemExit('no tyre mesh found, so the wheel positions are unknown')
    # kn5: y up, z forward, x to the left. Wheel centres give the axle positions.
    zmid = sum(p[2] for p in tyres) / len(tyres)
    front = [p for p in tyres if p[2] > zmid]; rear = [p for p in tyres if p[2] <= zmid]
    mid = lambda pts, k: (min(p[k] for p in pts) + max(p[k] for p in pts)) / 2
    zf, zr, ywc = mid(front, 2), mid(rear, 2), mid(tyres, 1)
    keep = [m for m in meshes if not any(s and s in (m['name'] + ' ' + m['mat']).lower() for s in skip)]
    pos, idx = [], []
    for m in keep:
        base = len(pos)
        pos += [(p[2] - (zf + zr) / 2, p[1] - ywc, -p[0]) for p in m['pos']]      # x forward, y up, z right
        idx += [base + i for i in m['idx']]
    if len(pos) > 65535: raise SystemExit('too many vertices (%d): use a lower-detail LOD file' % len(pos))
    lo = [min(p[k] for p in pos) for k in range(3)]; size = [max(p[k] for p in pos) - lo[k] or 1 for k in range(3)]
    q = struct.pack('<%dH' % (len(pos) * 3), *[round((p[k] - lo[k]) / size[k] * 65535) for p in pos for k in range(3)])
    model = dict(source=pathlib.Path(args[0]).name, wheelbase=round(zf - zr, 4), tris=len(idx) // 3,
                 min=[round(v, 5) for v in lo], size=[round(v, 5) for v in size],
                 pos=base64.b64encode(q).decode(), idx=base64.b64encode(struct.pack('<%dH' % len(idx), *idx)).decode())
    out = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'body-model.js'
    out.write_text('/* Car body for the 3D view. Made by tools/kn5_to_body.py from ' + model['source'] + '.\n'
                   '   Frame: x forward, y up, z right, origin at mid-wheelbase at wheel-centre height, metres.\n'
                   '   pos: 16-bit x, y, z per vertex (0..65535 across min..min+size). idx: 16-bit triangle indices. */\n'
                   'window.BODY_MODEL=' + json.dumps(model, separators=(',', ':')) + ';\n', encoding='utf8')
    print('wrote', out, '|', len(pos), 'vertices,', model['tris'], 'triangles | wheelbase', model['wheelbase'], 'm | kept', len(keep), 'of', len(meshes), 'meshes |', out.stat().st_size, 'bytes')

if __name__ == '__main__': main()
