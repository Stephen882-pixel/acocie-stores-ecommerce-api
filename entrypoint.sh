#!/bin/bash
set -e

echo "⏳  Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."

until node -e "
  const net = require('net');
  const socket = net.createConnection({ host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT) });
  socket.on('connect', () => { socket.destroy(); process.exit(0); });
  socket.on('error',   () => { socket.destroy(); process.exit(1); });
" 2>/dev/null; do
  echo "   Not ready — retrying in 2s..."
  sleep 2
done

echo "✔  PostgreSQL is ready."

echo "⏳  Running database migrations..."
npx sequelize-cli db:migrate

echo "✔  Migrations complete."

echo "⏳  Running seeders..."
npx sequelize-cli db:seed:all

echo "✔  Seeders complete."
echo "  Starting API server..."

exec node server.js
