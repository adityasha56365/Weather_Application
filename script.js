// OpenWeatherMap API Key
const API_KEY = '8bafdfbc52baba3590da5fd091b6b6aa';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// Global variables
let currentCity = 'Copenhagen';
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];

let isCelsius = true; // Default to Celsius
let currentWeatherData = null;
let currentForecastData = null;
let currentDailyForecasts = [];

// Weather icon mapping
const weatherIcons = {
    '01d': 'ph-sun', // clear sky day
    '01n': 'ph-moon-stars', // clear sky night
    '02d': 'ph-cloud-sun', // few clouds day
    '02n': 'ph-cloud-moon', // few clouds night
    '03d': 'ph-cloud', // scattered clouds
    '03n': 'ph-cloud',
    '04d': 'ph-clouds', // broken clouds
    '04n': 'ph-clouds',
    '09d': 'ph-cloud-rain', // shower rain
    '09n': 'ph-cloud-rain',
    '10d': 'ph-cloud-rain', // rain
    '10n': 'ph-cloud-rain',
    '11d': 'ph-cloud-lightning', // thunderstorm
    '11n': 'ph-cloud-lightning',
    '13d': 'ph-snow', // snow
    '13n': 'ph-snow',
    '50d': 'ph-cloud-fog', // mist
    '50n': 'ph-cloud-fog'
};

// Weather emoji mapping
const weatherEmojis = {
    '01d': '☀️', // clear sky day
    '01n': '🌙', // clear sky night
    '02d': '⛅', // few clouds day
    '02n': '☁️', // few clouds night
    '03d': '☁️', // scattered clouds
    '03n': '☁️',
    '04d': '☁️', // broken clouds
    '04n': '☁️',
    '09d': '🌧️', // shower rain
    '09n': '🌧️',
    '10d': '🌧️', // rain
    '10n': '🌧️',
    '11d': '⚡', // thunderstorm
    '11n': '⚡',
    '13d': '❄️', // snow
    '13n': '❄️',
    '50d': '🌫️', // mist
    '50n': '🌫️'
};

// AQI descriptions and colors
const aqiLevels = {
    1: { label: 'Good', color: 'bg-green-600', desc: 'Air quality is satisfactory' },
    2: { label: 'Fair', color: 'bg-yellow-600', desc: 'Air quality is acceptable' },
    3: { label: 'Moderate', color: 'bg-orange-600', desc: 'Members of sensitive groups may experience health effects' },
    4: { label: 'Poor', color: 'bg-red-600', desc: 'Everyone may experience health effects' },
    5: { label: 'Very Poor', color: 'bg-purple-600', desc: 'Health alert: everyone may experience serious health effects' }
};

// API Functions
async function fetchWeather(city) {
    try {
        const response = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('City not found. Please check the spelling and try again.');
            } else {
                throw new Error('Unable to fetch weather data. Please try again later.');
            }
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching weather:', error);
        showSearchError(error.message);
        return null;
    }
}

