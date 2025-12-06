# Style Sathi – Full‑Stack (React + Django) Project

## Overview
Style Sathi is a full‑stack application with a React frontend and a Django REST backend. The app provides customer shopping, seller inventory, and admin management features with JWT authentication. This README documents setup, environment variables, API endpoints, deployment to Render, folder structure, and troubleshooting.

## Tech Stack
- Frontend: React (Vite), Bootstrap, React Icons
- Backend: Django, Django REST Framework, Simple JWT, WhiteNoise, Gunicorn
- Database: PostgreSQL (production via `DATABASE_URL`)
- Deployment: Render Web Services (`render.yaml`)

## Prerequisites
- Node.js 20.x
- Python 3.11+ (Render uses Python runtime)
- PostgreSQL database for production

## Environment Variables

### Backend (Render service: `stylesathi-backend`)
- `DJANGO_SECRET_KEY` – required in production
- `DJANGO_DEBUG` – `false` in production
- `DJANGO_ALLOWED_HOSTS` – comma‑separated hosts (e.g. `stylesathi-backend.onrender.com,stylesathi-frontend.onrender.com`)
- `CSRF_TRUSTED_ORIGINS` – comma‑separated origins (e.g. `https://stylesathi-frontend.onrender.com`)
- `DATABASE_URL` – PostgreSQL connection string (e.g. `postgres://user:pass@host:5432/dbname`)
- Seeding flags (runtime):
  - `BOOTSTRAP_ADMIN_RUN=true`
  - `SELLER_SEED_RUN=true`
  - `CUSTOMER_SEED_RUN=true`
- Optional seeding credentials:
  - `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`
  - `SELLER_SEED_EMAIL`, `SELLER_SEED_PASSWORD`
  - `CUSTOMER_SEED_EMAIL`, `CUSTOMER_SEED_PASSWORD`

### Frontend (Render service: `stylesathi-frontend`)
- `VITE_API_BASE_URL` – base API URL (e.g. `https://stylesathi-backend.onrender.com/api`)

## Setup

### Backend (local)
1. Create and activate a virtualenv
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Run migrations: `python backend/manage.py migrate`
4. Start dev server: `python backend/manage.py runserver 0.0.0.0:8000`

### Frontend (local)
1. `cd styleSathi`
2. Install dependencies: `npm ci`
3. Configure `.env` as needed (e.g., `VITE_API_BASE_URL=http://localhost:8000/api`)
4. Run dev server: `npm run dev`

## Deployment to Render
Services are declared in `render.yaml`.

### Backend
- Build Command:
  - `pip install -r backend/requirements.txt`
  - `python backend/manage.py collectstatic --noinput`
  - `python backend/manage.py migrate`
  - `python backend/manage.py bootstrap_users`
- Start Command:
  - `python backend/manage.py migrate && python backend/manage.py bootstrap_users && python backend/manage.py seed_catalog && gunicorn stylesathi_backend.wsgi:application --chdir backend --bind 0.0.0.0:$PORT`
- Notes:
  - App binds to `0.0.0.0:$PORT` as required by Render.
  - Static served by WhiteNoise; dynamic uploads are stored under `MEDIA_ROOT` and served via `/media/`.

### Frontend
- Build Command:
  - `cd styleSathi && npm ci && npm run build`
- `staticPublishPath`: `styleSathi/dist`
- Env: `VITE_API_BASE_URL=https://stylesathi-backend.onrender.com/api`

## API Overview
Base URL: `${VITE_API_BASE_URL}`

- Auth
  - `POST /auth/signup`
  - `POST /auth/seller-signup`
  - `POST /auth/login` (`expected_role` optional)
  - `POST /auth/admin/login` (`expected_role=admin`)
  - `POST /auth/password/forgot`
  - `POST /auth/password/reset`
- Catalog
  - `GET /products/` (optional `category`, `search`)
  - `GET /products/categories`
  - `GET /products/mine` (seller/admin)
  - `POST /products/create` (seller/admin; supports JSON or multipart with `image`/`model_glb`)
  - `PATCH /products/{id}/manage` (seller/admin; supports multipart)
  - `DELETE /products/{id}/manage` (seller/admin; body `{reason}` required)
- Cart
  - `GET /cart/`
  - `POST /cart/items`
  - `PATCH /cart/items/{id}`
  - `DELETE /cart/items/{id}`
- Orders
  - `POST /orders/`
  - `GET /orders/{id}` (customer)
  - `GET /orders/seller` (seller/admin)
  - `GET /orders/seller/{id}` (seller/admin)
  - `PATCH /orders/{id}/status` (seller/admin)
- Profile
  - `GET /profile/`
  - `PATCH /profile/`
  - `DELETE /profile/`
  - `POST /profile/phone/request`
  - `POST /profile/phone/verify`
- Admin
  - `GET /auth/admin/users`
  - `GET /auth/admin/orders`
  - `GET /auth/admin/dashboard`
  - `GET /auth/admin/analytics`
  - `PATCH /auth/admin/reports`
  - `DELETE /auth/admin/users`

## Folder Structure

### Frontend (`styleSathi`)
- `src/components` – UI components (seller/admin/customer pages)
- `src/services/api.js` – axios‑based API layer
- `src/services/http.js` – axios instance, asset resolver
- `src/assets` – static images
- `vite.config.js` – Vite config

Recommended (future refactor):
- `src/pages/`, `src/layout/`, `src/router/`, `src/context/`, `src/hooks/`, `src/store/`, `src/utils/`

### Backend (`backend`)
- Apps: `users`, `catalog`, `cart`, `orders`
- `stylesathi_backend/settings.py` – env‑driven config; Postgres via `DATABASE_URL`
- `stylesathi_backend/urls.py` – API routes and media static serving
- `users/management/commands/bootstrap_users.py` – runtime seeding
- `catalog/management/commands/seed_catalog.py` – runtime seeding

## Notable Improvements
- Runtime seeding executed in `startCommand` so Render runtime DB is populated.
- Product creation endpoint hardened to return 400/403 instead of 500.
- File uploads saved under `MEDIA_ROOT` and served via `/media/`.
- Query performance improved with `select_related`/`prefetch_related` across catalog and orders views.
- Frontend API migrated to axios instance with interceptor and consistent error handling.

## Troubleshooting
- 400 on login → invalid credentials or role mismatch; ensure seed ran and correct roles.
- 500 on product create → redeploy with latest backend; now returns detailed 400/403.
- Empty lists on Render → ensure `DATABASE_URL` is set; runtime seeds run; redeploy frontend so `VITE_API_BASE_URL` is compiled.
- Media not persisting after restart → Render’s ephemeral filesystem loses `/tmp/media` on redeploy; add a persistent disk and set `MEDIA_ROOT` to that mount point.

## Deployment Checklist (Render)
- Backend:
  - `DATABASE_URL` set
  - `DJANGO_SECRET_KEY` set
  - `DJANGO_ALLOWED_HOSTS` includes both services
  - `CSRF_TRUSTED_ORIGINS` includes frontend URL(s)
  - Seeding flags enabled
  - Start command includes `migrate`, `bootstrap_users`, `seed_catalog`, `gunicorn`
- Frontend:
  - `VITE_API_BASE_URL` set to backend `/api`
  - Redeploy after env changes
- Optional:
  - Persistent disk for media uploads; configure `MEDIA_ROOT` to disk
  - Custom domain and HTTPS

## License
Proprietary. All rights reserved.
