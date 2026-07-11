// ── supported languages ──
const SUPPORTED_LANGS = [
  "en", "de", "fr", "es", "it", "pt", "nl", "no", "pl", "ru", "uk",
  "ja", "ko", "zh", "ar", "hi", "tr", "sv", "da", "fi",
  "el", "cs", "ro", "hu",
];

// ── app state ──
let translations = {};
let currentUnit = "celsius";
let currentLang = "en";
let currentLocation = "";
let lastWeatherData = null;
let lastCoords = { lat: null, lon: null, name: null, country: null, region: null };

// ── dom refs ──
const weatherDisplay = document.getElementById("weatherDisplay");
const forecastDisplay = document.getElementById("forecastDisplay");
const searchBtn = document.getElementById("searchBtn");
const locationInput = document.getElementById("locationInput");
const saveFavoriteBtn = document.getElementById("saveFavoriteBtn");
const favoritesList = document.getElementById("favoritesList");
const unitToggle = document.getElementById("unitToggle");
const languageSelect = document.getElementById("languageSelect");

// ── i18n ──

// fetch and cache a locale json file. falls back to english on error.
async function loadLanguage(lang) {
  try {
    const response = await fetch(`locales/${lang}.json`);
    translations = await response.json();
  } catch (e) {
    console.error(`Failed to load locale: ${lang}`, e);
    const fallback = await fetch("locales/en.json");
    translations = await fallback.json();
  }
}

// translate a key. returns the key itself if not found.
function t(key) {
  return translations[key] || key;
}

// sanitize user-provided text before innerhtml assignment.
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// translate all elements with data-i18n attributes + dynamic labels.
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  locationInput.placeholder = t("searchPlaceholder");
  searchBtn.textContent = t("search");
  document.documentElement.lang = currentLang;
}

// ── inline svg weather icons (wmo weather code to icon) ──
const W_SUNNY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="14" fill="#f59e0b"/><g stroke="#f59e0b" stroke-width="3" stroke-linecap="round"><line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/><line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/><line x1="13" y1="13" x2="19" y2="19"/><line x1="45" y1="45" x2="51" y2="51"/><line x1="13" y1="51" x2="19" y2="45"/><line x1="45" y1="19" x2="51" y2="13"/></g></svg>';
const W_PARTLY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="24" cy="24" r="10" fill="#f59e0b"/><path d="M44 48H28c-4.4 0-8-3.6-8-8s3.6-8 8-8c.6 0 1.2.1 1.8.2C31.2 28.6 35.2 26 40 26c6.6 0 12 5.4 12 12s-5.4 10-12 10z" fill="#e2e8f0"/></svg>';
const W_OVERCAST = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><ellipse cx="24" cy="44" rx="20" ry="12" fill="#94a3b8"/><ellipse cx="40" cy="48" rx="18" ry="10" fill="#cbd5e1"/><ellipse cx="32" cy="32" rx="24" ry="14" fill="#e2e8f0"/></svg>';
const W_FOG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><ellipse cx="32" cy="28" rx="22" ry="12" fill="#94a3b8" opacity="0.5"/><rect x="12" y="36" width="40" height="6" rx="3" fill="#cbd5e1"/><rect x="8" y="46" width="48" height="6" rx="3" fill="#cbd5e1" opacity="0.7"/><rect x="16" y="54" width="32" height="4" rx="2" fill="#cbd5e1" opacity="0.4"/></svg>';
const W_RAIN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><ellipse cx="32" cy="28" rx="22" ry="14" fill="#94a3b8"/><g fill="#60a5fa"><ellipse cx="22" cy="40" rx="3" ry="5"/><ellipse cx="32" cy="42" rx="3" ry="5"/><ellipse cx="42" cy="40" rx="3" ry="5"/></g></svg>';
const W_HEAVY_RAIN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><ellipse cx="32" cy="22" rx="24" ry="14" fill="#64748b"/><g stroke="#3b82f6" stroke-width="3" stroke-linecap="round"><line x1="20" y1="38" x2="16" y2="52"/><line x1="32" y1="40" x2="28" y2="56"/><line x1="44" y1="38" x2="40" y2="52"/></g></svg>';
const W_SNOW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><ellipse cx="32" cy="24" rx="22" ry="14" fill="#94a3b8"/><g fill="#fff"><circle cx="20" cy="42" r="3"/><circle cx="32" cy="46" r="3"/><circle cx="44" cy="42" r="3"/><circle cx="26" cy="54" r="3"/><circle cx="38" cy="54" r="3"/></g></svg>';
const W_STORM = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><ellipse cx="32" cy="22" rx="24" ry="14" fill="#334155"/><polygon points="34,28 26,44 32,44 28,58 40,40 34,40" fill="#fbbf24"/><g stroke="#3b82f6" stroke-width="2" stroke-linecap="round"><line x1="20" y1="46" x2="16" y2="58"/><line x1="44" y1="46" x2="40" y2="58"/></g></svg>';

