# STYLE SATHI — Dev Setup & Tests

## Services
- Frontend: React + Vite (`styleSathi/`)
- Backend: Django REST (`backend/`)

## Commands
- Frontend dev: `cd styleSathi && npm install && npm run dev`
- Frontend lint: `npm run lint`
- Backend dev: `cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python manage.py runserver 127.0.0.1:8000`
- Backend migrations: `python manage.py makemigrations && python manage.py migrate`
- Backend tests: `python manage.py test`

## Environment
- Frontend: set `VITE_API_BASE_URL=http://127.0.0.1:8000/api`
- Backend (optional):
  - `DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost`
  - `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (if using Cloudinary)

## Example cURL
- Login:
  - `curl -X POST http://127.0.0.1:8000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"user@example.com\",\"password\":\"pass\"}"`
- List products by category:
  - `curl "http://127.0.0.1:8000/api/products/?category=Glasses"`
- Create product (multipart):
  - `curl -X POST http://127.0.0.1:8000/api/products/create -F title=Sample -F price=99.99 -F image=@./sample.jpg`

## Notes
- CORS is enabled in backend `settings.py` for common dev ports.
- Cloudinary uploads are supported when env vars are provided; otherwise files save locally under `media/uploads`.
