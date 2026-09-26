import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

const TOKEN_KEY = 'wm_access_token'
const REFRESH_KEY = 'wm_refresh_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem(TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function fetchPlaces(category = 'all') {
  const { data } = await api.get('/places/', { params: { category } })
  return data
}

export async function refreshPlaces() {
  const { data } = await api.post('/places/refresh/')
  return data
}

export async function fetchPlaceDetail(osmId) {
  const { data } = await api.get(`/places/${osmId}/`)
  return data
}

export async function registerUser(username, password, email) {
  const { data } = await api.post('/auth/register/', { username, password, email })
  setTokens(data.access, data.refresh)
  return data
}

export async function loginUser(username, password) {
  const { data } = await api.post('/auth/login/', { username, password })
  setTokens(data.access, data.refresh)
  return data
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me/')
  return data
}

export async function fetchVisited() {
  const { data } = await api.get('/visited/')
  return data
}

export async function toggleVisitedPlace(osmId) {
  const { data } = await api.post('/visited/toggle/', { osm_id: osmId })
  return data
}

const WEATHER_CODES = {
  113: ['☀️', 'Ясно'], 116: ['⛅', 'Перем. облачность'], 119: ['☁️', 'Пасмурно'], 122: ['☁️', 'Сильная облачность'],
  143: ['🌫️', 'Туман'], 176: ['🌦️', 'Морось'], 179: ['🌨️', 'Снег с дождём'],
  200: ['⛈️', 'Гроза'], 227: ['🌨️', 'Снег'], 230: ['❄️', 'Сильный снег'],
  248: ['🌫️', 'Туман'], 260: ['🌫️', 'Изморозь'],
  263: ['🌦️', 'Морось'], 266: ['🌦️', 'Морось'],
  281: ['🌧️', 'Дождь'], 284: ['🌧️', 'Сильный дождь'],
  293: ['🌧️', 'Небольшой дождь'], 296: ['🌧️', 'Небольшой дождь'],
  299: ['🌧️', 'Дождь'], 302: ['🌧️', 'Дождь'],
  305: ['🌧️', 'Сильный дождь'], 308: ['🌧️', 'Сильный дождь'],
  311: ['🌧️', 'Ливень'], 314: ['🌧️', 'Ливень'],
  317: ['🌨️', 'Снег с дождём'], 320: ['🌨️', 'Снег'],
  323: ['🌨️', 'Небольшой снег'], 326: ['🌨️', 'Небольшой снег'],
  329: ['❄️', 'Сильный снег'], 332: ['❄️', 'Сильный снег'], 335: ['❄️', 'Сильный снег'], 338: ['❄️', 'Снег'],
  350: ['🌧️', 'Ливень'], 353: ['🌧️', 'Небольшой дождь'],
  356: ['🌧️', 'Ливень'], 359: ['🌧️', 'Сильный ливень'],
  362: ['🌨️', 'Снег с дождём'], 365: ['🌨️', 'Снег с дождём'],
  368: ['🌨️', 'Небольшой снег'], 371: ['❄️', 'Сильный снег'],
  374: ['🌨️', 'Снег с дождём'], 377: ['🌨️', 'Снег с дождём'],
  386: ['⛈️', 'Гроза с дождём'], 389: ['⛈️', 'Гроза с градом'],
  392: ['⛈️', 'Гроза со снегом'], 395: ['❄️', 'Сильный снег'],
}

const WIND_DIRS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']

function windDir(deg) {
  if (deg == null) return ''
  return WIND_DIRS[Math.round((parseInt(deg) + 22.5) / 45) % 8]
}

function getWeekendDates() {
  const today = new Date()
  const day = today.getDay()
  let sat = new Date(today)
  let sun = new Date(today)
  if (day === 6) { sat = today; sun = new Date(today.getTime() + 86400000) }
  else if (day === 0) { sat = new Date(today.getTime() - 86400000); sun = today }
  else { const d = 6 - day; sat = new Date(today.getTime() + d * 86400000); sun = new Date(sat.getTime() + 86400000) }
  return [sat.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)]
}

