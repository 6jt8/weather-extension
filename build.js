const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src");
const releaseDir = path.join(__dirname, "release", "weather_extension");

async function build() {
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true });
  }

  fs.mkdirSync(releaseDir, { recursive: true });

  const filesToCopy = [
    "popup.html",
    "popup.css",
    "popup.js",
    "manifest.json",
  ];

  for (const file of filesToCopy) {
    const src = path.join(srcDir, file);
    const dest = path.join(releaseDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied: ${file}`);
    } else {
      console.warn(`Missing: ${file}`);
    }
  }

  const sharpAvailable = (() => {
    try {
      require.resolve("sharp");
      return true;
    } catch {
      return false;
    }
  })();

  const iconsSrc = path.join(srcDir, "icons");
  const iconsDest = path.join(releaseDir, "icons");
  if (fs.existsSync(iconsSrc)) {
    fs.mkdirSync(iconsDest, { recursive: true });
    const svgFiles = fs.readdirSync(iconsSrc).filter(f => f.endsWith(".svg"));

    if (sharpAvailable) {
      const sharp = require("sharp");
      for (const svg of svgFiles) {
        const svgPath = path.join(iconsSrc, svg);
        const baseName = path.basename(svg, ".svg");
        const svgBuffer = fs.readFileSync(svgPath);
        for (const size of [16, 48, 128]) {
          const pngBuffer = await sharp(svgBuffer).resize(size, size).png().toBuffer();
          fs.writeFileSync(path.join(iconsDest, `${baseName}-${size}.png`), pngBuffer);
          console.log(`Generated: ${baseName}-${size}.png`);
        }
      }
    }

    for (const svg of svgFiles) {
      fs.copyFileSync(path.join(iconsSrc, svg), path.join(iconsDest, svg));
      console.log(`Copied icon: ${svg}`);
    }
  }

  const localesSrc = path.join(srcDir, "locales");
  const localesDest = path.join(releaseDir, "locales");
  if (fs.existsSync(localesSrc)) {
    fs.mkdirSync(localesDest, { recursive: true });
    for (const file of fs.readdirSync(localesSrc)) {
      fs.copyFileSync(path.join(localesSrc, file), path.join(localesDest, file));
      console.log(`Copied locale: ${file}`);
    }
  }

  console.log("\nRelease build complete in release/weather_extension/");
}

build().catch(console.error);
