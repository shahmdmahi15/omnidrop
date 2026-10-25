import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgBuffer = fs.readFileSync('public/logo.svg');
const bannerSvgBuffer = fs.readFileSync('public/og-banner.svg');

async function generate() {
  console.log('Generating crisp raster icons from logo.svg...');

  // 1. Generate PNGs of various sizes
  const sizes = [16, 32, 48, 64, 128, 180, 192, 512];
  for (const s of sizes) {
    const pngBuf = await sharp(svgBuffer)
      .resize(s, s)
      .png()
      .toBuffer();

    if (s === 16) fs.writeFileSync('public/favicon-16x16.png', pngBuf);
    if (s === 32) fs.writeFileSync('public/favicon-32x32.png', pngBuf);
    if (s === 180) {
      fs.writeFileSync('public/apple-touch-icon.png', pngBuf);
      fs.writeFileSync('src/app/apple-icon.png', pngBuf);
    }
    if (s === 192) fs.writeFileSync('public/android-chrome-192x192.png', pngBuf);
    if (s === 512) fs.writeFileSync('public/android-chrome-512x512.png', pngBuf);
  }

  // 2. Generate multi-resolution ICO file (contains 16x16, 32x32, 48x48)
  // An ICO file header + directory + PNG images
  const b16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const b32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const b48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  const icoBuffer = createIco([
    { size: 16, buffer: b16 },
    { size: 32, buffer: b32 },
    { size: 48, buffer: b48 }
  ]);

  fs.writeFileSync('public/favicon.ico', icoBuffer);
  fs.writeFileSync('src/app/favicon.ico', icoBuffer);

  // 3. Generate PNG OG banner (1200x630)
  await sharp(bannerSvgBuffer)
    .resize(1200, 630)
    .png()
    .toFile('public/og-banner.png');

  console.log('All favicon and icon assets generated successfully!');
}

function createIco(images) {
  // Simple ICO builder from PNG buffers
  const numImages = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirSize = 16 * numImages;
  let offset = 6 + dirSize;

  const dirEntries = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image size in bytes
    entry.writeUInt32LE(offset, 12); // offset of image data

    dirEntries.push(entry);
    imageBuffers.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
