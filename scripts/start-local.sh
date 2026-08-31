#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 CareerCode Academy — Local Development Startup"
echo "=================================================="
echo ""

# Check env files
if [ ! -f "backend/.env" ]; then
  echo "❌ backend/.env not found!"
  echo "   Copy backend/.env.example to backend/.env and fill values"
  exit 1
fi
if [ ! -f "frontend/.env" ]; then
  echo "⚠️  frontend/.env not found, creating from example..."
  cp frontend/.env.example frontend/.env 2>/dev/null || echo "VITE_API_URL=http://localhost:5000/api/v1" > frontend/.env
fi

echo "🔍 Validating environment variables..."

# Backend env check
echo ""
echo "→ Backend env check..."
(cd backend && npm run test:env) || {
  echo "⚠️  Backend env validation has warnings/ failures - check above"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
}

echo ""
echo "→ Frontend env check..."
(cd frontend && npm run test:env) || {
  echo "⚠️  Frontend env validation warnings"
}

echo ""
echo "📦 Checking dependencies..."
if [ ! -d "backend/node_modules" ]; then echo "Installing backend deps..."; (cd backend && npm install); fi
if [ ! -d "frontend/node_modules" ]; then echo "Installing frontend deps..."; (cd frontend && npm install); fi
if [ ! -d "node_modules" ]; then echo "Installing root deps..."; npm install --legacy-peer-deps || npm install; fi

echo ""
echo "🗄️  Testing database connection..."
# Quick DB health check via node
node -e "
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('backend/.env') });
const url = process.env.DATABASE_URL;
if(!url){ console.log('❌ DATABASE_URL missing'); process.exit(0); }
const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 10000 });
pool.query('SELECT 1').then(()=>{ console.log('✅ DB connected'); pool.end(); }).catch(e=>{ console.log('❌ DB failed:', e.message.slice(0,120)); pool.end(); });
" 2>&1 || true

echo ""
echo "✅ Pre-checks done. Starting servers..."
echo ""
echo "   Backend:  http://localhost:5000  (health: http://localhost:5000/health)"
echo "   Frontend: http://localhost:3000"
echo "   DB Health: http://localhost:5000/db-health"
echo ""
echo "   Press Ctrl+C to stop both servers"
echo "   ------------------------------------------------"
echo ""

# Use concurrently via npx if not installed globally
if command -v concurrently >/dev/null 2>&1; then
  concurrently --names "backend,frontend" --prefix-colors "cyan,magenta" "npm:dev:backend" "npm:dev:frontend"
else
  npx concurrently --names "backend,frontend" --prefix-colors "cyan,magenta" "npm:dev:backend" "npm:dev:frontend"
fi
