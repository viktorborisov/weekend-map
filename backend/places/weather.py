import json
import subprocess
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.core.cache import cache

WTTR_URL = "https://wttr.in"

WEATHER_CODES = {
    113: ('☀️', 'Ясно'),
    116: ('⛅', 'Переменная облачность'),
    119: ('☁️', 'Пасмурно'),
    122: ('☁️', 'Сильная облачность'),
    143: ('🌫️', 'Туман'),
    176: ('🌦️', 'Морось'),
    179: ('🌨️', 'Снег с дождём'),
    182: ('🌨️', 'Снег с дождём'),
    185: ('🌨️', 'Снег с дождём'),
    200: ('⛈️', 'Гроза'),
    227: ('🌨️', 'Снег'),
    230: ('❄️', 'Сильный снег'),
    248: ('🌫️', 'Туман'),
    260: ('🌫️', 'Изморозь'),
    263: ('🌦️', 'Морось'),
    266: ('🌦️', 'Морось'),
    281: ('🌧️', 'Дождь'),
    284: ('🌧️', 'Сильный дождь'),
    293: ('🌧️', 'Небольшой дождь'),
    296: ('🌧️', 'Небольшой дождь'),
    299: ('🌧️', 'Дождь'),
    302: ('🌧️', 'Дождь'),
    305: ('🌧️', 'Сильный дождь'),
    308: ('🌧️', 'Сильный дождь'),
    311: ('🌧️', 'Ливень'),
    314: ('🌧️', 'Ливень'),
    317: ('🌨️', 'Снег с дождём'),
    320: ('🌨️', 'Снег'),
    323: ('🌨️', 'Небольшой снег'),
    326: ('🌨️', 'Небольшой снег'),
    329: ('❄️', 'Сильный снег'),
    332: ('❄️', 'Сильный снег'),
    335: ('❄️', 'Сильный снег'),
    338: ('❄️', 'Снег'),
    350: ('🌧️', 'Ливень'),
    353: ('🌧️', 'Небольшой дождь'),
    356: ('🌧️', 'Ливень'),
    359: ('🌧️', 'Сильный ливень'),
    362: ('🌨️', 'Снег с дождём'),
    365: ('🌨️', 'Снег с дождём'),
    368: ('🌨️', 'Небольшой снег'),
    371: ('❄️', 'Сильный снег'),
    374: ('🌨️', 'Снег с дождём'),
    377: ('🌨️', 'Снег с дождём'),
    386: ('⛈️', 'Гроза с дождём'),
    389: ('⛈️', 'Гроза с градом'),
    392: ('⛈️', 'Гроза со снегом'),
    395: ('❄️', 'Сильный снег'),
}

WIND_DIRECTIONS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']


def _wind_dir(deg):
    if deg is None:
        return ''
    return WIND_DIRECTIONS[int((int(deg) + 22.5) / 45) % 8]


def _parse_wttr_code(code):
    code = int(code) if code else 0
    return WEATHER_CODES.get(code, ('❓', 'Неизвестно'))


def get_weekend_dates():
    today = datetime.now().date()
    days_until_saturday = (5 - today.weekday()) % 7
    if days_until_saturday == 0 and today.weekday() == 5:
        saturday = today
        sunday = today + timedelta(days=1)
    elif days_until_saturday == 0:
        saturday = today + timedelta(days=6)
        sunday = saturday + timedelta(days=1)
    else:
        saturday = today + timedelta(days=days_until_saturday)
        sunday = saturday + timedelta(days=1)
    return saturday, sunday


