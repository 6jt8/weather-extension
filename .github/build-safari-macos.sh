#!/bin/bash
set -euo pipefail

VERSION="${1:?Usage: build-safari-macos.sh <version>}"
SAFARI_DIR="release/safari"
OUTPUT="release/weather-extension-safari-v${VERSION}.zip"

if [ ! -d "$SAFARI_DIR" ]; then
  echo "ERROR: Safari build directory not found: $SAFARI_DIR"
  exit 1
fi

rm -f "$OUTPUT"

if ! command -v xcodebuild &> /dev/null; then
  echo "WARNING: Xcode not available — packaging raw Safari build"
  cd "$SAFARI_DIR"
  zip -r -q "../../$OUTPUT" .
  cd ../..
  echo "$OUTPUT (raw, no .app)"
  exit 0
fi

echo "Running safari-web-extension-converter..."
if ! xcrun safari-web-extension-converter "$SAFARI_DIR" \
  --project-location release/ \
  --app-name "WeatherExtension" \
  --bundle-identifier "com.horror69dev.weather-extension" \
  --copy-resources \
  --force 2>&1; then
  echo "WARNING: Converter failed — falling back to raw ZIP"
  cd "$SAFARI_DIR"
  zip -r -q "../../$OUTPUT" .
  cd ../..
  echo "$OUTPUT (fallback)"
  exit 0
fi

echo "Building Xcode project..."
cd release/WeatherExtension

SCHEME=$(xcodebuild -project WeatherExtension.xcodeproj -list 2>/dev/null | sed -n '/Schemes:/,/^$/p' | grep -v 'Schemes:' | grep -v '^$' | head -n1 | tr -d '[:space:]')
if [ -z "$SCHEME" ]; then
  SCHEME="WeatherExtension"
fi

if ! xcodebuild \
  -project WeatherExtension.xcodeproj \
  -scheme "$SCHEME" \
  -configuration Release \
  -derivedDataPath build/ \
  build 2>&1; then
  echo "WARNING: Xcode build failed — falling back to raw ZIP"
  cd "$SAFARI_DIR"
  zip -r -q "../../$OUTPUT" .
  cd ../..
  echo "$OUTPUT (fallback)"
  exit 0
fi
cd ../..

APP_PATH="release/WeatherExtension/build/Build/Products/Release/WeatherExtension.app"
if [ -d "$APP_PATH" ]; then
  echo "Packaging .app into ZIP..."
  ditto -c -k --keepParent "$APP_PATH" "$OUTPUT"
  echo "$OUTPUT (contains WeatherExtension.app)"
else
  echo "WARNING: .app not found — falling back to raw ZIP"
  cd "$SAFARI_DIR"
  zip -r -q "../../$OUTPUT" .
  cd ../..
  echo "$OUTPUT (fallback)"
fi
