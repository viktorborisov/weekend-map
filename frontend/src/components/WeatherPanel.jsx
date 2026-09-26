export default function WeatherPanel({ recommendations, loading, error, onClose, onSelectPlace }) {
  return (
    <div className="weather-overlay" onClick={onClose}>
      <div className="weather-modal" onClick={(e) => e.stopPropagation()}>
        <div className="weather-modal-header">
          <h2>🌤️ Где лучше поехать на выходные</h2>
          <button className="weather-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="weather-loading">⏳ Загрузка прогноза погоды (батчами по 5 мест)...</div>}
        {error && <div className="weather-error">⚠️ {error}</div>}

        {!loading && !error && recommendations.length > 0 && (
          <>
            <div className="weather-intro">
              Топ-10 мест с лучшей погодой на ближайшие выходные (суббота и воскресенье).
              Рекомендации на основе прогноза температуры, осадков и ветра.
            </div>
            <div className="weather-list">
              {recommendations.slice(0, 10).map((rec, i) => {
                const sat = rec.weather.saturday
                const sun = rec.weather.sunday
                return (
                  <div
                    key={rec.osm_id}
                    className={`weather-card ${rec.score >= 60 ? 'good' : rec.score >= 40 ? 'ok' : 'bad'}`}
                    onClick={() => {
                      onSelectPlace(rec)
                      onClose()
                    }}
                  >
                    <div className="weather-rank">#{i + 1}</div>
                    {rec.photo && <img src={rec.photo} alt="" className="weather-card-thumb" />}
                    <div className="weather-card-body">
                      <div className="weather-card-title">{rec.name}</div>
                      <div className="weather-card-rec">{rec.recommendation}</div>
                      <div className="weather-card-days">
                        <div className="weather-day">
                          <span className="weather-day-label">Сб</span>
                          {sat ? (
                            <>
                              <span className="weather-emoji">{sat.emoji}</span>
                              <span className="weather-temp">{sat.temp_max}°/{sat.temp_min}°</span>
                              {sat.precip > 0 && <span className="weather-precip">💧{sat.precip}мм</span>}
                              <span className="weather-wind">💨{sat.wind}м/с</span>
                            </>
                          ) : (
                            <span className="weather-na">нет данных</span>
                          )}
                        </div>
                        <div className="weather-day">
                          <span className="weather-day-label">Вс</span>
                          {sun ? (
                            <>
                              <span className="weather-emoji">{sun.emoji}</span>
                              <span className="weather-temp">{sun.temp_max}°/{sun.temp_min}°</span>
                              {sun.precip > 0 && <span className="weather-precip">💧{sun.precip}мм</span>}
                              <span className="weather-wind">💨{sun.wind}м/с</span>
                            </>
                          ) : (
                            <span className="weather-na">нет данных</span>
                          )}
                        </div>
                      </div>
                      <div className="weather-best-day">
                        Лучший день: <strong>{rec.best_day_label}</strong> · Оценка: {rec.score}/100
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {!loading && !error && recommendations.length === 0 && (
          <div className="weather-loading">
            Сервис погоды wttr.in не отвечает.<br/>
            Попробуйте позже.
          </div>
        )}
      </div>
    </div>
  )
}
