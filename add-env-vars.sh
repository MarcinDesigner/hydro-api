#!/bin/bash

# Dodawanie zmiennych środowiskowych do Vercel
echo "Dodawanie zmiennych środowiskowych do Vercel..."

# Database
echo 'postgresql://postgres.twphrnydxzqszumytryu:marcinhiszpanek123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1' | vercel env add DATABASE_URL production

# Supabase
echo 'https://twphrnydxzqszumytryu.supabase.co' | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cGhybnlkeHpxc3p1bXl0cnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NjczODQsImV4cCI6MjA2NDQ0MzM4NH0.7m7jZNuKMEYNFigiIUraIi0f2WODqOgKWNyVj65nvPE' | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cGhybnlkeHpxc3p1bXl0cnl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg2NzM4NCwiZXhwIjoyMDY0NDQzMzg0fQ.ICIaOaXtVv3DGX-oY090Z9FmQpVYeC4aPIb2_bOtxLk' | vercel env add SUPABASE_SERVICE_ROLE_KEY production

# API Configuration
echo 'https://danepubliczne.imgw.pl/api/data' | vercel env add IMGW_API_URL production
echo 'hydro' | vercel env add IMGW_API_ENDPOINT production
echo '60' | vercel env add SYNC_INTERVAL_MINUTES production

# Prisma Configuration
echo 'binary' | vercel env add PRISMA_CLIENT_ENGINE_TYPE production
echo '--client-min-messages=warning' | vercel env add PGOPTIONS production

echo "Wszystkie zmienne środowiskowe zostały dodane!" 