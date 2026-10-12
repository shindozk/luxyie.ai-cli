import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ToolExecutor } from '../../src/tools/executor.js';

type Dimensions = { width: number; height: number } | null;

// The dimension parser is private; reach it through the public read_image tool
// which always reports the parsed size when it succeeds.
async function readDimensions(filePath: string): Promise<Dimensions> {
  const executor = new ToolExecutor({ workingDirectory: os.tmpdir() });
  const result = await executor.execute('read_image', { path: filePath });
  const json = result.slice(result.indexOf('{'));
  try {
    const parsed = JSON.parse(json) as { dimensions?: Dimensions };
    return parsed.dimensions ?? null;
  } catch {
    return null;
  }
}

let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'luxyie-img-'));
});

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('image header dimensions', () => {
  it('reads PNG dimensions from the IHDR chunk', async () => {
    // 1x1 transparent PNG (width=1, height=1)
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+/9n4AAAAASUVORK5CYII=',
      'base64',
    );
    const file = path.join(dir, 'pixel.png');
    await fs.writeFile(file, png);

    expect(await readDimensions(file)).toEqual({ width: 1, height: 1 });
  });

  it('reads GIF dimensions from the logical screen descriptor', async () => {
    // 2x3 GIF87a: width and height are little-endian uint16 at offsets 6 and 8.
    const gif = Buffer.alloc(13);
    gif.write('GIF87a', 0, 'ascii');
    gif.writeUInt16LE(2, 6);
    gif.writeUInt16LE(3, 8);
    const file = path.join(dir, 'tiny.gif');
    await fs.writeFile(file, gif);

    expect(await readDimensions(file)).toEqual({ width: 2, height: 3 });
  });

  it('reads BMP dimensions from the info header', async () => {
    const bmp = Buffer.alloc(26);
    bmp.write('BM', 0, 'ascii');
    bmp.writeUInt32LE(64, 18);
    bmp.writeUInt32LE(32, 22);
    const file = path.join(dir, 'block.bmp');
    await fs.writeFile(file, bmp);

    expect(await readDimensions(file)).toEqual({ width: 64, height: 32 });
  });

  it('reads extended WebP (VP8X) dimensions', async () => {
    const webp = Buffer.alloc(30);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    webp.write('VP8X', 12, 'ascii');
    // VP8X stores width-1 / height-1 as 24-bit little-endian values.
    webp[24] = 99 & 0xff;
    webp[25] = (99 >> 8) & 0xff;
    webp[26] = (99 >> 16) & 0xff;
    webp[27] = 49 & 0xff;
    webp[28] = (49 >> 8) & 0xff;
    webp[29] = (49 >> 16) & 0xff;
    const file = path.join(dir, 'ext.webp');
    await fs.writeFile(file, webp);

    expect(await readDimensions(file)).toEqual({ width: 100, height: 50 });
  });

  it('reads lossless WebP (VP8L) dimensions', async () => {
    const webp = Buffer.alloc(32);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    webp.write('VP8L', 12, 'ascii');
    // VP8L stores width-1 and height-1 packed into one little-endian uint32.
    const width = 40;
    const height = 10;
    const bits = (((height - 1) & 0x3fff) << 14) | ((width - 1) & 0x3fff);
    webp.writeUInt32LE(bits, 21);
    const file = path.join(dir, 'lossless.webp');
    await fs.writeFile(file, webp);

    expect(await readDimensions(file)).toEqual({ width: 40, height: 10 });
  });

  it('returns no dimensions for a file that is too small to hold a header', async () => {
    const file = path.join(dir, 'stub.bin');
    await fs.writeFile(file, Buffer.from([1, 2, 3]));

    expect(await readDimensions(file)).toBeNull();
  });
});
