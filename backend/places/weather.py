import requests
from datetime import datetime, timedelta
from django.core.cache import cache

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Open-Meteo WMO weather codes
WMO_CODES = {
    0: ('☀️', 'Ясно'),
    1: ('🌤️', 'Преимущественно ясно'),
    2: ('⛅', 'Переменная облачность'),
    3: ('☁️', 'Пасмурно'),
    45: ('🌫️', 'Туман'),
    48: ('🌫️', 'Изморозь'),
    51: ('🌦️', 'Морось'),
    53: ('🌦️', 'Морось'),
    55: ('🌦️', 'Сильная морось'),
    56: ('🌧️', 'Ледяная морось'),
    57: ('🌧️', 'Сильная ледяная морось'),
    61: ('🌧️', 'Небольшой дождь'),
    63: ('🌧️', 'Дождь'),
    65: ('🌧️', 'Сильный дождь'),
    66: ('🌧️', 'Ледяной дождь'),
    67: ('🌧️', 'Сильный ледяной дождь'),
    71: ('🌨️', 'Небольшой снег'),
    73: ('🌨️', 'Снег'),
    75: ('❄️', 'Сильный снег'),
    77: ('🌨️', 'Снежная крупа'),
    80: ('🌧️', 'Небольшой ливень'),
    81: ('🌧️', 'Ливень'),
    82: ('🌧️', 'Сильный ливень'),
    85: ('🌨️', 'Небольшой снегопад'),
    86: ('❄️', 'Сильный снегопад'),
    95: ('⛈️', 'Гроза'),
    96: ('⛈️', 'Гроза с градом'),
    99: ('⛈️', 'Сильная гроза с градом'),
}

WIND_DIRECTIONS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']


def _wind_dir(deg):
    if deg is None:
        return ''
    return WIND_DIRECTIONS[int((int(deg) + 22.5) / 45) % 8]


def _parse_wmo_code(code):
    code = int(code) if code is not None else 0
    return WMO_CODES.get(code, ('❓', 'Неизвестно'))


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
        resp = requests.get(
            OPEN_METEO_URL,
            params={
                'latitude': lat,
                'longitude': lon,
                'daily': 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant',
                'timezone': 'Europe/Moscow',
                'forecast_days': 7,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return None

    daily = data.get('daily', {})
    dates = daily.get('time', [])
    codes = daily.get('weather_code', [])
    t_max = daily.get('temperature_2m_max', [])
    t_min = daily.get('temperature_2m_min', [])
    precip = daily.get('precipitation_sum', [])
    wind_max = daily.get('wind_speed_10m_max', [])
    wind_dir = daily.get('wind_direction_10m_dominant', [])

    sat_weather = None
    sun_weather = None

    for i, d in enumerate(dates):
        code_val = codes[i] if i < len(codes) else 0
        emoji, desc = _parse_wmo_code(code_val)

        info = {
            'date': d,
            'emoji': emoji,
            'desc': desc,
            'code': int(code_val),
            'temp_max': int(t_max[i]) if i < len(t_max) and t_max[i] is not None else None,
            'temp_min': int(t_min[i]) if i < len(t_min) and t_min[i] is not None else None,
            'precip': round(float(precip[i] or 0), 1) if i < len(precip) else 0,
            'wind': round(float(wind_max[i] or 0), 1) if i < len(wind_max) else 0,
            'wind_dir': _wind_dir(wind_dir[i] if i < len(wind_dir) else None),
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

    if code == 0:
        score += 30
    elif code in (1, 2):
        score += 20
    elif code == 3:
        score += 5
    elif code in (45, 48):
        score -= 15
    elif code in (51, 53):
        score -= 25
    elif code in (55, 56, 57):
        score -= 35
    elif code in (61, 80):
        score -= 30
    elif code in (63, 81):
        score -= 40
    elif code in (65, 66, 67, 82):
        score -= 60
    elif code in (71, 73, 85):
        score -= 20
    elif code in (75, 86):
        score -= 35
    elif code in (77,):
        score -= 20
    elif code in (95, 96, 99):
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


# Reference weather stations — one request per station covers nearby places
WEATHER_STATIONS = [
    (59.95, 31.03),   # SPb
    (59.57, 30.11),   # SW
    (59.71, 29.03),   # W
    (59.99, 32.30),   # E
    (60.72, 28.73),   # NW (Vyborg)
    (61.03, 30.12),   # N (Priozersk)
    (60.26, 29.61),   # NW mid
    (60.78, 33.54),   # NE (Lodeynoye Pole)
    (58.74, 29.85),   # SW (Gdov)
    (59.47, 33.85),   # SE (Tikhvin)
    (59.37, 28.21),   # SW far (Kingisepp)
    (60.92, 34.19),   # NE far (Svir)
]

_station_cache = {}


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

    # Fetch weather for all stations
    station_weather = {}
    for s_lat, s_lon in WEATHER_STATIONS:
        w = fetch_weather_for_place(s_lat, s_lon)
        if w:
            station_weather[(s_lat, s_lon)] = w

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
