/** Tiny uncompressed RGB PNGs so mock image tiles render without binary assets. */

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
  }
  return ~crc >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(new TextEncoder().encode(type), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

function adler32(data: Uint8Array): number {
  let a = 1
  let b = 0
  for (const byte of data) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

/** zlib wrapper around raw deflate stored blocks (no compression). */
function zlibStore(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.from([0x78, 0x01])]
  if (data.length === 0) {
    parts.push(Uint8Array.from([0x01, 0x00, 0x00, 0xff, 0xff]))
  }
  let offset = 0
  while (offset < data.length) {
    const end = Math.min(offset + 65535, data.length)
    const length = end - offset
    const block = new Uint8Array(5 + length)
    block[0] = end === data.length ? 1 : 0
    block[1] = length & 0xff
    block[2] = (length >> 8) & 0xff
    const nlen = ~length & 0xffff
    block[3] = nlen & 0xff
    block[4] = (nlen >> 8) & 0xff
    block.set(data.subarray(offset, end), 5)
    parts.push(block)
    offset = end
  }
  const sum = new Uint8Array(4)
  new DataView(sum.buffer).setUint32(0, adler32(data))
  parts.push(sum)
  const total = parts.reduce((count, part) => count + part.length, 0)
  const out = new Uint8Array(total)
  let cursor = 0
  for (const part of parts) {
    out.set(part, cursor)
    cursor += part.length
  }
  return out
}

function hueColor(key: string): [number, number, number] {
  let hash = 0
  for (const char of key) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  const hue = hash % 360
  const sat = 0.45
  const light = 0.52
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const hp = hue / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const m = light - c / 2
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

/** A distinct solid-color square for each mock image key. */
export function mockPng(key: string, size = 96): Uint8Array {
  const [red, green, blue] = hueColor(key)
  const stride = 1 + size * 3
  const raw = new Uint8Array(size * stride)
  for (let y = 0; y < size; y++) {
    const row = y * stride
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 3
      const shade = x % 12 === 0 || y % 12 === 0 ? 0.82 : 1
      raw[i] = Math.round(red * shade)
      raw[i + 1] = Math.round(green * shade)
      raw[i + 2] = Math.round(blue * shade)
    }
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, size)
  view.setUint32(4, size)
  ihdr[8] = 8
  ihdr[9] = 2
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const parts = [
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlibStore(raw)),
    chunk("IEND", new Uint8Array()),
  ]
  const total = parts.reduce((count, part) => count + part.length, 0)
  const png = new Uint8Array(total)
  let cursor = 0
  for (const part of parts) {
    png.set(part, cursor)
    cursor += part.length
  }
  return png
}
