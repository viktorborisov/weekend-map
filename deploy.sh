#!/bin/bash
set -e

echo "=== Deploying Weekend Map ==="

cd /opt/weekend-map

echo ">> Pulling latest code..."
git pull origin main

echo ">> Building and starting containers..."
docker compose up -d --build

echo ">> Running migrations..."
docker compose exec -T backend python manage.py migrate --noinput

echo ">> Cleaning old images..."
docker image prune -f

echo "=== Deploy complete! ==="
docker compose ps
