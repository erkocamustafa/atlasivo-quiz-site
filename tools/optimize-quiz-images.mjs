import sharp from "sharp";
import fs from "fs";
import path from "path";

const root = process.cwd();

// İşlenecek klasörler
const folders = [
  {
    src: path.join(root, "images/quizzes"),
    out: path.join(root, "images/quizzes/optimized")
  },
  {
    src: path.join(root, "images/quizzes/quiz_thumbs"),
    out: path.join(root, "images/quizzes/quiz_thumbs/optimized")
  }
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function optimizeImage(inputFile, outputBase) {
  const sizes = [
    { suffix: "-600.webp", width: 600 },
    { suffix: "-900.webp", width: 900 }
  ];

  for (const { suffix, width } of sizes) {
    await sharp(inputFile)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(outputBase + suffix);
  }
}

function processFolder(src, out) {
  ensureDir(out);
  const files = fs.readdirSync(src);

  for (const file of files) {
    const full = path.join(src, file);

    if (fs.statSync(full).isDirectory()) continue;
    if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;

    const name = file.replace(/\.(png|jpe?g|webp)$/i, "");
    const outputBase = path.join(out, name);

    optimizeImage(full, outputBase)
      .then(() =>
        console.log(`✅ ${file} → optimized (${outputBase}-600.webp, -900.webp)`)
      )
      .catch((err) => console.error(`❌ Error on ${file}:`, err));
  }
}

// Tüm klasörleri çalıştır
for (const { src, out } of folders) {
  processFolder(src, out);
}