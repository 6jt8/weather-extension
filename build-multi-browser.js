const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src");
const releaseDir = path.join(__dirname, "release");

async function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const file of fs.readdirSync(src)) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

async function buildIcons(iconsSrc, iconsDest) {
  if (!fs.existsSync(iconsSrc)) {
    console.warn("⚠️  Icons directory not found:", iconsSrc);
    return;
  }

  fs.mkdirSync(iconsDest, { recursive: true });
  const svgFiles = fs.readdirSync(iconsSrc).filter(f => f.endsWith(".svg"));

  // Check if sharp is available for PNG conversion
  let sharp = null;
  try {
    sharp = require("sharp");
  } catch {
    console.warn("⚠️  sharp not installed - skipping PNG generation");
  }

  for (const svg of svgFiles) {
    const svgPath = path.join(iconsSrc, svg);
    const baseName = path.basename(svg, ".svg");

    // Copy original SVG
    fs.copyFileSync(svgPath, path.join(iconsDest, svg));
    console.log(`  ✓ Copied: ${svg}`);

    // Generate PNGs if sharp available
    if (sharp) {
      const svgBuffer = fs.readFileSync(svgPath);
      for (const size of [16, 48, 128]) {
        try {
          const pngBuffer = await sharp(svgBuffer).resize(size, size).png().toBuffer();
          fs.writeFileSync(path.join(iconsDest, `${baseName}-${size}.png`), pngBuffer);
          console.log(`  ✓ Generated: ${baseName}-${size}.png`);
        } catch (e) {
          console.warn(`  ⚠️  Failed to generate PNG: ${baseName}-${size}.png`, e.message);
        }
      }
    }
  }
}

async function buildLocales(localesSrc, localesDest) {
  if (!fs.existsSync(localesSrc)) {
    console.warn("⚠️  Locales directory not found:", localesSrc);
    return;
  }

  fs.mkdirSync(localesDest, { recursive: true });
  const localeFiles = fs.readdirSync(localesSrc).filter(f => f.endsWith(".json"));

  for (const file of localeFiles) {
    fs.copyFileSync(path.join(localesSrc, file), path.join(localesDest, file));
    console.log(`  ✓ Copied locale: ${file}`);
  }
}

async function buildForBrowser(browser, baseDir) {
  const buildDir = path.join(baseDir, browser);
  console.log(`\n📦 Building for ${browser.toUpperCase()}...`);

  // Clean
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });

  // Copy base files
  const baseFiles = ["popup.html", "popup.css", "popup.js", "background.js", "content.js"];
  for (const file of baseFiles) {
    const srcFile = path.join(srcDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(buildDir, file));
      console.log(`  ✓ Copied: ${file}`);
    }
  }

  // Copy icons
  await buildIcons(path.join(srcDir, "icons"), path.join(buildDir, "icons"));

  // Copy locales
  await buildLocales(path.join(srcDir, "locales"), path.join(buildDir, "locales"));

  // Generate browser-specific manifest
  const baseManifest = JSON.parse(fs.readFileSync(path.join(srcDir, "manifest.json"), "utf8"));
  const manifest = generateManifest(baseManifest, browser);

  fs.writeFileSync(
    path.join(buildDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`  ✓ Generated manifest for ${browser}`);

  return buildDir;
}

function generateManifest(base, browser) {
  let manifest = JSON.parse(JSON.stringify(base));

  switch (browser) {
    case "chrome":
    case "edge":
    case "brave":
    case "opera":
      manifest.manifest_version = 3;
      if (browser === "edge") {
        manifest.minimum_chrome_version = "90";
      } else if (browser === "brave") {
        manifest.minimum_chrome_version = "91";
      } else if (browser === "opera") {
        manifest.minimum_chrome_version = "89";
      }
      break;

    case "firefox":
      // Firefox uses Manifest V2
      manifest.manifest_version = 2;
      manifest.browser_action = manifest.action;
      delete manifest.action;
      manifest.permissions = (manifest.permissions || []).concat(manifest.host_permissions || []);
      delete manifest.host_permissions;
      manifest.browser_specific_settings = {
        gecko: {
          id: "weather-extension@horror69dev",
          strict_min_version: "109.0"
        }
      };
      break;

    case "safari":
      manifest.manifest_version = 3;
      manifest.browser_specific_settings = {
        safari: {
          minimum_version": "14"
        }
      };
      break;
  }

  return manifest;
}

async function build() {
  const browsers = ["chrome", "firefox", "edge", "opera", "brave", "safari"];

  // Clean release dir
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true });
  }
  fs.mkdirSync(releaseDir, { recursive: true });

  const builds = {};
  for (const browser of browsers) {
    builds[browser] = await buildForBrowser(browser, releaseDir);
  }

  console.log("\n✅ All builds completed!");
  console.log("\nBuild directories:");
  for (const [browser, dir] of Object.entries(builds)) {
    console.log(`  - ${browser}: ${dir}`);
  }
}

build().catch(err => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
