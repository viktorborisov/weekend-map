import { useState, useEffect, useCallback } from 'react'
import { fetchPlaces, refreshPlaces } from '../api/places'

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('all')

  const load = useCallback(async (cat = category) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPlaces(cat)
      setPlaces(data.places || [])
    } catch (e) {
      setError(e.message || 'Ошибка загрузки мест')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    load()
  }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      await refreshPlaces()
      await new Promise(r => setTimeout(r, 5000))
      await load()
    } catch (e) {
      if (e.response?.status === 409) {
        setError('Обновление уже выполняется, подождите...')
      } else {
        setError('Не удалось обновить данные с Overpass API. Показаны сохранённые места.')
      }
    } finally {
      setRefreshing(false)
    }
  }

  return {
    places,
    loading,
    refreshing,
    error,
    category,
    setCategory,
    reload: load,
    refresh: handleRefresh,
  }
}
