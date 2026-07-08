import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const releaseDir = path.join(rootDir, "release");

function getRepoUrl() {
  const repo = process.env.GITHUB_REPOSITORY;
  return repo ? `https://github.com/${repo}` : null;
}

function buildInstallManifest() {
  const manifestPath = path.join(releaseDir, "build-manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function buildInstallFromFilenames() {
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = pkg.version;
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
      manifest_version: 3
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

function getAutoChangelog() {
  try {
    const lastTag = execSync("git describe --tags --abbrev=0 2>/dev/null", { encoding: "utf8" }).trim();
    if (!lastTag) return null;
    const log = execSync(`git log ${lastTag}..HEAD --no-merges --format="%s (%h)"`, { encoding: "utf8" }).trim();
    if (!log) return null;

    const categorized = { feat: [], fix: [], chore: [], docs: [], refactor: [], other: [] };
    for (const line of log.split("\n")) {
      const match = line.match(/^(feat|fix|chore|docs|refactor)(\(.+?\))?:\s*(.+)$/i);
      if (match) {
        const type = match[1].toLowerCase();
        const msg = match[3];
        categorized[type]?.push(msg || line) ?? categorized.other.push(line);
      } else {
        categorized.other.push(line);
      }
    }

    let md = "## Recent Changes\n\n";
    const labels = {
      feat: "Features",
      fix: "Bug Fixes",
      chore: "Maintenance",
      docs: "Documentation",
      refactor: "Refactoring",
      other: "Other"
    };

    for (const [key, label] of Object.entries(labels)) {
      if (categorized[key]?.length) {
        md += `### ${label}\n`;
        for (const item of categorized[key]) {
          md += `- ${item}\n`;
        }
        md += "\n";
      }
    }

    return md;
  } catch {
    return null;
  }
}

function generateReleaseNotes(manifest, releaseType = "release") {
  const v = manifest.version;
  const p = manifest.packages;

  const hasAny = p.chromium || p.firefox || p.safari;
  if (!hasAny) {
    return `# Weather Extension v${v}\n\nNo build artifacts available for this target.\n`;
  }

  const repo = getRepoUrl();
  const releasesUrl = repo ? `${repo}/releases` : null;

  let md = `# Weather Extension v${v}\n\n`;
  md += "## Release Information\n";
  md += `- **Version:** ${v}\n`;
  md += `- **Build Date:** ${new Date().toUTCString()}\n`;
  md += `- **Release Type:** ${releaseType}\n\n`;

  md += "## Downloads\n\n";
  if (p.chromium) md += `### Chromium (Chrome, Edge, Opera, Brave)\n- **${p.chromium.filename}** — MV3, load unpacked in developer mode\n\n`;
  if (p.firefox) md += `### Firefox\n- **${p.firefox.filename}** — MV3, install directly via about:addons\n\n`;
  if (p.safari) md += `### Safari (macOS)\n- **${p.safari.filename}** — MV3, native macOS application\n\n`;

  md += "## Installation\n\n";
  if (p.chromium) {
    md += "### Chromium Browsers\n";
    if (releasesUrl) md += `1. Download \`${p.chromium.filename}\` from [Releases](${releasesUrl})\n`;
    else md += `1. Locate \`${p.chromium.filename}\` in the build output\n`;
    md += "2. Extract the ZIP to a folder\n";
    md += "3. Open your browser extensions page:\n";
    md += "   - Chrome: `chrome://extensions/`\n";
    md += "   - Edge: `edge://extensions/`\n";
    md += "   - Opera: `opera://extensions/`\n";
    md += "   - Brave: `brave://extensions/`\n";
    md += "4. Enable **Developer mode**\n";
    md += "5. Click **Load unpacked** → select the extracted folder\n\n";
  }
  if (p.firefox) {
    md += "### Firefox\n";
    if (releasesUrl) md += `1. Download \`${p.firefox.filename}\` from [Releases](${releasesUrl})\n`;
    else md += `1. Locate \`${p.firefox.filename}\` in the build output\n`;
    md += "2. Open Firefox → `about:addons`\n";
    md += "3. Click the gear icon → **Install Add-on From File...**\n";
    md += "4. Select the `.xpi` file and confirm\n\n";
  }
  if (p.safari) {
    md += "### Safari\n";
    if (releasesUrl) md += `1. Download \`${p.safari.filename}\` from [Releases](${releasesUrl})\n`;
    else md += `1. Locate \`${p.safari.filename}\` in the build output\n`;
    md += "2. Extract the ZIP and move **WeatherExtension.app** to your `/Applications` folder\n";
    md += "3. Open **Safari** → **Settings** → **Extensions** → enable **Weather Extension**\n\n";
  }

  md += "## Package Contents\n";
  md += "- All source files with manifest\n";
  md += "- Icons (SVG + PNG, 16/48/128)\n";
  md += "- Localization files (25+ languages)\n";
  md += "- Popup UI\n\n";

  md += "## Build Details\n";
  md += "- Chromium (Chrome, Edge, Opera, Brave): Manifest V3\n";
  md += "- Firefox: 109+ · Safari: 14+\n\n";

  const autoChangelog = getAutoChangelog();
  if (autoChangelog) {
    md += autoChangelog + "\n";
  }

  md += "---\n*Automatically built by GitHub Actions*";

  return md;
}

function main() {
  const releaseType = process.env.RELEASE_TYPE || "release";

  let manifest = buildInstallManifest();
  if (!manifest) {
    console.warn("build-manifest.json not found — falling back to filename detection");
    manifest = buildInstallFromFilenames();
  }

  if (manifest?.packages) {
    for (const [key, pkg] of Object.entries(manifest.packages)) {
      if (pkg?.filename && !fs.existsSync(path.join(releaseDir, pkg.filename))) {
        console.warn("Expected package not found: " + pkg.filename);
        manifest.packages[key] = null;
      }
    }
  }

  const notes = generateReleaseNotes(manifest, releaseType);

  const outPath = path.join(releaseDir, "release-notes.md");
  fs.writeFileSync(outPath, notes);
  console.log("Generated " + outPath);
}

main();
