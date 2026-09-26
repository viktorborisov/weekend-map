import { useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { usePlaces } from './hooks/usePlaces'
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

  const [selectedPlace, setSelectedPlace] = useState(null)

  const handleCategoryChange = (cat) => {
    setCategory(cat)
    reload(cat)
  }

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
        />
        <div className="map-container">
          <MapView
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
          />
        </div>
      </div>
    </div>
  )
}
