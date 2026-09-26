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

function makeIcon(category, visited) {
  const emoji = CATEGORY_ICONS[category] || '📍'
  const color = CATEGORY_COLORS[category] || '#333'
  const ring = visited ? 'box-shadow: 0 0 0 3px #00cc00, 0 2px 6px rgba(0,0,0,0.3);' : 'box-shadow: 0 2px 6px rgba(0,0,0,0.3);'
  const badge = visited ? '<div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:#00cc00;border-radius:50%;border:2px solid white;font-size:9px;display:flex;align-items:center;justify-content:center;">✓</div>' : ''
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 32px; height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      ${ring}
      border: 2px solid white;
      position: relative;
    "><span style="transform: rotate(45deg); font-size: 14px;">${emoji}</span>${badge}</div>`,
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
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lon]))
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

export default function MapView({ places, selectedPlace, onSelectPlace, user, onToggleVisited }) {
  return (
    <MapContainer
      center={[59.8, 30.8]}
      zoom={8}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <FitBounds places={places} />
      {places.map((place) => (
        <Marker
          key={place.osm_id}
          position={[place.lat, place.lon]}
          icon={makeIcon(place.category, place.visited)}
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
              {place.weather && (place.weather.saturday || place.weather.sunday) && (
                <div className="popup-weather">
                  <div className="popup-weather-title">🌤️ Погода на выходные</div>
                  {place.weather.saturday && (
                    <div className="popup-weather-day">
                      <span className="popup-weather-label">Сб:</span>
                      <span className="popup-weather-emoji">{place.weather.saturday.emoji}</span>
                      <span>{place.weather.saturday.temp_max}°/{place.weather.saturday.temp_min}°</span>
                      {place.weather.saturday.precip > 0 && <span>💧{place.weather.saturday.precip}мм</span>}
                      <span>💨{place.weather.saturday.wind}м/с</span>
                    </div>
                  )}
                  {place.weather.sunday && (
                    <div className="popup-weather-day">
                      <span className="popup-weather-label">Вс:</span>
                      <span className="popup-weather-emoji">{place.weather.sunday.emoji}</span>
                      <span>{place.weather.sunday.temp_max}°/{place.weather.sunday.temp_min}°</span>
                      {place.weather.sunday.precip > 0 && <span>💧{place.weather.sunday.precip}мм</span>}
                      <span>💨{place.weather.sunday.wind}м/с</span>
                    </div>
                  )}
                </div>
              )}
              {user && (
                <button
                  className={`popup-visited-btn ${place.visited ? 'visited' : ''}`}
                  onClick={() => onToggleVisited(place.osm_id)}
                >
                  {place.visited ? '✅ Посещено' : '⚪ Отметить как посещённое'}
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
