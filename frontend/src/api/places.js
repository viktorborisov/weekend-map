import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
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
