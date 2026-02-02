#!/bin/bash
export DATABASE_CLIENT=postgres
export DATABASE_URL=postgresql://postgres:XfVRLiChCkBGaRTdftyYCXIJfWBDHKAr@yamabiko.proxy.rlwy.net:55170/railway
export NODE_ENV=production

echo "Starting Strapi with forced PostgreSQL config..."
echo "DATABASE_CLIENT: $DATABASE_CLIENT"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."

npm run start
