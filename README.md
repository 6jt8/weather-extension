<p align="center">
  <img src="https://raw.githubusercontent.com/horror69dev/weather-extension/main/.github/assets/banner.svg" alt="Weather Extension Banner" />
</p>

<div align="center">

**Chrome & Firefox extension for current weather and 7-day forecast**

[![Release](https://img.shields.io/github/v/release/horror69dev/weather-extension?style=flat-square&color=4a90b8)](https://github.com/horror69dev/weather-extension/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Languages](https://img.shields.io/badge/languages-24-blue?style=flat-square)](src/locales/)
[![Stars](https://img.shields.io/github/stars/horror69dev/weather-extension?style=flat-square&color=fbbf24)](https://github.com/horror69dev/weather-extension/stargazers)

*A project by [horror69dev](https://github.com/horror69dev) & [6jt8](https://github.com/6jt8)*

</div>

## Features

- **Current weather** - Temperature, condition, humidity & wind
- **7-day forecast** - Today + next 6 days
- **24 languages** - Select in the popup, saved automatically
- **Location detection** - Automatic via geolocation or IP
- **Favorites** - Save and quickly load locations
- **Unit toggle** - Celsius / Fahrenheit (persisted)

## Screenshots

<p align="center">
  <img src="https://raw.githubusercontent.com/horror69dev/weather-extension/main/.github/assets/Screenshot-Weather.png" alt="Weather Tab" width="32%" />
  <img src="https://raw.githubusercontent.com/horror69dev/weather-extension/main/.github/assets/Screenshot-Forecast.png" alt="Forecast Tab" width="32%" />
  <img src="https://raw.githubusercontent.com/horror69dev/weather-extension/main/.github/assets/Screenshot-Favorites.png" alt="Favorites Tab" width="32%" />
</p>

## Installation

### Chrome

1. Download `weather-extension-chrome-v*.zip` from [Releases](../../releases)
2. Unpack
3. Open `chrome://extensions/`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** -> select the unpacked folder

### Firefox

1. Download `weather-extension-firefox-v*.zip` from [Releases](../../releases)
2. Unpack
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on** -> select `manifest.json`

## Development

```bash
git clone https://github.com/horror69dev/weather-extension.git
cd weather-extension
```

No API key required - uses [Open-Meteo](https://open-meteo.com/) (free, no signup).

Load the `src/` folder as an unpacked extension in Chrome.

## Release

Manual via **GitHub Actions** -> [Release Build](../../actions/workflows/release.yml) -> **Run workflow**

| Input | Description | Example |
|:---|:---|:---|
| `version` | Semver version | `1.2.0` |
| `target` | Target platform | `chrome` / `firefox` / `both` |
| `create_release` | Create GitHub release | `true` |
| `release_name` | Optional name | `Summer Update` |

## API

Uses [Open-Meteo](https://open-meteo.com/) (free, no API key required)

- `/v1/forecast` - Current weather + 7-day forecast
- `/v1/search` - Geocoding (location search)
- `/v1/reverse` - Reverse geocoding (coordinates to name)

## Contributors

Thanks to all contributors who have helped this project:

<p align="center">
  <a href="https://github.com/horror69dev/weather-extension/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=horror69dev/weather-extension" alt="Contributors" />
  </a>
</p>

## Star History

<p align="center">
  <a href="https://www.star-history.com/?repos=horror69dev%2Fweather-extension&type=date&legend=top-left">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=horror69dev%2Fweather-extension&type=date&theme=dark&legend=top-left" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=horror69dev%2Fweather-extension&type=date&legend=top-left" />
      <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=horror69dev%2Fweather-extension&type=date&legend=top-left" />
    </picture>
  </a>
</p>

## License

This project is licensed under the `MIT License` - see the [LICENSE](LICENSE) file for details.

## Copyright

Originally created by [horror69dev](https://github.com/horror69dev).
Refactored, upgraded, maintained and artwork by [6jt8](https://github.com/6jt8).

Weather data provided by [Open-Meteo](https://open-meteo.com/).
