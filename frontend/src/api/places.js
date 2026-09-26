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

export async function fetchWeatherRecommendations() {
  const { data } = await api.get('/weather/recommendations/', { timeout: 30000 })
  return data.recommendations || []
}

let _recsCache = null
let _recsCacheTime = 0

export async function fetchPlaceWeather(osmId, lat, lon) {
  const now = Date.now()
  if (!_recsCache || now - _recsCacheTime > 600000) {
    _recsCache = await fetchWeatherRecommendations()
    _recsCacheTime = now
  }
  const found = _recsCache.find(r => r.osm_id === osmId)
  return found ? found.weather : null
}

export async function fetchAllWeather(places) {
  _recsCache = await fetchWeatherRecommendations()
  _recsCacheTime = Date.now()
  return _recsCache
}