// map a wmo weather code to an icon svg string.
function getWeatherIcon(code) {
  if (code === 0 || code === 1) return W_SUNNY;
  if (code === 2) return W_PARTLY;
  if (code === 3) return W_OVERCAST;
  if (code === 45 || code === 48) return W_FOG;
  if (code >= 51 && code <= 67) return W_RAIN;
  if (code >= 71 && code <= 77) return W_SNOW;
  if (code >= 80 && code <= 82) return W_HEAVY_RAIN;
  if (code >= 85 && code <= 86) return W_SNOW;
  if (code >= 95) return W_STORM;
  return W_SUNNY;
}

// map a wmo weather code to a human-readable description.
function getWeatherDescription(code) {
  const codes = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return codes[code] || "Unknown";
}

// ── helpers ──

function cToF(c) {
  return (c * 9/5) + 32;
}

function formatTempUnit(temp) {
  if (currentUnit === "fahrenheit") return `${Math.round(temp)}°F`;
  return `${Math.round(temp)}°C`;
}

function showLoading() {
  weatherDisplay.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>${t("loading")}</p>
    </div>
  `;
}

function showError(message) {
  weatherDisplay.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
}

// format an iso date string to a localized short date e.g. "mon, jan 5".
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(currentLang, { weekday: "short", day: "numeric", month: "short" });
}

// ── api calls ──

// main entry: geocode the location (or parse coords), fetch weather, render.
async function fetchWeather(location) {
  if (!location || !location.trim()) {
    showError(t("enterLocation"));
    return;
  }

  currentLocation = location.trim();
  showLoading();
  forecastDisplay.innerHTML = `<p class="forecast-hint">${t("loadingForecast")}</p>`;

  try {
    let lat, lon, name, country, region;

    const isCoords = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(location);
    if (isCoords) {
      const parts = location.split(",");
      lat = parseFloat(parts[0].trim());
      lon = parseFloat(parts[1].trim());
      const reverseGeo = await reverseGeocode(lat, lon);
      name = reverseGeo ? reverseGeo.name : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      country = reverseGeo ? reverseGeo.country : "";
      region = reverseGeo ? reverseGeo.region : "";
    } else {
      const geo = await geocodeLocation(location);
      if (!geo) {
        showError(t("notFound"));
        forecastDisplay.innerHTML = `<p class="forecast-hint">${t("forecastUnavailable")}</p>`;
        return;
      }
      lat = geo.latitude;
      lon = geo.longitude;
      name = geo.name;
      country = geo.country || "";
      region = geo.admin1 || "";
    }

    lastCoords = { lat, lon, name, country, region };

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      showError(t("fetchError"));
      forecastDisplay.innerHTML = `<p class="forecast-hint">${t("forecastUnavailable")}</p>`;
      return;
    }

    const data = await response.json();
    lastWeatherData = { ...data, name, country, region };
    renderWeather(lastWeatherData);
    renderForecast(lastWeatherData);
    updateCurrentLocationDisplay();
    saveFavoriteBtn.disabled = false;
  } catch (err) {
    console.error(err);
    showError(t("connectionError"));
    forecastDisplay.innerHTML = `<p class="forecast-hint">${t("forecastUnavailable")}</p>`;
  }
}

// forward geocode a city name to {latitude, longitude, name, country, admin1}.
async function geocodeLocation(query) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=${currentLang}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;
    return data.results[0];
  } catch {
    return null;
  }
}

// reverse geocode lat/lon to {name, country, region} via nominatim.
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const response = await fetch(url, { headers: { "Accept-Language": currentLang, "User-Agent": "WeatherExtension/1.0" } });
    const data = await response.json();
    if (!data.address) return null;
    const a = data.address;
    return {
      name: a.town || a.village || a.city || a.municipality || a.county || data.display_name?.split(",")[0] || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      country: a.country || "",
      region: a.state || a.region || a.county || ""
    };
  } catch {
    return null;
  }
}

// ── rendering ──

// render the current weather card (temperature, details, icon).
function renderWeather(data) {
  const { current, name, country, region } = data;
  const temp = currentUnit === "fahrenheit" ? cToF(current.temperature_2m) : current.temperature_2m;
  const feelsLike = currentUnit === "fahrenheit" ? cToF(current.apparent_temperature) : current.apparent_temperature;
  const windSpeed = current.wind_speed_10m;

  weatherDisplay.innerHTML = `
    <div class="weather-card">
      <h3>${escapeHtml(name)}</h3>
      ${country ? `<p class="region">${escapeHtml(region ? region + ", " + country : country)}</p>` : ""}
      <div class="weather-main">
        <span class="weather-icon">${getWeatherIcon(current.weather_code)}</span>
        <span class="weather-temp">${formatTempUnit(temp)}</span>
      </div>
      <p class="weather-condition">${getWeatherDescription(current.weather_code)}</p>
      <div class="weather-details">
        <span>💧 ${t("humidity")}: ${current.relative_humidity_2m}%</span>
        <span>💨 ${t("wind")}: ${windSpeed} km/h</span>
        <span>🌡️ ${t("feelsLike")}: ${formatTempUnit(feelsLike)}</span>
      </div>
    </div>
  `;
}

// render the 7-day forecast list. each day is clickable to open detail modal.
function renderForecast(data) {
  const daily = data.daily;
  if (!daily || !daily.time || daily.time.length < 2) {
    forecastDisplay.innerHTML = `<p class="forecast-hint">${t("noForecast")}</p>`;
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  let startIndex = daily.time.findIndex(d => d === todayStr);
  if (startIndex === -1) startIndex = 0;

  const futureDays = [];
  for (let i = startIndex + 1; i < daily.time.length && futureDays.length < 6; i++) {
    futureDays.push({
      date: daily.time[i],
      max: daily.temperature_2m_max[i],
      min: daily.temperature_2m_min[i],
      code: daily.weather_code[i]
    });
  }

  if (futureDays.length === 0) {
    forecastDisplay.innerHTML = `<p class="forecast-hint">${t("noForecast")}</p>`;
    return;
  }

  forecastDisplay.innerHTML = futureDays
    .map((day) => {
      const maxTemp = currentUnit === "fahrenheit" ? cToF(day.max) : day.max;
      const minTemp = currentUnit === "fahrenheit" ? cToF(day.min) : day.min;
      const icon = getWeatherIcon(day.code);
      const desc = getWeatherDescription(day.code);

      return `<div class="forecast-day" data-date="${day.date}" data-code="${day.code}" data-max="${day.max}" data-min="${day.min}"><span class="forecast-date">${formatDate(day.date)}</span><span class="forecast-icon">${icon}</span><span class="forecast-condition">${desc}</span><div class="forecast-temps"><span class="forecast-temp-max">${formatTempUnit(maxTemp)}</span><span class="forecast-temp-min">${formatTempUnit(minTemp)}</span></div></div>`;
    })
    .join("");

  forecastDisplay.querySelectorAll(".forecast-day").forEach((el) => {
    el.addEventListener("click", () => {
      const date = el.dataset.date;
      const code = parseInt(el.dataset.code);
      const max = parseFloat(el.dataset.max);
      const min = parseFloat(el.dataset.min);
      showDayDetail(date, code, max, min);
    });
  });
}

// show the modal with high/low temps for a specific day.
function showDayDetail(date, code, maxC, minC) {
  const max = currentUnit === "fahrenheit" ? cToF(maxC) : maxC;
  const min = currentUnit === "fahrenheit" ? cToF(minC) : minC;
  const unit = currentUnit === "fahrenheit" ? "°F" : "°C";

  document.getElementById("modalDate").textContent = formatDate(date);
  document.getElementById("modalBody").innerHTML = `
    <div class="detail-main">
      <span class="detail-icon">${getWeatherIcon(code)}</span>
      <p class="detail-condition">${getWeatherDescription(code)}</p>
    </div>
    <div class="detail-temps">
      <div class="detail-temp">
        <span class="detail-label">High</span>
        <span class="detail-value">${Math.round(max)}${unit}</span>
      </div>
      <div class="detail-temp">
        <span class="detail-label">Low</span>
        <span class="detail-value">${Math.round(min)}${unit}</span>
      </div>
    </div>
  `;
  document.getElementById("detailModal").classList.add("active");
}

function closeModal() {
  document.getElementById("detailModal").classList.remove("active");
}

// ── favorites (chrome.storage.sync) ──

// load and render the favorites list from storage.
function loadFavorites() {
  chrome.storage.sync.get(["favorites"], (result) => {
    const favorites = result.favorites || [];
    favoritesList.innerHTML = "";

    if (favorites.length === 0) {
      favoritesList.innerHTML = `<li class="forecast-hint">${t("noFavorites")}</li>`;
      return;
    }

    favorites.forEach((fav) => {
      const li = document.createElement("li");
      li.className = "favorite-item";

      const locationName = typeof fav === "string" ? fav : fav.name;
      const locationCoords = typeof fav === "string" ? fav : fav.coords;

      const weatherBtn = document.createElement("button");
      weatherBtn.className = "favorite-btn";
      weatherBtn.addEventListener("click", () => {
        locationInput.value = locationCoords;
        fetchWeather(locationCoords);
        switchTab("weather");
      });

      const nameSpan = document.createElement("span");
      nameSpan.className = "favorite-name";
      nameSpan.textContent = locationName;

      const coordsSpan = document.createElement("span");
      coordsSpan.className = "favorite-coords";
      coordsSpan.textContent = locationCoords;

      const btnContent = document.createElement("div");
      btnContent.className = "favorite-btn-content";
      btnContent.appendChild(nameSpan);
      btnContent.appendChild(coordsSpan);

      weatherBtn.appendChild(btnContent);

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.title = t("removeFavorite");
      removeBtn.addEventListener("click", () => removeFavorite(fav));

      li.appendChild(weatherBtn);
      li.appendChild(removeBtn);
      favoritesList.appendChild(li);
    });
  });
}

// remove a favorite from storage, then re-render the list.
function removeFavorite(favToRemove) {
  chrome.storage.sync.get(["favorites"], (result) => {
    let favorites = result.favorites || [];
    favorites = favorites.filter((fav) => {
      if (typeof fav === "string" && typeof favToRemove === "string") return fav !== favToRemove;
      if (typeof fav === "object" && typeof favToRemove === "object") return fav.coords !== favToRemove.coords;
      return true;
    });
    chrome.storage.sync.set({ favorites }, loadFavorites);
  });
}

// save the current location as a favorite (no duplicates).
function saveFavorite() {
  if (!currentLocation || !lastCoords.name) return;

  chrome.storage.sync.get(["favorites"], (result) => {
    const favorites = result.favorites || [];
    const exists = favorites.some((fav) => {
      if (typeof fav === "string") return fav === currentLocation;
      return fav.coords === currentLocation;
    });
    if (!exists) {
      favorites.push({
        name: lastCoords.name + (lastCoords.region ? ", " + lastCoords.region : "") + (lastCoords.country ? ", " + lastCoords.country : ""),
        coords: currentLocation
      });
      chrome.storage.sync.set({ favorites }, loadFavorites);
    }
  });
}

// ── controls ──

// toggle between celsius and fahrenheit, persist to storage.
function toggleUnit() {
  currentUnit = currentUnit === "celsius" ? "fahrenheit" : "celsius";
  chrome.storage.sync.set({ unit: currentUnit });
  updateUnitToggle();
  if (lastWeatherData) {
    renderWeather(lastWeatherData);
    renderForecast(lastWeatherData);
  }
}

function updateUnitToggle() {
  unitToggle.textContent = currentUnit === "celsius" ? "°C" : "°F";
}

// switch between weather / forecast / favorites tabs.
function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `${tabName}Tab`);
  });
}

// ── init ──

// load saved unit + language from storage and apply them.
async function loadSettings() {
  const result = await new Promise((resolve) => {
    chrome.storage.sync.get(["unit", "lang"], resolve);
  });

  if (result.unit) {
    currentUnit = result.unit;
  }
  unitToggle.textContent = currentUnit === "celsius" ? "°C" : "°F";

  if (result.lang && SUPPORTED_LANGS.includes(result.lang)) {
    currentLang = result.lang;
  }
  languageSelect.value = currentLang;

  await loadLanguage(currentLang);
  applyStaticTranslations();
  updateUnitToggle();
}

// switch language, re-translate ui, refresh weather text.
async function changeLanguage(lang) {
  currentLang = lang;
  chrome.storage.sync.set({ lang: currentLang });
  await loadLanguage(currentLang);
  applyStaticTranslations();
  loadFavorites();
  if (lastWeatherData) {
    renderWeather(lastWeatherData);
    renderForecast(lastWeatherData);
  }
}

// update the "berlin, germany" label under the search bar.
function updateCurrentLocationDisplay() {
  const locationName = document.getElementById("currentLocationName");
  if (lastCoords && lastCoords.name) {
    let display = lastCoords.name;
    if (lastCoords.region) display += `, ${lastCoords.region}`;
    else if (lastCoords.country) display += `, ${lastCoords.country}`;
    locationName.textContent = display;
  } else {
    locationName.textContent = "Detecting...";
  }
}

function clearInput() {
  locationInput.value = "";
  locationInput.focus();
}

// bootstrap: load settings, init favorites, detect location, wire events.
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  loadFavorites();
  saveFavoriteBtn.disabled = true;
  updateCurrentLocationDisplay();
  detectLocation();

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("clearInputBtn").addEventListener("click", clearInput);
});

// attempt browser geolocation. falls back to berlin on failure.
function detectLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeather(`${latitude},${longitude}`);
      },
      (error) => {
        console.warn("Geolocation failed, falling back to Berlin:", error.message);
        fetchWeather("Berlin");
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  } else {
    fetchWeather("Berlin");
  }
}

// ── event wiring ──

searchBtn.addEventListener("click", () => {
  const location = locationInput.value;
  if (location.trim()) fetchWeather(location);
});

locationInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const location = locationInput.value;
    if (location.trim()) fetchWeather(location);
  }
});

saveFavoriteBtn.addEventListener("click", saveFavorite);
unitToggle.addEventListener("click", toggleUnit);
languageSelect.addEventListener("change", (e) => changeLanguage(e.target.value));
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("detailModal").addEventListener("click", (e) => {
  if (e.target.id === "detailModal") closeModal();
});
