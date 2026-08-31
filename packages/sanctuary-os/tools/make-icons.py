#!/usr/bin/env python3
"""Generate the Sanctuary OS extension icons.

The mark is the design system in miniature: a superellipse of ground that runs
from Zenith cream at the top edge to Rest forest at the bottom, with a gold sun
sitting just above center. The arc of the sun, compressed into 16 pixels.

Written against the standard library only -- zlib and struct are enough to
write a PNG, and a build step that needs Pillow installed is a build step that
stops working the first time someone clones this on a clean machine. Rendering
is supersampled 4x and box-filtered down, which is where the antialiasing comes
from; there is no drawing library here doing it for us.

    python3 tools/make-icons.py
"""

import os
import struct
import zlib

SS = 4  # supersample factor
SIZES = (16, 32, 48, 128)
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "icons")

CREAM = (0xFA, 0xF6, 0xEC)  # Zenith  -- base cream
GOLDEN = (0xF7, 0xEB, 0xD7)  # Descent -- warm cream
EARTH = (0x8A, 0x5A, 0x3B)  # Descent -- earthy brown
FOREST = (0x13, 0x20, 0x1A)  # Rest    -- deep forest
SUN = (0xD4, 0xA7, 0x2C)  # Zenith  -- true gold
SUN_EDGE = (0xE0, 0x8B, 0x3C)  # Descent -- orange-gold

# Cream to forest is a long way to travel, and a straight interpolation between
# them passes straight through a dead grey -- the exact muddiness the palette
# exists to avoid. Earthy Brown sits in the middle as a real stop, so the ramp
# stays saturated the whole way down and reads as dusk rather than as dirt.
GROUND_STOPS = ((0.00, CREAM), (0.42, GOLDEN), (0.72, EARTH), (1.00, FOREST))


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def ground(t):
    """Vertical gradient down the arc of the day: midday, golden hour, night."""
    for (t0, c0), (t1, c1) in zip(GROUND_STOPS, GROUND_STOPS[1:]):
        if t <= t1:
            return lerp(c0, c1, (t - t0) / (t1 - t0))
    return GROUND_STOPS[-1][1]


def render(size):
    """Return RGBA bytes for one icon, rendered at SS x and box-filtered down."""
    big = size * SS
    acc = [[[0, 0, 0, 0] for _ in range(size)] for _ in range(size)]

    # Sun geometry, in units of the full canvas.
    cx, cy = 0.5, 0.40
    sun_r = 0.20

    for py in range(big):
        v = (py + 0.5) / big
        for px in range(big):
            u = (px + 0.5) / big

            # Superellipse body: |x|^4 + |y|^4 <= 1. Rounder than a rounded
            # rect, squarer than a circle -- and no hard corners anywhere,
            # which is the whole point of the system.
            nx, ny = (u - 0.5) * 2, (v - 0.5) * 2
            if (abs(nx) ** 4 + abs(ny) ** 4) > 0.92:
                continue

            r, g, b = ground(v)

            d = ((u - cx) ** 2 + (v - cy) ** 2) ** 0.5
            if d <= sun_r:
                # Warm the sun toward its edge so it reads as light rather
                # than as a flat sticker of a circle.
                r, g, b = lerp(SUN, SUN_EDGE, min(1.0, d / sun_r))

            cell = acc[py // SS][px // SS]
            cell[0] += r
            cell[1] += g
            cell[2] += b
            cell[3] += 255

    samples = SS * SS
    out = bytearray()
    for row in acc:
        out.append(0)  # PNG filter type 0 (None)
        for r, g, b, a in row:
            if a == 0:
                out += bytes(4)
                continue
            # Average color over covered samples only, then let coverage drive
            # alpha. Averaging color over *all* samples would drag edge pixels
            # toward black and give the mark a dirty halo.
            covered = a / 255
            out += bytes(
                (
                    round(r / covered),
                    round(g / covered),
                    round(b / covered),
                    round(a / samples),
                )
            )
    return bytes(out)


def chunk(tag, data):
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path, size, raw):
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as fh:
        fh.write(png)
    return len(png)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        path = os.path.join(OUT_DIR, "icon-%d.png" % size)
        written = write_png(path, size, render(size))
        print("wrote %s (%d bytes)" % (os.path.relpath(path), written))


if __name__ == "__main__":
    main()
