import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconShadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const CATEGORY_ICONS = {
  nature: '🌿',
  historic: '🏛️',
  museum: '🖼️',
  viewpoint: '👁️',
  tourism: '⭐',
  leisure: '🎪',
  water: '🌊',
  food: '🍽️',
}

const CATEGORY_COLORS = {
  nature: '#2a7f2a',
  historic: '#8B4513',
  museum: '#6a0dad',
  viewpoint: '#ff6600',
  tourism: '#0066cc',
  leisure: '#e91e63',
  water: '#0099ff',
  food: '#ff9800',
}

function makeIcon(category) {
  const emoji = CATEGORY_ICONS[category] || '📍'
  const color = CATEGORY_COLORS[category] || '#333'
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 32px; height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 2px solid white;
    "><span style="transform: rotate(45deg); font-size: 14px;">${emoji}</span></div>`,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  })
}

function FitBounds({ places }) {
  const map = useMap()
  useEffect(() => {
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map(p => [p.lat, p.lon]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [places, map])
  return null
}

const CATEGORY_LABELS = {
  nature: 'Природа',
  historic: 'Исторические места',
  museum: 'Музеи',
  viewpoint: 'Смотровые площадки',
  tourism: 'Туризм',
  leisure: 'Отдых',
  water: 'Водоёмы',
  food: 'Еда',
}

export default function MapView({ places, selectedPlace, onSelectPlace }) {
  return (
    <MapContainer
      center={[59.8, 30.8]}
      zoom={8}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <FitBounds places={places} />
      {places.map(place => (
        <Marker
          key={place.osm_id}
          position={[place.lat, place.lon]}
          icon={makeIcon(place.category)}
          eventHandlers={{
            click: () => onSelectPlace(place),
          }}
        >
          <Popup>
            <div className="popup-content">
              {place.photo && (
                <img
                  src={place.photo}
                  alt={place.name}
                  className="popup-photo"
                  loading="lazy"
                />
              )}
              <div className="popup-header">
                <span className="popup-emoji">{CATEGORY_ICONS[place.category] || '📍'}</span>
                <strong>{place.name}</strong>
              </div>
              <div className="popup-category">
                {CATEGORY_LABELS[place.category] || place.category}
              </div>
              {place.description && (
                <div className="popup-description">
                  {place.description.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
              <div className="popup-links">
                {place.tags?.yandex_map_url && (
                  <a href={place.tags.yandex_map_url} target="_blank" rel="noopener noreferrer">
                    🗺️ Яндекс.Карты
                  </a>
                )}
                {place.tags?.website && (
                  <a href={place.tags.website} target="_blank" rel="noopener noreferrer">
                    🌐 Сайт
                  </a>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
