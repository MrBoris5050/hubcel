#!/bin/bash
set -e

APP_DIR="/var/www/hubcel"

echo "=== Hubcel Update ==="

cd "$APP_DIR"
echo "[1/4] Pulling latest changes..."
git pull

echo "[2/4] Installing dependencies..."
cd "$APP_DIR/server" && npm install --production
cd "$APP_DIR/client" && npm install

echo "[3/4] Building frontend..."
cd "$APP_DIR/client" && npm run build

echo "[4/4] Restarting services..."
cd "$APP_DIR"
pm2 restart ecosystem.config.js

echo ""
echo "=== Update Complete ==="
pm2 status
