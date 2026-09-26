import { useState, useCallback, useEffect } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import AuthForm from './components/AuthForm'
import WeatherPanel from './components/WeatherPanel'
import { usePlaces } from './hooks/usePlaces'
import { useAuth } from './hooks/useAuth'
import { useWeather } from './hooks/useWeather'
import { toggleVisitedPlace, fetchPlaceWeather } from './api/places'
import './styles/main.css'

export default function App() {
  const {
    places,
    loading,
    refreshing,
    error,
    category,
    setCategory,
    reload,
    refresh,
  } = usePlaces()

  const { user, loading: authLoading, register, login, logout } = useAuth()
  const { recommendations, loading: weatherLoading, error: weatherError, showPanel, setShowPanel, reload: reloadWeather } = useWeather(places)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState(null)

  const handleCategoryChange = (cat) => {
    setCategory(cat)
    reload(cat)
  }

  const handleLogin = useCallback(async (username, password) => {
    setAuthError('')
    try {
      await login(username, password)
      setAuthMode(null)
      reload()
    } catch (e) {
      setAuthError(e.response?.data?.error || 'Ошибка входа')
    }
  }, [login, reload])

  const handleRegister = useCallback(async (username, password, email) => {
    setAuthError('')
    try {
      await register(username, password, email)
      setAuthMode(null)
      reload()
    } catch (e) {
      setAuthError(e.response?.data?.error || 'Ошибка регистрации')
    }
  }, [register, reload])

  const handleToggleVisited = useCallback(async (osmId) => {
    if (!user) return
    try {
      const result = await toggleVisitedPlace(osmId)
      reload(category)
      return result.visited
    } catch (e) {
      console.error('Toggle visited failed:', e)
    }
  }, [user, category, reload])

  // Load weather for selected place
  useEffect(() => {
    if (!selectedPlace) return
    fetchPlaceWeather(selectedPlace.osm_id, selectedPlace.lat, selectedPlace.lon)
      .then((weather) => {
        setSelectedPlace((prev) => prev ? { ...prev, weather } : prev)
      })
      .catch(() => {})
  }, [selectedPlace?.osm_id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      <div className="app-layout">
        <Sidebar
          places={places}
          loading={loading}
          refreshing={refreshing}
          error={error}
          category={category}
          onCategoryChange={handleCategoryChange}
          onRefresh={refresh}
          onSelectPlace={setSelectedPlace}
          selectedPlace={selectedPlace}
          user={user}
          onLogout={logout}
          onShowLogin={() => setAuthMode('login')}
          onToggleVisited={handleToggleVisited}
          onShowWeather={() => { setShowPanel(true); reloadWeather() }}
        />
        <div className="map-container">
          <MapView
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            user={user}
            onToggleVisited={handleToggleVisited}
          />
        </div>
      </div>

      {authMode && (
        <AuthForm
          onLogin={handleLogin}
          onRegister={handleRegister}
          error={authError}
          loading={authLoading}
        />
      )}

      {showPanel && (
        <WeatherPanel
          recommendations={recommendations}
          loading={weatherLoading}
          error={weatherError}
          onClose={() => setShowPanel(false)}
          onSelectPlace={setSelectedPlace}
        />
      )}
    </div>
  )
}
