const CATEGORIES = [
  { key: 'all', label: 'Все', emoji: '📍' },
  { key: 'nature', label: 'Природа', emoji: '🌿' },
  { key: 'historic', label: 'История', emoji: '🏛️' },
  { key: 'museum', label: 'Музеи', emoji: '🖼️' },
  { key: 'viewpoint', label: 'Смотровые', emoji: '👁️' },
  { key: 'water', label: 'Водоёмы', emoji: '🌊' },
  { key: 'leisure', label: 'Отдых', emoji: '🎪' },
  { key: 'tourism', label: 'Туризм', emoji: '⭐' },
  { key: 'food', label: 'Еда', emoji: '🍽️' },
]

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

const CATEGORY_EMOJI = {
  nature: '🌿',
  historic: '🏛️',
  museum: '🖼️',
  viewpoint: '👁️',
  tourism: '⭐',
  leisure: '🎪',
  water: '🌊',
  food: '🍽️',
}

export default function Sidebar({
  places,
  loading,
  refreshing,
  error,
  category,
  onCategoryChange,
  onRefresh,
  onSelectPlace,
  selectedPlace,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>🏕️ Выходные в Ленобласти</h1>
        <p className="subtitle">Куда поехать на выходные</p>
      </div>

      <div className="filters">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`filter-btn ${category === cat.key ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat.key)}
          >
            <span>{cat.emoji}</span> {cat.label}
          </button>
        ))}
      </div>

      <div className="sidebar-actions">
        <button className="refresh-btn" onClick={onRefresh} disabled={loading || refreshing}>
          {refreshing ? '⏳ Обновление...' : loading ? '⏳ Загрузка...' : '🔄 Обновить данные'}
        </button>
        <div className="places-count">
          {loading ? 'Загрузка...' : `Найдено мест: ${places.length}`}
        </div>
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      <div className="places-list">
        {places.map(place => (
          <div
            key={place.osm_id}
            className={`place-card ${selectedPlace?.osm_id === place.osm_id ? 'selected' : ''}`}
            onClick={() => onSelectPlace(place)}
          >
            {place.photo ? (
              <img
                src={place.photo}
                alt={place.name}
                className="place-thumb"
                loading="lazy"
              />
            ) : (
              <div className="place-emoji">{CATEGORY_EMOJI[place.category] || '📍'}</div>
            )}
            <div className="place-info">
              <div className="place-name">{place.name}</div>
              <div className="place-category">{CATEGORY_LABELS[place.category] || place.category}</div>
            </div>
          </div>
        ))}
        {!loading && places.length === 0 && (
          <div className="empty">Загрузка мест... Подождите немного.</div>
        )}
      </div>
    </div>
  )
}
