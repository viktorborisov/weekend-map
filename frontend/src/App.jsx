import { useState, useCallback } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import AuthForm from './components/AuthForm'
import { usePlaces } from './hooks/usePlaces'
import { useAuth } from './hooks/useAuth'
import { toggleVisitedPlace } from './api/places'
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
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState(null) // null | 'login' | 'register'

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
      // Update places in-place
      const updated = places.map((p) =>
        p.osm_id === osmId ? { ...p, visited: result.visited } : p
      )
      // Directly update via reload is too heavy; use a workaround
      // We need a setPlaces from usePlaces, but let's just reload
      reload(category)
      return result.visited
    } catch (e) {
      console.error('Toggle visited failed:', e)
    }
  }, [user, places, category, reload])

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
    </div>
  )
}
