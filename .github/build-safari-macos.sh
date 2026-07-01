#!/bin/bash
set -euo pipefail

VERSION="${1:?Usage: build-safari-macos.sh <version>}"
SAFARI_DIR="release/safari"
OUTPUT="release/weather-extension-safari-v${VERSION}.zip"

if [ ! -d "$SAFARI_DIR" ]; then
  echo "❌ Safari build directory not found: $SAFARI_DIR"
  exit 1
fi

rm -f "$OUTPUT"

if ! command -v xcodebuild &> /dev/null; then
  echo "⚠️  Xcode not available — packaging raw Safari build"
  cd "$SAFARI_DIR"
  zip -r -q "../../$OUTPUT" .
  cd ../..
  echo "✅ $OUTPUT (raw, no .app)"
  exit 0
fi

echo "🔧 Running safari-web-extension-converter..."
if ! xcrun safari-web-extension-converter "$SAFARI_DIR" \
  --project-location release/ \
  --app-name "WeatherExtension" \
  --bundle-identifier "com.horror69dev.weather-extension" \
  --copy-resources \
  --force 2>&1; then
  echo "⚠️  Converter failed — falling back to raw ZIP"
  cd "$SAFARI_DIR"
  zip -r -q "../../$OUTPUT" .
  cd ../..
  echo "✅ $OUTPUT (fallback)"
  exit 0
fi

echo "🏗️  Building Xcode project..."
cd release/WeatherExtension
if ! xcodebuild \
  -project WeatherExtension.xcodeproj \
  -scheme WeatherExtension \
  -configuration Release \
  -derivedDataPath build/ \
  build 2>&1; then
  echo "⚠️  Xcode build failed — falling back to raw ZIP"
  cd "$SAFARI_DIR"
  zip -r -q "../../$OUTPUT" .
  cd ../..
  echo "✅ $OUTPUT (fallback)"
  exit 0
fi
cd ../..

APP_PATH="release/WeatherExtension/build/Build/Products/Release/WeatherExtension.app"
if [ -d "$APP_PATH" ]; then
  echo "📦 Packaging .app into ZIP..."
  ditto -c -k --keepParent "$APP_PATH" "$OUTPUT"
  echo "✅ $OUTPUT (contains WeatherExtension.app)"
else
  echo "⚠️  .app not found — falling back to raw ZIP"
  cd "$SAFARI_DIR"
  zip -r -q "../../$OUTPUT" .
  cd ../..
  echo "✅ $OUTPUT (fallback)"
fi
