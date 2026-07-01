#!/bin/bash
set -uo pipefail

VERSION="${1:?Usage: build-safari-macos.sh <version>}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SAFARI_DIR="$REPO_ROOT/release/safari"
APP_DEST="$REPO_ROOT/release/WeatherExtension.app"

if [ ! -d "$SAFARI_DIR" ]; then
  echo "ERROR: Safari build directory not found: $SAFARI_DIR"
  exit 1
fi

echo "Creating Safari .app bundle for v${VERSION}..."

build_fallback_app() {
  echo "Building fallback .app bundle (unsigned, for testing)..."
  rm -rf "$APP_DEST"
  mkdir -p "$APP_DEST/Contents/MacOS"
  mkdir -p "$APP_DEST/Contents/Resources"

  cp -R "$SAFARI_DIR/." "$APP_DEST/Contents/Resources/"

  cat > "$APP_DEST/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>weather-extension</string>
  <key>CFBundleIdentifier</key>
  <string>com.horror69dev.weather-extension</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>WeatherExtension</string>
  <key>CFBundleVersion</key>
  <string>${VERSION}</string>
  <key>CFBundleShortVersionString</key>
  <string>${VERSION}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>WKAppExtensionBundleIdentifier</key>
  <string>com.horror69dev.weather-extension.extension</string>
</dict>
</plist>
EOF

  cat > "$APP_DEST/Contents/MacOS/weather-extension" <<'EOF'
#!/bin/bash
echo "Weather Extension is a Safari web extension."
echo "Open Safari → Settings → Extensions to enable it."
exit 0
EOF
  chmod +x "$APP_DEST/Contents/MacOS/weather-extension"

  echo "Created fallback: $APP_DEST (unsigned, for testing only)"
  return 0
}

# Check prerequisites
HAS_XCODE=false
HAS_CONVERTER=false

if command -v xcodebuild &> /dev/null; then
  HAS_XCODE=true
fi
if command -v xcrun &> /dev/null && xcrun --find safari-web-extension-converter &> /dev/null 2>&1; then
  HAS_CONVERTER=true
fi

# Try converter + xcodebuild
if $HAS_CONVERTER && $HAS_XCODE; then
  echo "Using safari-web-extension-converter..."

  xcrun safari-web-extension-converter "$SAFARI_DIR" \
    --project-location "$REPO_ROOT/release/" \
    --app-name "WeatherExtension" \
    --bundle-identifier "com.horror69dev.weather-extension" \
    --copy-resources \
    --force 2>&1 && {

    XCODE_PROJECT="$REPO_ROOT/release/WeatherExtension/WeatherExtension.xcodeproj"
    if [ -d "$XCODE_PROJECT" ]; then
      echo "Building Xcode project..."
      cd "$REPO_ROOT/release/WeatherExtension"

      SCHEME=$(xcodebuild -project "$XCODE_PROJECT" -list 2>/dev/null | awk '/Schemes:/{flag=1; next} flag && /^$/{exit} flag' | grep -v '(iOS)' | grep -v '(watchOS)' | grep -v '(tvOS)' | head -1 | xargs)
      SCHEME="${SCHEME:-WeatherExtension}"
      echo "Using scheme: $SCHEME"

      if xcodebuild \
        -project "$XCODE_PROJECT" \
        -scheme "$SCHEME" \
        -configuration Release \
        -derivedDataPath "$REPO_ROOT/release/WeatherExtension/build/" \
        -destination 'platform=macOS' \
        build 2>&1; then

        BUILT_APP="$REPO_ROOT/release/WeatherExtension/build/Build/Products/Release/WeatherExtension.app"
        if [ -d "$BUILT_APP" ]; then
          rm -rf "$APP_DEST"
          cp -R "$BUILT_APP" "$APP_DEST"
          echo "Created: $APP_DEST (signed-ready)"
          exit 0
        fi
      fi
    fi
  }

  echo "WARNING: Converter/Xcode build failed — falling back to unsigned .app"
else
  echo "WARNING: Xcode (xcodebuild=$HAS_XCODE) or converter (xcrun=$HAS_CONVERTER) not available"
fi

build_fallback_app
