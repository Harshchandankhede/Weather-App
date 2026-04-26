// ─────────────────────────────────────────────────────────────
//  NIMBUS Weather App — script.js (Universal Search Edition)
// ─────────────────────────────────────────────────────────────

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

const ICONS = {
  'Clear':        { day: '☀️',  night: '🌙', label: 'CLEAR SKY' },
  'Clouds':       { day: '⛅',  night: '☁️',  label: 'CLOUDY' },
  'Rain':         { day: '🌧️', night: '🌧️', label: 'RAINY' },
  'Drizzle':      { day: '🌦️', night: '🌦️', label: 'DRIZZLE' },
  'Thunderstorm': { day: '⛈️', night: '⛈️', label: 'STORM' },
  'Snow':         { day: '❄️',  night: '❄️',  label: 'SNOWING' },
  'Mist':         { day: '🌫️', night: '🌫️', label: 'MISTY' },
  'Fog':          { day: '🌫️', night: '🌫️', label: 'FOGGY' },
  'Haze':         { day: '🌫️', night: '🌁',  label: 'HAZY' }
};

function getConditionFromCode(code) {
  if (code === 0) return { main: 'Clear', desc: 'Clear sky' };
  if ([1, 2, 3].includes(code)) return { main: 'Clouds', desc: 'Partly cloudy' };
  if ([45, 48].includes(code)) return { main: 'Fog', desc: 'Foggy' };
  if ([51, 53, 55].includes(code)) return { main: 'Drizzle', desc: 'Drizzle' };
  if ([61, 63, 65, 80, 81, 82].includes(code)) return { main: 'Rain', desc: 'Rainy' };
  if ([71, 73, 75, 85, 86].includes(code)) return { main: 'Snow', desc: 'Snowy' };
  if ([95, 96, 99].includes(code)) return { main: 'Thunderstorm', desc: 'Thunderstorm' };
  return { main: 'Clouds', desc: 'Overcast' };
}

const $ = (id) => document.getElementById(id);

function updateDateTime() {
  const now = new Date();
  $('datetime').innerHTML =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + '<br>' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
updateDateTime();
setInterval(updateDateTime, 30000);

function showState(state) {
  $('loadingDiv').style.display  = state === 'loading' ? 'block' : 'none';
  $('errorDiv').style.display    = state === 'error'   ? 'flex'  : 'none';
  $('weatherWrap').style.display = state === 'weather' ? 'block' : 'none';
  $('apiNote').style.display     = 'none';
}

// ─── Live Suggestions Feature ──────────────────────────────────
let searchTimeout;
$('cityInput').addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (query.length < 3) return;

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`);
      const data = await res.json();
      
      const datalist = $('indian-cities');
      datalist.innerHTML = ''; // Clear old suggestions
      
      if (data.results) {
        data.results.forEach(city => {
          const option = document.createElement('option');
          // Format: City Name, State, Country
          const info = `${city.name}${city.admin1 ? ', ' + city.admin1 : ''}, ${city.country}`;
          option.value = info;
          datalist.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Suggestion fetch failed');
    }
  }, 400); // Wait 400ms after typing
});

async function getWeather() {
  let query = $('cityInput').value.trim();
  if (!query) return;

  // If user selected from datalist, extract just the city name part before the first comma
  const cityNameOnly = query.split(',')[0].trim();
  
  showState('loading');

  try {
    const geoRes = await fetch(`${GEO_URL}?name=${encodeURIComponent(cityNameOnly)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error('Location not found');
    }

    const { latitude, longitude, name, country, admin1 } = geoData.results[0];

    const weatherRes = await fetch(`${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`);
    const d = await weatherRes.json();

    renderWeather(d, { name, country, admin1, latitude, longitude });
    showState('weather');

  } catch (err) {
    showError('Search Failed', err.message === 'Location not found' ? `"${cityNameOnly}" not found.` : 'Check your internet connection.');
  }
}

function showError(title, sub) {
  $('errorTitle').textContent = title;
  $('errorSub').textContent = sub;
  showState('error');
}

function renderWeather(d, loc) {
  const current = d.current;
  const daily = d.daily;
  const condition = getConditionFromCode(current.weather_code);
  const iconObj = ICONS[condition.main] || { day: '🌤', night: '🌙', label: condition.main.toUpperCase() };
  const night = current.is_day === 0;

  $('cityName').textContent = loc.name;
  $('cityCountry').textContent = `${loc.country} · ${loc.admin1 || ''} · ${loc.latitude.toFixed(1)}°N ${Math.abs(loc.longitude).toFixed(1)}°${loc.longitude >= 0 ? 'E' : 'W'}`;
  $('tempValue').textContent = Math.round(current.temperature_2m);
  $('conditionText').textContent = condition.desc;
  $('feelsLike').textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
  $('tempRange').textContent = `↑ ${Math.round(daily.temperature_2m_max[0])}° · ↓ ${Math.round(daily.temperature_2m_min[0])}°`;
  $('weatherEmoji').textContent = night ? iconObj.night : iconObj.day;
  $('weatherLabel').textContent = iconObj.label;

  $('humidity').textContent = current.relative_humidity_2m + '%';
  $('humidityBar').style.width = current.relative_humidity_2m + '%';
  $('windSpeed').textContent = Math.round(current.wind_speed_10m) + ' km/h';
  $('visibility').textContent = '10 km';
  $('pressure').textContent = Math.round(current.pressure_msl) + ' hPa';
  $('cloudCover').textContent = current.cloud_cover + '%';
  $('seaLevel').textContent = Math.round(current.pressure_msl) + ' hPa';

  $('sunrise').textContent = daily.sunrise[0].split('T')[1];
  $('sunset').textContent = daily.sunset[0].split('T')[1];
  $('uviLabel').textContent = night ? 'NIGHT' : 'DAY';
}

function quickSearch(city) {
  $('cityInput').value = city;
  getWeather();
}

$('cityInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') getWeather();
});

showState('none');
quickSearch('Mumbai');
