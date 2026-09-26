#!/bin/bash
set -e

echo "=== Weekend Map Setup ==="

cd "$(dirname "$0")"

echo ">> Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "Docker не установлен. Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo ">> Building and starting containers..."
docker compose up -d --build

echo ">> Running migrations..."
docker compose exec -T backend python manage.py migrate --noinput

echo ""
echo "=== Setup complete! ==="
echo "  Frontend: http://localhost:8080"
echo "  Backend API: http://localhost:8001/api/places/"
echo ""
echo "Чтобы обновить данные с Overpass API:"
echo "  curl -X POST http://localhost:8001/api/places/refresh/"
