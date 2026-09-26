import { useState, useCallback } from 'react'
import { fetchAllWeather } from '../api/places'

export function useWeather(places) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPanel, setShowPanel] = useState(false)

  const load = useCallback(async () => {
    if (!places.length) return
    setLoading(true)
    setError(null)
    try {
      const recs = await fetchAllWeather(places)
      setRecommendations(recs)
    } catch (e) {
      const msg = e.response?.data?.error || 'Сервис погоды временно недоступен. Попробуйте позже.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [places])

  return {
    recommendations,
    loading,
    error,
    showPanel,
    setShowPanel,
    reload: load,
  }
}
