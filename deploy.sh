#!/bin/bash
set -e

APP_DIR="/var/www/hubcel"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Hubcel VPS Deployment ==="
echo ""

# ── 1. System dependencies ──
echo "[1/7] Installing system dependencies..."
sudo apt update -qq
sudo apt install -y -qq nginx curl

# Install Node.js 20 if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
    echo "  Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y -qq nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "  Installing PM2..."
    sudo npm install -g pm2
fi

echo "  Node: $(node -v) | NPM: $(npm -v) | PM2: $(pm2 -v)"

# ── 2. Create app directory ──
echo "[2/7] Setting up app directory..."
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

# ── 3. Copy project files ──
echo "[3/7] Copying project files..."
rsync -a --exclude='node_modules' --exclude='.next' --exclude='.git' \
    "$REPO_DIR/" "$APP_DIR/"

# ── 4. Install dependencies ──
echo "[4/7] Installing server dependencies..."
cd "$APP_DIR/server"
npm install --production

echo "[5/7] Installing client dependencies and building..."
cd "$APP_DIR/client"
npm install
npm run build

# ── 6. Configure Nginx ──
echo "[6/7] Configuring Nginx..."
sudo cp "$APP_DIR/nginx/hubcel.conf" /etc/nginx/sites-available/hubcel
sudo ln -sf /etc/nginx/sites-available/hubcel /etc/nginx/sites-enabled/hubcel
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx

# ── 7. Start with PM2 ──
echo "[7/7] Starting application with PM2..."
cd "$APP_DIR"
pm2 delete hubcel-api hubcel-client 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "[Optional] Setting up SSL with Let's Encrypt..."
if command -v certbot &> /dev/null || sudo apt install -y -qq certbot python3-certbot-nginx; then
    echo "  Running certbot for hubcel.top..."
    sudo certbot --nginx -d hubcel.top -d www.hubcel.top --non-interactive --agree-tos --email admin@hubcel.top --redirect || {
        echo "  Certbot failed (DNS may not be pointed yet). Run manually later:"
        echo "    sudo certbot --nginx -d hubcel.top -d www.hubcel.top"
    }
fi

echo ""
echo "=== All Done ==="
echo "  Frontend: https://hubcel.top"
echo "  API:      https://hubcel.top/api"
echo "  Health:   https://hubcel.top/api/health"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check process status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart all processes"
echo "  pm2 monit           - Monitor dashboard"