async function fetchForecast(city) {
    try {
        const response = await fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`);
        if (!response.ok) throw new Error('Forecast not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return null;
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        if (!response.ok) throw new Error('Unable to fetch weather for your location. Please try again.');
        return await response.json();
    } catch (error) {
        console.error('Error fetching weather by coords:', error);
        showLocationError(error.message);
        return null;
    }
}

async function fetchForecastByCoords(lat, lon) {
    try {
        const response = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        if (!response.ok) throw new Error('Forecast not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching forecast by coords:', error);
        return null;
    }
}

async function fetchAirPollution(lat, lon) {
    try {
        const response = await fetch(`${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (!response.ok) throw new Error('Air pollution data not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching air pollution:', error);
        return null;
    }
}

// Utility Functions
function convertTemp(tempC) {
    return isCelsius ? tempC : (tempC * 9/5) + 32;
}

function formatTemp(temp) {
    return Math.round(convertTemp(temp)) + (isCelsius ? '°' : '°F');
}

function updateTime() {
    const now = new Date();
    const options = { weekday: 'long' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// UI Update Functions
function updateCurrentWeather(data) {
    currentWeatherData = data;
    document.getElementById('city-name').textContent = data.name;
    document.getElementById('temp').textContent = formatTemp(data.main.temp);
    document.getElementById('weather-desc').textContent = data.weather[0].main;
    document.getElementById('temp-range').textContent = `H: ${formatTemp(data.main.temp_max)} L: ${formatTemp(data.main.temp_min)}`;

    const iconCode = data.weather[0].icon;
    const iconClass = weatherIcons[iconCode] || 'ph-cloud';
    document.getElementById('weather-icon').className = `ph ${iconClass} text-xl`;

    const emoji = weatherEmojis[iconCode] || '☁️';
    document.getElementById('weather-emoji').textContent = emoji;

    // Update widgets
    document.getElementById('feels-like').textContent = formatTemp(data.main.feels_like);
    document.getElementById('humidity').textContent = data.main.humidity + '%';
    document.getElementById('visibility').textContent = (data.visibility / 1000).toFixed(1) + ' km';
    document.getElementById('pressure').textContent = data.main.pressure + ' hPa';

    // Update descriptions + mood widgets
    updateWidgetDescriptions(data);
    updateMoodAndOutfit(data);

    // Update wind
    const windSpeed = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
    document.getElementById('wind-speed').textContent = windSpeed;
    document.getElementById('wind-direction').textContent = getWindDirection(data.wind.deg);
    document.getElementById('wind-gust').textContent = data.wind.gust ? Math.round(data.wind.gust * 3.6) : windSpeed + 5;

    // Update compass
    updateCompass(data.wind.deg);

    currentCity = data.name;
    updateFavoriteButton();

    // Fetch air quality data
    fetchAirPollution(data.coord.lat, data.coord.lon).then(aqiData => {
        if (aqiData) updateAirQuality(aqiData);
    });
}

function updateWidgetDescriptions(data) {
    // Feels like description
    const feelsDiff = data.main.feels_like - data.main.temp;
    let feelsDesc = '';
    if (Math.abs(feelsDiff) < 2) {
        feelsDesc = 'Similar to the actual temperature.';
    } else if (feelsDiff > 0) {
        feelsDesc = 'Feels warmer than the actual temperature.';
    } else {
        feelsDesc = 'Feels colder than the actual temperature.';
    }
    document.getElementById('feels-desc').textContent = feelsDesc;

    // Humidity description
    let humidityDesc = '';
    if (data.main.humidity < 30) {
        humidityDesc = 'Low humidity. It might feel dry.';
    } else if (data.main.humidity < 60) {
        humidityDesc = 'Comfortable humidity levels.';
    } else {
        humidityDesc = 'High humidity. It might feel humid and uncomfortable.';
    }
    document.getElementById('humidity-desc').textContent = humidityDesc;

    // Visibility description
    let visibilityDesc = '';
    const visKm = data.visibility / 1000;
    if (visKm > 10) {
        visibilityDesc = "It's perfectly clear right now.";
    } else if (visKm > 5) {
        visibilityDesc = 'Good visibility conditions.';
    } else if (visKm > 2) {
        visibilityDesc = 'Moderate visibility.';
    } else {
        visibilityDesc = 'Poor visibility. Be cautious while driving.';
    }
    document.getElementById('visibility-desc').textContent = visibilityDesc;

    // Pressure description
    let pressureDesc = '';
    if (data.main.pressure > 1013) {
        pressureDesc = 'High pressure. Expect stable weather.';
    } else if (data.main.pressure > 1000) {
        pressureDesc = 'Normal pressure conditions.';
    } else {
        pressureDesc = 'Low pressure. Expect changes in the weather.';
    }
    document.getElementById('pressure-desc').textContent = pressureDesc;
}

// Mood + outfit assistant
function updateMoodAndOutfit(data) {
    const moodEmojiEl = document.getElementById('mood-emoji');
    const moodTitleEl = document.getElementById('mood-title');
    const moodTextEl = document.getElementById('mood-text');
    const outfitTextEl = document.getElementById('outfit-text');
    const comfortLabelEl = document.getElementById('comfort-label');
    const summaryVibeEl = document.getElementById('summary-vibe');
    const greetingEmojiEl = document.getElementById('session-greeting-emoji');
    const greetingTextEl = document.getElementById('session-greeting-text');

    if (!moodEmojiEl) return;

    const temp = data.main.temp;
    const feels = data.main.feels_like;
    const humidity = data.main.humidity;
    const cond = (data.weather[0].main || '').toLowerCase();

    let moodEmoji = '😌';
    let title = 'Soft, cozy weather';
    let desc = 'Perfect balance for a slow, gentle day outside.';
    let outfit = 'Light layers, comfy sneakers and a thin jacket.';
    let comfortText = 'Very comfortable';
    let vibe = 'Soft clouds with easy-going vibes';
    let greetEmoji = '✨';
    let greetText = 'Perfect moment for a walk';

    if (temp <= 2) {
        moodEmoji = '🥶';
        title = 'Sharp winter chill';
        desc = 'Crisp, icy air – beautiful but biting on the skin.';
        outfit = 'Heavy coat, gloves, scarf and something warm for your head.';
        comfortText = 'Bundle-up weather';
        vibe = 'Cold but cinematic – ideal for short walks and photos.';
        greetEmoji = '❄️';
        greetText = 'Best enjoyed with hot drinks.';
    } else if (temp <= 12) {
        moodEmoji = '🧣';
        title = 'Cool & refreshing';
        desc = 'Fresh air with a calm edge – great for focused tasks or long walks.';
        outfit = 'Light sweater or hoodie, long pants and closed shoes.';
        comfortText = 'Cool & comfy';
        vibe = 'Brisk but energising – great for errands or a quick run.';
        greetEmoji = '🌤️';
        greetText = 'Ideal for a productivity boost.';
    } else if (temp <= 22) {
        moodEmoji = '😎';
        title = 'Ideal outside comfort';
        desc = 'Air feels naturally pleasant – not too warm, not too cold.';
        outfit = 'T-shirt or light shirt with relaxed, breathable layers.';
        comfortText = 'Prime comfort range';
        vibe = 'Comfortable, open-air weather – ideal for being outdoors.';
        greetEmoji = '🌈';
        greetText = 'Great moment to step outside.';
    } else if (temp <= 30) {
        moodEmoji = '🌞';
        title = 'Warm & bright';
        desc = 'Strong warmth with bright, noticeable sunshine.';
        outfit = 'Light fabrics, short sleeves and breathable footwear.';
        comfortText = 'Warm but OK';
        vibe = 'Great for photos and quick outings – seek shade if out long.';
        greetEmoji = '📸';
        greetText = 'Perfect golden-hour photos incoming.';
    } else {
        moodEmoji = '🥵';
        title = 'Heavy, hot air';
        desc = 'Heat is noticeable and can get tiring if you stay out too long.';
        outfit = 'Ultra-light clothing, hat, sunglasses and plenty of water.';
        comfortText = 'Demanding weather';
        vibe = 'Limit long walks; pick shaded, ventilated spots.';
        greetEmoji = '🔥';
        greetText = 'Hydrate and slow the pace today.';
    }

    if (humidity >= 75) {
        desc += ' Humidity is high, so it may feel heavier than the number suggests.';
    } else if (humidity <= 35) {
        desc += ' Air is quite dry, so skincare and hydration help.';
    }

    if (cond.includes('rain')) {
        moodEmoji = '🌧️';
        desc = 'Soft rain layer over the city – calming if you don\'t mind getting a little wet.';
        outfit += ' Don’t forget a compact umbrella or waterproof layer.';
        vibe = 'Perfect playlist + umbrella weather.';
    } else if (cond.includes('snow')) {
        moodEmoji = '❄️';
        desc = 'Snow adds a quiet, cinematic filter to everything outside.';
        outfit += ' Choose insulated shoes with good grip.';
        vibe = 'Magical viewing weather – even from indoors.';
    } else if (cond.includes('storm') || cond.includes('thunder')) {
        moodEmoji = '⛈️';
        desc = 'Stormy and dramatic – best observed from a safe, cozy spot.';
        outfit += ' Only essential trips – prioritize waterproofs.';
        comfortText = 'Stay under a roof';
        vibe = 'Prime moment for blankets, candles and long calls.';
    } else if (cond.includes('fog') || cond.includes('mist')) {
        moodEmoji = '🌫️';
        desc = 'Low visibility and dreamy horizons – beautiful but be cautious if driving.';
        vibe = 'Great for photography, go slow on the roads.';
    }

    moodEmojiEl.textContent = moodEmoji;
    moodTitleEl.textContent = title;
    moodTextEl.textContent = desc;
    outfitTextEl.textContent = outfit;
    if (comfortLabelEl) comfortLabelEl.textContent = comfortText;
    if (summaryVibeEl) summaryVibeEl.textContent = vibe;
    if (greetingEmojiEl) greetingEmojiEl.textContent = greetEmoji;
    if (greetingTextEl) greetingTextEl.textContent = greetText;
}

function getWindDirection(deg) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index];
}

function updateCompass(windDeg) {
    const arrow = document.getElementById('wind-arrow');
    arrow.style.transform = `rotate(${windDeg}deg)`;

    // Highlight current direction
    const directions = ['compass-n', 'compass-e', 'compass-s', 'compass-w'];
    directions.forEach(id => document.getElementById(id).classList.remove('text-zinc-300', 'font-bold'));
    directions.forEach(id => document.getElementById(id).classList.add('text-zinc-500'));

    if (windDeg >= 315 || windDeg < 45) {
        document.getElementById('compass-n').classList.add('text-zinc-300', 'font-bold');
    } else if (windDeg >= 45 && windDeg < 135) {
        document.getElementById('compass-e').classList.add('text-zinc-300', 'font-bold');
    } else if (windDeg >= 135 && windDeg < 225) {
        document.getElementById('compass-s').classList.add('text-zinc-300', 'font-bold');
    } else {
        document.getElementById('compass-w').classList.add('text-zinc-300', 'font-bold');
    }
}

function updateAirQuality(data) {
    const aqi = data.list[0].main.aqi;
    const components = data.list[0].components;

    const aqiInfo = aqiLevels[aqi];
    document.getElementById('aqi-badge').textContent = aqiInfo.label;
    document.getElementById('aqi-badge').className = `text-white text-xs px-2 py-1 rounded ${aqiInfo.color}`;
    document.getElementById('aqi-desc').textContent = aqiInfo.desc;

    document.getElementById('co-level').textContent = components.co.toFixed(1) + ' ppm';
    document.getElementById('no2-level').textContent = components.no2.toFixed(1) + ' µg/m³';
    document.getElementById('o3-level').textContent = components.o3.toFixed(1) + ' µg/m³';
    document.getElementById('so2-level').textContent = components.so2.toFixed(1) + ' µg/m³';
}

function updateTodayOverview(data) {
    const todayContainer = document.getElementById('today-overview');
    todayContainer.innerHTML = '';

    const todayHours = data.list.slice(0, 8); // Next 24 hours (3-hour intervals)

    todayHours.forEach((hour, index) => {
        const time = new Date(hour.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const temp = Math.round(convertTemp(hour.main.temp));
        const emoji = weatherEmojis[hour.weather[0].icon] || '☁️';

        const hourDiv = document.createElement('div');
        hourDiv.className = 'text-center p-3 bg-zinc-800 rounded-lg';
        hourDiv.innerHTML = `
            <p class="text-zinc-400 text-sm mb-1">${time}</p>
            <div class="text-2xl mb-1">${emoji}</div>
            <p class="text-white font-semibold">${temp}°</p>
        `;
        todayContainer.appendChild(hourDiv);
    });
}

// Draw a simple temperature line chart (next 12 forecast points)
function updateTemperatureChart(data) {
    const canvas = document.getElementById('temp-chart');
    if (!canvas || !data || !data.list || !data.list.length) return;

    const ctx = canvas.getContext('2d');
    const points = data.list.slice(0, 12);
    if (points.length < 2) return;

    const temps = points.map(p => convertTemp(p.main.temp));
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    const paddingX = 18;
    const paddingTop = 10;
    const paddingBottom = 18;
    const w = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const h = canvas.height = canvas.offsetHeight * window.devicePixelRatio;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, w, h);

    const innerW = canvas.offsetWidth - paddingX * 2;
    const innerH = canvas.offsetHeight - paddingTop - paddingBottom;

    const normY = (t) => {
        if (maxT === minT) return paddingTop + innerH / 2;
        const ratio = (t - minT) / (maxT - minT);
        return paddingTop + innerH - ratio * innerH;
    };

    // Baseline grid + min/max labels
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 0.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(paddingX, normY(minT));
    ctx.lineTo(paddingX + innerW, normY(minT));
    ctx.moveTo(paddingX, normY(maxT));
    ctx.lineTo(paddingX + innerW, normY(maxT));
    ctx.stroke();
    ctx.setLineDash([]);

    // Update textual min/max helpers under chart
    const minLabel = document.getElementById('temp-chart-min');
    const maxLabel = document.getElementById('temp-chart-max');
    const midLabel = document.getElementById('temp-chart-mid');
    if (minLabel) minLabel.textContent = `Min: ${Math.round(minT)}${isCelsius ? '°C' : '°F'}`;
    if (maxLabel) maxLabel.textContent = `Max: ${Math.round(maxT)}${isCelsius ? '°C' : '°F'}`;
    if (midLabel) midLabel.textContent = 'Now →';

    // Line
    const gradient = ctx.createLinearGradient(paddingX, 0, paddingX + innerW, 0);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(0.5, '#a855f7');
    gradient.addColorStop(1, '#f97316');

    ctx.beginPath();
    points.forEach((p, idx) => {
        const x = paddingX + (innerW / (points.length - 1)) * idx;
        const y = normY(convertTemp(p.main.temp));
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Glow dots + light x-axis hour ticks
    ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(209, 213, 219, 0.8)';
    points.forEach((p, idx) => {
        const x = paddingX + (innerW / (points.length - 1)) * idx;
        const y = normY(convertTemp(p.main.temp));

        ctx.beginPath();
        ctx.arc(x, y, 2.3, 0, Math.PI * 2);
        ctx.fillStyle = '#f9fafb';
        ctx.fill();

        // Show label every 3rd point to keep chart readable
        if (idx % 3 === 0 || idx === points.length - 1) {
            const date = new Date(p.dt * 1000);
            const hrs = date.getHours().toString().padStart(2, '0');
            const label = `${hrs}:00`;
            ctx.fillStyle = 'rgba(209, 213, 219, 0.8)';
            ctx.fillText(label, x - 12, paddingTop + innerH + 10);
        }
    });
}

function updateTenDayForecast(data) {
    // Group forecast by day and render improved day cards
    const dailyForecasts = {};
    data.list.forEach(item => {
        const dateKey = new Date(item.dt * 1000).toDateString();
        if (!dailyForecasts[dateKey]) dailyForecasts[dateKey] = [];
        dailyForecasts[dateKey].push(item);
    });

    currentDailyForecasts = Object.keys(dailyForecasts).slice(0, 10).map((dateStr, index) => {
        const dayData = dailyForecasts[dateStr];
        const temps = dayData.map(d => d.main.temp);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        const weather = dayData[0].weather[0];
        const iconCode = weather.icon;
        const iconClass = weatherIcons[iconCode] || 'ph-cloud';
        const date = new Date(dateStr);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        return { dateStr, dayName, minTemp, maxTemp, iconClass, dayData };
    });

    const listEl = document.getElementById('ten-day-list');
    listEl.innerHTML = '';

    currentDailyForecasts.forEach((d, idx) => {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.setAttribute('data-day-idx', idx);
        card.innerHTML = `
            <div class="day-name">${d.dayName}</div>
            <div class="text-3xl"> <i class="ph ${d.iconClass}"></i> </div>
            <div class="day-temp">${Math.round(convertTemp(d.maxTemp))}°</div>
            <div class="day-sub">H ${Math.round(convertTemp(d.maxTemp))}° • L ${Math.round(convertTemp(d.minTemp))}°</div>
        `;
        card.addEventListener('click', () => {
            // mark active
            document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            showDayDetail(idx);
        });
        listEl.appendChild(card);
    });

    // auto-select first day
    if (currentDailyForecasts.length > 0) {
        setTimeout(() => {
            const first = document.querySelector('.day-card');
            if (first) { first.classList.add('active'); showDayDetail(0); }
        }, 80);
    }
}

function showDayDetail(index) {
    const detailEl = document.getElementById('day-detail');
    const day = currentDailyForecasts[index];
    if (!day) { detailEl.classList.add('hidden'); return; }
    detailEl.classList.remove('hidden');
    // Build header
    detailEl.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div>
                <div class="text-white font-semibold text-lg">${day.dayName} — ${new Date(day.dateStr).toLocaleDateString()}</div>
                <div class="text-zinc-400 text-sm">High ${Math.round(convertTemp(day.maxTemp))} • Low ${Math.round(convertTemp(day.minTemp))}</div>
            </div>
            <div class="flex items-center gap-2">
                <button id="prev-day" class="px-2 py-1 rounded bg-zinc-800">Prev</button>
                <button id="next-day" class="px-2 py-1 rounded bg-zinc-800">Next</button>
            </div>
        </div>
        <div class="grid grid-cols-1 gap-2">
        </div>
    `;

    const hoursContainer = detailEl.querySelector('.grid');
    day.dayData.forEach(hour => {
        const timeStr = new Date(hour.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true });
        const temp = Math.round(convertTemp(hour.main.temp));
        const emoji = weatherEmojis[hour.weather[0].icon] || '☁️';
        const row = document.createElement('div');
        row.className = 'day-detail-hour flex items-center justify-between';
        row.innerHTML = `
            <div class="hour-time">${timeStr}</div>
            <div class="flex items-center gap-3"><div class="text-2xl">${emoji}</div><div class="hour-temp">${temp}°</div></div>
            <div class="text-zinc-400">${hour.weather[0].description}</div>
        `;
        hoursContainer.appendChild(row);
    });

    // Prev/Next handlers
    document.getElementById('prev-day').onclick = () => {
        const newIdx = Math.max(0, index - 1);
        document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
        const el = document.querySelector(`.day-card[data-day-idx="${newIdx}"]`);
        if (el) el.classList.add('active');
        showDayDetail(newIdx);
    };
    document.getElementById('next-day').onclick = () => {
        const newIdx = Math.min(currentDailyForecasts.length - 1, index + 1);
        document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
        const el = document.querySelector(`.day-card[data-day-idx="${newIdx}"]`);
        if (el) el.classList.add('active');
        showDayDetail(newIdx);
    };
}

function updateHourlyForecast(data) {
    const hourlyContainer = document.getElementById('hourly-forecast');
    hourlyContainer.innerHTML = '';

    const next24Hours = data.list.slice(0, 6); // Next 6 hours (3-hour intervals)

    next24Hours.forEach((hour, index) => {
        const time = index === 0 ? 'Now' : new Date(hour.dt * 1000).getHours() + ':00';
        const temp = Math.round(convertTemp(hour.main.temp));
        const iconCode = hour.weather[0].icon;
        const iconClass = weatherIcons[iconCode] || 'ph-cloud';
        const emoji = weatherEmojis[iconCode] || '☁️';

        const hourDiv = document.createElement('div');
        hourDiv.className = 'text-center p-4';
        hourDiv.innerHTML = `
            <p class="text-zinc-400 text-sm mb-2">${time}</p>
            <div class="text-2xl mb-2">${emoji}</div>
            <p class="text-white font-semibold">${temp}°</p>
        `;
        hourlyContainer.appendChild(hourDiv);
    });
}

// Render the favorites list with explicit remove controls
function updateFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.innerHTML = '';

    if (!Array.isArray(favorites)) favorites = [];

    // show message when no favorites
    if (favorites.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'text-zinc-500 text-sm';
        empty.textContent = 'No favorites yet — add your city by clicking the heart.';
        favoritesList.appendChild(empty);
        return;
    }

    favorites.forEach(async (city) => {
        try {
            const data = await fetchWeather(city);
            const displayName = data && data.name ? data.name : city;

            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-zinc-800 p-3 rounded-lg hover:bg-zinc-700 transition-colors';

            // left: city name (click to load), middle: temp, right: remove button
            const left = document.createElement('div');
            left.className = 'flex items-center gap-3 cursor-pointer';
            left.innerHTML = `<span class="text-zinc-200">${displayName}</span>`;
            left.addEventListener('click', () => loadCityWeather(displayName));

            const middle = document.createElement('div');
            middle.innerHTML = `<span class="text-white font-semibold">${data ? formatTemp(data.main.temp) : '—'}</span>`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-zinc-400 hover:text-red-500 ml-3 px-2 py-1 rounded';
            removeBtn.setAttribute('aria-label', `Remove ${displayName} from favorites`);
            removeBtn.innerHTML = `<i class="ph ph-x-circle"></i>`;
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent parent click
                removeFavorite(displayName);
            });

            li.appendChild(left);
            li.appendChild(middle);
            li.appendChild(removeBtn);

            favoritesList.appendChild(li);
        } catch (err) {
            console.error('Failed to render favorite', city, err);
        }
    });
}

function updateFavoriteButton() {
    const favoriteBtn = document.getElementById('favorite-btn');
    const isFavorite = favorites.includes(currentCity);
    favoriteBtn.innerHTML = `<i class="ph ph-heart${isFavorite ? '-fill' : ''} text-lg"></i>`;
    favoriteBtn.classList.toggle('text-red-500', isFavorite);
    favoriteBtn.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
    favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
}

// Event Handlers
async function loadCityWeather(city) {
    const weatherData = await fetchWeather(city);
    const forecastData = await fetchForecast(city);

    if (weatherData) {
        updateCurrentWeather(weatherData);
        hideSearchError(); // Hide error on successful load
    }
    if (forecastData) {
        currentForecastData = forecastData;
        updateHourlyForecast(forecastData);
        updateTodayOverview(forecastData);
        updateTenDayForecast(forecastData);
        updateTemperatureChart(forecastData);
    }
}

function toggleUnits() {
    isCelsius = !isCelsius;
    const celsiusBtn = document.getElementById('celsius-btn');
    const fahrenheitBtn = document.getElementById('fahrenheit-btn');

    // Smooth background video loop handler
    const bgVideo = document.getElementById('bg-video');
    if (bgVideo) {
        try {
            bgVideo.preload = 'auto';
            bgVideo.playsInline = true;
            // Ensure small jump by seeking slightly before end and continuing
            const LOOP_THRESHOLD = 0.15; // seconds before end to jump
            let isSeeking = false;
            bgVideo.addEventListener('timeupdate', () => {
                if (!bgVideo.duration || isSeeking) return;
                if (bgVideo.duration - bgVideo.currentTime <= LOOP_THRESHOLD) {
                    isSeeking = true;
                    // set small positive time to avoid black frame
                    bgVideo.currentTime = 0.05;
                    bgVideo.play().finally(() => { isSeeking = false; });
                }
            });
            // fallback if ended fires
            bgVideo.addEventListener('ended', () => { bgVideo.currentTime = 0.05; bgVideo.play(); });
        } catch (e) { console.warn('Video loop handler failed', e); }
    }

    if (isCelsius) {
        celsiusBtn.className = 'bg-blue-600 text-white px-3 py-1 rounded text-sm';
        fahrenheitBtn.className = 'bg-zinc-700 text-zinc-200 px-3 py-1 rounded text-sm hover:bg-zinc-600';
    } else {
        celsiusBtn.className = 'bg-zinc-700 text-zinc-200 px-3 py-1 rounded text-sm hover:bg-zinc-600';
        fahrenheitBtn.className = 'bg-blue-600 text-white px-3 py-1 rounded text-sm';
    }

    // Refresh current data with new units
    if (currentWeatherData) {
        updateCurrentWeather(currentWeatherData);
    }
    if (currentForecastData) {
        updateHourlyForecast(currentForecastData);
        updateTodayOverview(currentForecastData);
        updateTenDayForecast(currentForecastData);
    }
    updateFavorites();
}

// Add/remove helpers
function addFavorite(city) {
    if (!city) return;
    if (!Array.isArray(favorites)) favorites = [];
    // normalize names to avoid simple duplicates
    if (!favorites.includes(city)) {
        favorites.push(city);
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        updateFavoriteButton();
        updateFavorites();
    }
}

function removeFavorite(city) {
    if (!city || !Array.isArray(favorites)) return;
    const normalized = city;
    favorites = favorites.filter(c => c !== normalized);
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    updateFavoriteButton();
    updateFavorites();
}

function toggleFavorite() {
    if (favorites.includes(currentCity)) {
        removeFavorite(currentCity);
    } else {
        addFavorite(currentCity);
    }
}

async function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const weatherData = await fetchWeatherByCoords(latitude, longitude);
            const forecastData = await fetchForecastByCoords(latitude, longitude);

            if (weatherData) {
                updateCurrentWeather(weatherData);
            }
            if (forecastData) {
                updateHourlyForecast(forecastData);
                updateTodayOverview(forecastData);
                updateTenDayForecast(forecastData);
                updateTemperatureChart(forecastData);
            }
        }, (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location.';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please allow location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable. Please try again.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out. Please try again.';
                    break;
            }
            showLocationError(errorMessage);
        });
    } else {
        showLocationError('Geolocation is not supported by this browser.');
    }
}


// Error Handling Functions
function showSearchError(message) {
    const errorDiv = document.getElementById('search-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideSearchError() {
    const errorDiv = document.getElementById('search-error');
    errorDiv.classList.add('hidden');
}

function showLocationError(message) {
    const errorDiv = document.getElementById('location-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideLocationError() {
    const errorDiv = document.getElementById('location-error');
    errorDiv.classList.add('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const commandMenu = document.getElementById('command-menu');
    const commandInput = document.getElementById('command-input');
    const citySearch = document.getElementById('city-search');
    const currentLocationBtn = document.getElementById('current-location-btn');
    const favoriteBtn = document.getElementById('favorite-btn');

    const celsiusBtn = document.getElementById('celsius-btn');
    const fahrenheitBtn = document.getElementById('fahrenheit-btn');

    // Update time every minute
    updateTime();
    setInterval(updateTime, 60000);

    // Load initial data
    loadCityWeather(currentCity);
    updateFavorites();

    // Event listeners
    citySearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = citySearch.value.trim();
            if (city) {
                loadCityWeather(city);
                citySearch.value = '';
            }
        }
    });

    citySearch.addEventListener('input', hideSearchError); // Hide error when user starts typing

    currentLocationBtn.addEventListener('click', () => {
        hideLocationError(); // Hide previous errors
        getCurrentLocation();
    });

    favoriteBtn.addEventListener('click', toggleFavorite);

    celsiusBtn.addEventListener('click', toggleUnits);
    fahrenheitBtn.addEventListener('click', toggleUnits);

    // --- Theme Toggling ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 't' && e.target.tagName !== 'INPUT') {
            document.documentElement.classList.toggle('dark');
        }
    });

    // --- Command Menu ---
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
            e.preventDefault();
            commandMenu.classList.remove('hidden');
            commandInput.focus();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            commandMenu.classList.add('hidden');
        }
    });

    commandMenu.addEventListener('click', (e) => {
        if (e.target === commandMenu) {
            commandMenu.classList.add('hidden');
        }
    });
});