import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = "images/home.png";
const OUT = "images/home-optimized";

fs.mkdirSync(OUT, { recursive: true });

async function make(size) {
  const outfile = path.join(OUT, `home-${size}.webp`);
  await sharp(SRC)
    .resize({ width: size, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(outfile);
  console.log("✅ Created:", outfile);
}

await make(600);   // mobile
await make(900);   // tablets / smaller laptops
await make(1400);  // desktops / large screens

console.log("🎉 Done. Optimized home images saved in:", OUT);