const fs = require("fs");
const path = require("path");

const releaseDir = path.join(__dirname, "release");

function buildInstallManifest() {
  return JSON.parse(fs.readFileSync(path.join(releaseDir, "build-manifest.json"), "utf8"));
}

function buildInstallFromFilenames() {
  const version = require(path.join(__dirname, "package.json")).version;
  const pkgs = { chromium: null, firefox: null, safari: null };

  if (fs.existsSync(path.join(releaseDir, `weather-extension-chromium-v${version}.zip`))) {
    pkgs.chromium = {
      filename: `weather-extension-chromium-v${version}.zip`,
      format: "zip",
      manifest_version: 3
    };
  }
  if (fs.existsSync(path.join(releaseDir, `weather-extension-firefox-v${version}.xpi`))) {
    pkgs.firefox = {
      filename: `weather-extension-firefox-v${version}.xpi`,
      format: "xpi",
      manifest_version: 2
    };
  }
  if (fs.existsSync(path.join(releaseDir, `weather-extension-safari-v${version}.zip`))) {
    pkgs.safari = {
      filename: `weather-extension-safari-v${version}.zip`,
      format: "zip",
      manifest_version: 3
    };
  }

  return { version, packages: pkgs };
}

function generateReleaseNotes(manifest, releaseType = "release") {
  const v = manifest.version;
  const p = manifest.packages;

  let md = "# Weather Extension v" + v + "\n\n";
  md += "## 📋 Release Information\n";
  md += "- **Version:** " + v + "\n";
  md += "- **Build Date:** " + new Date().toUTCString() + "\n";
  md += "- **Release Type:** " + releaseType + "\n\n";

  md += "## 🌐 Downloads\n\n";
  if (p.chromium) md += "### Chromium (Chrome, Edge, Opera, Brave)\n- **" + p.chromium.filename + "** — MV3, load unpacked in developer mode\n\n";
  if (p.firefox) md += "### Firefox\n- **" + p.firefox.filename + "** — MV2, install directly via about:addons\n\n";
  if (p.safari) md += "### Safari (macOS)\n- **" + p.safari.filename + "** — MV3, contains .app bundle\n\n";

  md += "## 🚀 Installation\n\n";
  if (p.chromium) {
    const chromiumInstall = [
      "1. Download `" + p.chromium.filename + "` from [Releases](https://github.com/6jt8/weather-extension/releases)",
      "2. Extract the ZIP to a folder",
      "3. Open your browser extensions page:",
      "   - Chrome: `chrome://extensions/`",
      "   - Edge: `edge://extensions/`",
      "   - Opera: `opera://extensions/`",
      "   - Brave: `brave://extensions/`",
      "4. Enable **Developer mode**",
      "5. Click **Load unpacked** → select the extracted folder"
    ];
    md += "### Chromium Browsers\n" + chromiumInstall.join("\n") + "\n\n";
  }
  if (p.firefox) {
    const firefoxInstall = [
      "1. Download `" + p.firefox.filename + "` from [Releases](https://github.com/6jt8/weather-extension/releases)",
      "2. Open Firefox → `about:addons`",
      "3. Click the gear icon (⚙️) → **Install Add-on From File...**",
      "4. Select the `.xpi` file and confirm"
    ];
    md += "### Firefox\n" + firefoxInstall.join("\n") + "\n\n";
  }
  if (p.safari) {
    const chromiumFilename = p.chromium ? p.chromium.filename : "weather-extension-chromium-v" + v + ".zip";
    const safariInstall = [
      "1. Download `" + p.safari.filename + "` from [Releases](https://github.com/6jt8/weather-extension/releases)",
      "2. Extract the ZIP — it contains `WeatherExtension.app` (or the extension files if .app could not be built)",
      "3. Move `WeatherExtension.app` to your `/Applications` folder",
      "4. Open **Safari** → **Settings** → **Extensions** → enable **Weather Extension**",
      "",
      "**Alternative (Developer Mode):**",
      "1. Download `" + chromiumFilename + "`",
      "2. Extract and use Safari **Develop** → **Show Extension Builder** → **+** → **Add Extension**"
    ];
    md += "### Safari\n" + safariInstall.join("\n") + "\n\n";
  }

  md += "## 📦 Package Contents\n";
  md += "- All source files with manifest\n";
  md += "- Icons (SVG + PNG, 16/48/128)\n";
  md += "- Localization files (25+ languages)\n";
  md += "- Popup UI, background & content scripts\n\n";

  md += "## 🔧 Build Details\n";
  md += "- Chrome: Latest · Edge: 90+ · Opera: 89+ · Brave: 91+\n";
  md += "- Firefox: 109+ · Safari: 14+\n\n";

  md += "---\n*Automatically built by GitHub Actions*";

  return md;
}

function main() {
  const releaseType = process.env.RELEASE_TYPE || "release";

  let manifest;
  if (fs.existsSync(path.join(releaseDir, "build-manifest.json"))) {
    manifest = buildInstallManifest();
    console.log("📄 Read build-manifest.json");
  } else {
    console.warn("⚠️  build-manifest.json not found — falling back to filename detection");
    manifest = buildInstallFromFilenames();
  }

  for (const [key, pkg] of Object.entries(manifest.packages)) {
    if (pkg && !fs.existsSync(path.join(releaseDir, pkg.filename))) {
      console.warn("⚠️  Expected package not found: " + pkg.filename);
      manifest.packages[key] = null;
    }
  }

  const notes = generateReleaseNotes(manifest, releaseType);

  const outPath = path.join(releaseDir, "release-notes.md");
  fs.writeFileSync(outPath, notes);
  console.log("✅ Generated " + outPath);
}

main();
