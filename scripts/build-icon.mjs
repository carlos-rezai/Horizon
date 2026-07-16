/**
 * Builds the Windows app icon from the canonical brand mark.
 *
 *   docs/handoff/brand/horizon-icon.svg   (source of truth)
 *     -> docs/handoff/brand/horizon-icon-{256,512,1024}.png
 *     -> src/assets/icon.ico              (16/32/48/64/128/256, PNG-compressed)
 *
 * Supersedes build-icon.ps1, which started from the 1024 PNG and so could not
 * pick up brand SVG edits — the PNG had to be re-rendered by hand in a design
 * tool. electron-builder reads the .ico via `build.icon`.
 *
 * Run: node scripts/build-icon.mjs
 */
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = path.join(root, "docs/handoff/brand/horizon-icon.svg");
const ico = path.join(root, "src/assets/icon.ico");

const ICO_SIZES = [16, 32, 48, 64, 128, 256];
const PREVIEW_SIZES = [256, 512, 1024];

/** Renders the brand SVG to a square RGBA PNG buffer. */
function render(size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/**
 * Packs PNG buffers into an ICO. Each directory entry is 16 bytes and image
 * data follows all entries; a 256px image is encoded as 0 in the byte-wide
 * width/height fields.
 */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const images = [];
for (const size of ICO_SIZES) {
  images.push({ size, data: await render(size) });
}
fs.writeFileSync(ico, packIco(images));

for (const size of PREVIEW_SIZES) {
  const file = path.join(root, `docs/handoff/brand/horizon-icon-${size}.png`);
  fs.writeFileSync(file, await render(size));
}

const kb = (fs.statSync(ico).size / 1024).toFixed(1);
console.info(`icon.ico: ${ICO_SIZES.join(", ")} (${kb} KB)`);
