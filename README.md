# Weekend Map — Куда поехать на выходные в Ленобласти

Интерактивная карта Ленинградской области с местами для поездок на выходные.

## Возможности

- 🗺️ Интерактивная карта (Leaflet + OpenStreetMap)
- 📍 Места из OpenStreetMap через Overpass API
- 🏷️ Фильтрация по категориям: природа, история, музеи, смотровые площадки, водоёмы, отдых, туризм, еда
- 🔄 Кеширование данных в Django (SQLite) с автообновлением раз в час
- 📱 Адаптивный дизайн

## Стек

- **Frontend:** React 18 + Vite + react-leaflet
- **Backend:** Django 5 + DRF + requests (Overpass API)
- **Infra:** Docker + docker-compose + Nginx

## Быстрый старт

```bash
# Запуск через Docker
chmod +x setup.sh
./setup.sh

# Или вручную
docker compose up -d --build
docker compose exec -T backend python manage.py migrate --noinput
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:8001/api/places/

## Разработка

### Backend (Django)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Dev-сервер: http://localhost:5173 (API проксируется на http://localhost:8000)

## API

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/api/places/` | GET | Список мест (параметр `?category=nature`) |
| `/api/places/refresh/` | POST | Принудительное обновление данных с Overpass |
| `/api/places/<osm_id>/` | GET | Детальная информация о месте |

## Порты

| Сервис | Порт |
|--------|------|
| Frontend (Nginx) | 8080 |
| Backend (Django) | 8001 |

## Категории

| Ключ | Название |
|------|----------|
| nature | Природа |
| historic | Исторические места |
| museum | Музеи |
| viewpoint | Смотровые площадки |
| tourism | Туризм |
| leisure | Отдых и развлечения |
| water | Водоёмы |
| food | Еда и кафе |

## Деплой

```bash
chmod +x deploy.sh
./deploy.sh
```
