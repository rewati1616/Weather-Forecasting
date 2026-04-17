const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherContent = document.getElementById('weatherContent');

let isCelsius = true;

// Weather condition emoji map
const weatherEmojis = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "❄️", 73: "❄️", 75: "❄️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  95: "⛈️", 96: "⛈️", 99: "⛈️"
};

async function getCoordinates(city) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("City not found");
  return {
    latitude: data.results[0].latitude,
    longitude: data.results[0].longitude,
    name: data.results[0].name + ", " + (data.results[0].admin1 || data.results[0].country)
  };
}

async function getWeather(lat, lon, locationName) {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
    `&hourly=temperature_2m,weather_code` +
    `&timezone=auto&forecast_days=7`;

  const res = await fetch(url);
  const data = await res.json();

  renderWeather(data, locationName);
}

function renderWeather(data, locationName) {
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  const emoji = weatherEmojis[current.weather_code] || "🌡️";

  let html = `
    <div class="current-weather">
      <div class="current-main">
        <div class="location">${locationName}</div>
        <div style="display:flex; align-items:center; gap:20px;">
          <span class="weather-icon">${emoji}</span>
          <div>
            <div class="temperature" id="temp">${Math.round(current.temperature_2m)}°${isCelsius ? 'C' : 'F'}</div>
            <div class="condition">Feels like ${Math.round(current.apparent_temperature)}°</div>
          </div>
        </div>
      </div>

      <div class="details">
        <div class="detail-item">
          <strong>Humidity</strong><br>${current.relative_humidity_2m}%
        </div>
        <div class="detail-item">
          <strong>Wind Speed</strong><br>${current.wind_speed_10m} km/h
        </div>
        <div class="detail-item">
          <strong>Weather</strong><br>${getWeatherDescription(current.weather_code)}
        </div>
      </div>
    </div>

    <div class="forecast">
      <h2 class="section-title">7-Day Forecast</h2>
      <div class="daily-forecast">
  `;

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? "Today" : date.toLocaleDateString('en-US', { weekday: 'short' });
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const dayEmoji = weatherEmojis[daily.weather_code[i]] || "🌡️";

    html += `
      <div class="day-card">
        <div>${dayName}</div>
        <div class="weather-icon">${dayEmoji}</div>
        <div><strong>${max}°</strong> / ${min}°</div>
      </div>
    `;
  }

  html += `</div></div>`;

  // Hourly forecast (next 12 hours)
  html += `
    <div class="forecast">
      <h2 class="section-title">Hourly Today</h2>
      <div class="hourly-grid">
  `;

  const nowHour = new Date().getHours();
  for (let i = 0; i < 12; i++) {
    const index = (nowHour + i) % 24;
    const time = new Date(hourly.time[index]);
    const hourStr = time.getHours().toString().padStart(2, '0') + ":00";
    const temp = Math.round(hourly.temperature_2m[index]);
    const hEmoji = weatherEmojis[hourly.weather_code[index]] || "🌡️";

    html += `
      <div class="hour-card">
        <div>${hourStr}</div>
        <div class="weather-icon">${hEmoji}</div>
        <div><strong>${temp}°</strong></div>
      </div>
    `;
  }

  html += `</div></div>`;

  weatherContent.innerHTML = html;
}

function getWeatherDescription(code) {
  const desc = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 61: "Slight rain", 71: "Slight snow fall",
    80: "Slight rain showers", 95: "Thunderstorm"
  };
  return desc[code] || "Unknown";
}

// Search by city
async function searchCity() {
  const city = cityInput.value.trim();
  if (!city) return;

  try {
    weatherContent.innerHTML = `<p style="text-align:center;padding:40px;">Loading weather...</p>`;
    const coords = await getCoordinates(city);
    await getWeather(coords.latitude, coords.longitude, coords.name);
  } catch (err) {
    weatherContent.innerHTML = `<p class="error">❌ ${err.message}. Please try another city.</p>`;
  }
}

// Get user's current location
async function getUserLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported by your browser");
    return;
  }

  try {
    weatherContent.innerHTML = `<p style="text-align:center;padding:40px;">Getting your location...</p>`;
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const geoData = await geoRes.json();
        const locationName = geoData.city || geoData.locality || "Your Location";
        await getWeather(lat, lon, locationName);
      } catch {
        await getWeather(lat, lon, "Your Current Location");
      }
    });
  } catch (err) {
    weatherContent.innerHTML = `<p class="error">Could not get your location. Please search manually.</p>`;
  }
}

// Event Listeners
searchBtn.addEventListener('click', searchCity);
cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchCity();
});

locationBtn.addEventListener('click', getUserLocation);

// Load default weather (Pimpri / Pune) on page load
window.onload = async () => {
  try {
    const coords = await getCoordinates("Pimpri");
    await getWeather(coords.latitude, coords.longitude, "Pimpri, Maharashtra");
  } catch {
    // Fallback
    getWeather(18.52, 73.86, "Pune, India");
  }
};