def fetch_weather_for_place(lat, lon):
    cache_key = f"weather_{lat:.2f}_{lon:.2f}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    sat, sun = get_weekend_dates()
    sat_str = sat.strftime('%Y-%m-%d')
    sun_str = sun.strftime('%Y-%m-%d')

    try:
        result = subprocess.run(
            ['curl', '-s', '--max-time', '10', '-H', 'User-Agent: curl/7.0',
             f'{WTTR_URL}/{lat},{lon}?format=j1'],
            capture_output=True, timeout=12,
        )
        if result.returncode != 0 or not result.stdout:
            return None
        data = json.loads(result.stdout)
    except Exception:
        return None

    weather_data = data.get('weather', [])

    sat_weather = None
    sun_weather = None

    for day in weather_data:
        d = day.get('date')
        if not d:
            continue

        hourly = day.get('hourly', [])

        temps = [int(h.get('tempC', 0)) for h in hourly if h.get('tempC')]
        temp_max = max(temps) if temps else None
        temp_min = min(temps) if temps else None

        winds = [float(h.get('windspeedKmph', 0)) for h in hourly if h.get('windspeedKmph')]
        wind_max = max(winds) if winds else 0

        wind_dir_val = None
        for h in hourly:
            if h.get('time') == '1200':
                wind_dir_val = h.get('winddirDegree')
                break
        if not wind_dir_val and hourly:
            wind_dir_val = hourly[len(hourly)//2].get('winddirDegree')

        precip_mm = float(day.get('totalSnow_cm', 0) or 0) * 10
        for h in hourly:
            precip_mm += float(h.get('precipMM', 0) or 0)

        code_val = 0
        for h in hourly:
            if h.get('time') == '1200':
                code_val = int(h.get('weatherCode', 0) or 0)
                break
        if not code_val and hourly:
            code_val = int(hourly[len(hourly)//2].get('weatherCode', 0) or 0)

        emoji, desc = _parse_wttr_code(code_val)

        info = {
            'date': d,
            'emoji': emoji,
            'desc': desc,
            'code': code_val,
            'temp_max': temp_max,
            'temp_min': temp_min,
            'precip': round(precip_mm, 1),
            'wind': round(wind_max * 0.28, 1),
            'wind_dir': _wind_dir(wind_dir_val),
        }

        if d == sat_str:
            sat_weather = info
        if d == sun_str:
            sun_weather = info

    result = {
        'saturday': sat_weather,
        'sunday': sun_weather,
    }

    cache.set(cache_key, result, timeout=3600)
    return result


def _score_weather(w):
    if not w:
        return -1
    score = 100
    code = w.get('code', 0)

    if code == 113:
        score += 30
    elif code == 116:
        score += 20
    elif code in (119, 122):
        score += 5
    elif code in (143, 248, 260):
        score -= 15
    elif code in (176, 263, 266):
        score -= 25
    elif code in (293, 296, 353):
        score -= 30
    elif code in (299, 302, 281):
        score -= 40
    elif code in (305, 308, 284, 356):
        score -= 60
    elif code in (323, 326, 368):
        score -= 20
    elif code in (329, 332, 335, 371, 230):
        score -= 35
    elif code in (200, 386, 389, 392, 395):
        score -= 70

    precip = w.get('precip', 0)
    if precip > 0:
        score -= precip * 10

    wind = w.get('wind', 0)
    if wind > 10:
        score -= (wind - 10) * 3

    temp = w.get('temp_max')
    if temp is not None:
        if 18 <= temp <= 26:
            score += 15
        elif 10 <= temp < 18:
            score += 5
        elif temp > 30:
            score -= 20
        elif temp < 5:
            score -= 15

    return max(0, min(100, score))


def _recommend_text(score, weather):
    if not weather:
        return 'Нет данных'
    if score >= 80:
        return 'Отличная погода — обязательно посетите!'
    elif score >= 60:
        return 'Хорошая погода, стоит съездить'
    elif score >= 40:
        return 'Погода средняя, но поездка возможна'
    elif score >= 20:
        return 'Погода не очень, лучше выбрать другой день'
    else:
        return 'Плохая погода, лучше не ехать'


WEATHER_STATIONS = [
    (59.95, 31.03),
    (59.57, 30.11),
    (59.71, 29.03),
    (59.99, 32.30),
    (60.72, 28.73),
    (61.03, 30.12),
    (60.26, 29.61),
    (60.78, 33.54),
    (58.74, 29.85),
    (59.47, 33.85),
    (59.37, 28.21),
    (60.92, 34.19),
]


def _nearest_station(lat, lon):
    best = WEATHER_STATIONS[0]
    best_dist = float('inf')
    for s_lat, s_lon in WEATHER_STATIONS:
        d = (s_lat - lat) ** 2 + (s_lon - lon) ** 2
        if d < best_dist:
            best_dist = d
            best = (s_lat, s_lon)
    return best


def get_recommendations():
    from .models import CachedPlace

    station_weather = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(fetch_weather_for_place, s_lat, s_lon): (s_lat, s_lon)
            for s_lat, s_lon in WEATHER_STATIONS
        }
        for future in as_completed(futures, timeout=60):
            try:
                w = future.result()
                if w:
                    station_weather[futures[future]] = w
            except Exception:
                pass

    if not station_weather:
        return []

    places = CachedPlace.objects.all().order_by('name')

    results = []
    for place in places:
        st = _nearest_station(place.lat, place.lon)
        weather = station_weather.get(st)
        if not weather:
            continue

        sat_score = _score_weather(weather.get('saturday'))
        sun_score = _score_weather(weather.get('sunday'))

        best_day = 'saturday' if sat_score >= sun_score else 'sunday'
        best_score = max(sat_score, sun_score)
        best_weather = weather.get(best_day)

        results.append({
            'osm_id': place.osm_id,
            'name': place.name,
            'category': place.category,
            'lat': place.lat,
            'lon': place.lon,
            'photo': place.display_photo,
            'weather': weather,
            'best_day': best_day,
            'best_day_label': 'Суббота' if best_day == 'saturday' else 'Воскресенье',
            'score': best_score,
            'recommendation': _recommend_text(best_score, best_weather),
        })

    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:10]
