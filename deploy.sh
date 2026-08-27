#!/bin/bash
set -e

SERVER_IP="13.140.37.157"
SERVER_USER="lzambrano"
TARGET_DIR="/home/lzambrano/aseo-rosario/app"

echo "=========================================================="
echo " DESPLEGANDO SISTEMA DE ASEO URBANO A: $SERVER_IP"
echo "=========================================================="

echo "[1/4] Sincronizando archivos del proyecto con el servidor..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $TARGET_DIR"

rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'dev.db' --exclude '.git' \
    ./ $SERVER_USER@$SERVER_IP:$TARGET_DIR/

echo "[2/4] Instalando dependencias y generando Prisma Client en el servidor..."
ssh $SERVER_USER@$SERVER_IP "cd $TARGET_DIR && npm ci && npx prisma generate"

echo "[3/4] Compilando aplicación Next.js en producción..."
ssh $SERVER_USER@$SERVER_IP "cd $TARGET_DIR && npm run build"

echo "[4/4] Iniciando / Recargando proceso PM2..."
ssh $SERVER_USER@$SERVER_IP "cd $TARGET_DIR && pm2 delete aseo-app 2>/dev/null || true && pm2 start npm --name 'aseo-app' -- start && pm2 save"

# Configurar Nginx si es necesario
ssh $SERVER_USER@$SERVER_IP "sudo cp $TARGET_DIR/nginx.conf /etc/nginx/sites-available/aseo && sudo ln -sf /etc/nginx/sites-available/aseo /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"

echo "=========================================================="
echo " ¡DESPLIEGUE COMPLETADO CON ÉXITO!"
echo " Portal disponible en: http://$SERVER_IP"
echo "=========================================================="