function scoreWeather(w) {
  if (!w) return -1
  let score = 100
  const c = w.code
  if (c === 113) score += 30
  else if (c === 116) score += 20
  else if (c === 119 || c === 122) score += 5
  else if (c === 143 || c === 248 || c === 260) score -= 15
  else if (c === 176 || c === 263 || c === 266) score -= 25
  else if (c === 293 || c === 296 || c === 353) score -= 30
  else if (c === 299 || c === 302 || c === 281) score -= 40
  else if (c === 305 || c === 308 || c === 284 || c === 356) score -= 60
  else if (c === 323 || c === 326 || c === 368) score -= 20
  else if (c === 329 || c === 332 || c === 335 || c === 371 || c === 230) score -= 35
  else if (c === 200 || c === 386 || c === 389 || c === 392 || c === 395) score -= 70
  if (w.precip > 0) score -= w.precip * 10
  if (w.wind > 10) score -= (w.wind - 10) * 3
  const t = w.temp_max
  if (t != null) {
    if (t >= 18 && t <= 26) score += 15
    else if (t >= 10 && t < 18) score += 5
    else if (t > 30) score -= 20
    else if (t < 5) score -= 15
  }
  return Math.max(0, Math.min(100, score))
}

function recommendText(score) {
  if (score >= 80) return 'Отличная погода — обязательно посетите!'
  if (score >= 60) return 'Хорошая погода, стоит съездить'
  if (score >= 40) return 'Погода средняя, но поездка возможна'
  if (score >= 20) return 'Погода не очень, лучше выбрать другой день'
  return 'Плохая погода, лучше не ехать'
}

const weatherCache = new Map()

export async function fetchPlaceWeather(osmId, lat, lon) {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`
  if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey)

  const [satDate, sunDate] = getWeekendDates()

  try {
    const resp = await fetch(`https://wttr.in/${lat},${lon}?format=j1`, {
      headers: { 'User-Agent': 'curl/7.0' },
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const weatherArr = data.weather || []
    const result = { saturday: null, sunday: null }

    for (const day of weatherArr) {
      const d = day.date
      if (!d) continue
      const hourly = day.hourly || []
      const temps = hourly.map(h => parseInt(h.tempC)).filter(t => !isNaN(t))
      const tempMax = temps.length ? Math.max(...temps) : null
      const tempMin = temps.length ? Math.min(...temps) : null
      const winds = hourly.map(h => parseFloat(h.windspeedKmph)).filter(w => !isNaN(w))
      const windMax = winds.length ? Math.max(...winds) : 0
      let windDirVal = null
      const midday = hourly.find(h => h.time === '1200') || hourly[Math.floor(hourly.length / 2)]
      if (midday) windDirVal = midday.winddirDegree
      let precip = parseFloat(day.totalSnow_cm || 0) * 10
      for (const h of hourly) precip += parseFloat(h.precipMM || 0)
      let codeVal = 0
      if (midday) codeVal = parseInt(midday.weatherCode || 0)
      const [emoji, desc] = WEATHER_CODES[codeVal] || ['❓', 'Неизвестно']

      const info = {
        date: d, emoji, desc, code: codeVal,
        temp_max: tempMax, temp_min: tempMin,
        precip: Math.round(precip * 10) / 10,
        wind: Math.round(windMax * 0.28 * 10) / 10,
        wind_dir: windDir(windDirVal),
      }
      if (d === satDate) result.saturday = info
      if (d === sunDate) result.sunday = info
    }

    weatherCache.set(cacheKey, result)
    return result
  } catch {
    return null
  }
}

export async function fetchAllWeather(places) {
  const results = []
  for (const place of places) {
    const weather = await fetchPlaceWeather(place.osm_id, place.lat, place.lon)
    if (!weather) continue
    const satScore = scoreWeather(weather.saturday)
    const sunScore = scoreWeather(weather.sunday)
    const bestDay = satScore >= sunScore ? 'saturday' : 'sunday'
    const bestScore = Math.max(satScore, sunScore)
    results.push({
      ...place,
      weather,
      best_day: bestDay,
      best_day_label: bestDay === 'saturday' ? 'Суббота' : 'Воскресенье',
      score: bestScore,
      recommendation: recommendText(bestScore),
    })
    await new Promise(r => setTimeout(r, 200))
  }
  results.sort((a, b) => b.score - a.score)
  return results
}
