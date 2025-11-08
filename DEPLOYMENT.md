# RaktSetu Deployment Guide

## Quick Start (Local, no Docker)
## Deploy to Railway

Backend (FastAPI) service
- This repo contains a `Procfile` so Railway will run Uvicorn automatically on `$PORT`.
- Steps:
  1. Push repo to GitHub: `https://github.com/immansha/rs`
  2. On Railway, click New Project → Deploy from GitHub → select the repo.
  3. No build command needed; Python Nixpacks will install `requirements.txt`.
  4. Expose the service; note the public URL (e.g., `https://<app>.up.railway.app`).

Frontend (Static site) service
- Steps:
  1. New Service → Static Site → select the same repo.
  2. Root Directory: `frontend`
  3. Build Command: leave empty (static files)
  4. Publish Directory: `frontend`
  5. Deploy; note the public URL.

API URL configuration
- `frontend/script.js` auto-detects environment:
  - Uses `http://localhost:8000` locally
  - Uses same-origin in production (so if you host the frontend on Railway, point it to the backend origin by hosting behind the same domain or set CORS accordingly)

CORS
- Backend is configured to allow all origins. Tighten in production if needed.

## Deploy: Vercel (Frontend) + Render (Backend)

Backend on Render (FastAPI)
- New → Web Service → Connect repo
- Build Command: `pip install -r requirements.txt`
- Start Command: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- After deploy, copy backend URL (e.g., `https://<app>.onrender.com`).

Frontend on Vercel (Static)
- New Project → Import from Git → Select repo
- Framework preset: Other
- Root Directory: `frontend`
- Build Command: (leave empty)
- Output Directory: `frontend`
- Optional: set API URL without code changes by editing `frontend/index.html` meta tag:
  `<meta name="api-base-url" content="https://<app>.onrender.com">`
- Alternatively, inject at runtime in `index.html` before `script.js`:
  `<script>window.__API_BASE_URL__ = 'https://<app>.onrender.com'</script>`

Notes
- `frontend/script.js` resolves API URL in this order: window.__API_BASE_URL__ → meta `api-base-url` → localhost → same-origin.
- Verify endpoints: `/patients`, `/match` on the backend URL.


### Backend Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the FastAPI server:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

   The backend will be available at: `http://localhost:8000`

### Frontend Setup
1. The frontend is a static HTML/JS application. Simply serve the `frontend/` directory.

2. For local development, you can use Python's HTTP server:
   ```bash
   cd frontend
   python -m http.server 8080
   ```

3. For production deployment, configure your web server (nginx, Apache, etc.) to serve the `frontend/` directory.

### Configuring API URL

The frontend is configured to call the API at `http://localhost:8000`. If your backend runs elsewhere, change `API_CONFIG.baseURL` in `frontend/script.js` accordingly.

## API Endpoints

The backend provides the following endpoints:

- `GET /` - Health check
- `GET /patients` - Get all patients
- `GET /patients/{patient_id}` - Get specific patient
- `GET /patients/emergency/active` - Get emergency patients
- `POST /match` - Find matching donors for a patient
- `POST /predict` - Predict rare blood type probability
- `GET /debug/categories` - Debug category mappings
- `GET /debug/model` - Debug model info

## Deployment Checklist

- [ ] Update `API_CONFIG.baseURL` in `frontend/script.js` with production backend URL
- [ ] Ensure backend CORS is configured (currently allows all origins)
- [ ] Verify all data files exist:
  - `backend/data/donors_with_pred.csv`
  - `backend/data/patients.csv`
  - `backend/scripts/raktsetu_rf.joblib`
- [ ] Test API endpoints are accessible from frontend domain
- [ ] Configure reverse proxy if needed (nginx, Apache)
- [ ] Set up SSL certificates for HTTPS
- [ ] Configure environment variables for production settings

## Production Considerations

1. **CORS**: The backend currently allows all origins (`allow_origins=["*"]`). For production, restrict this to your frontend domain:
   ```python
   allow_origins=["https://your-frontend-domain.com"]
   ```

2. **Static Files**: FastAPI can serve static files, but for production, use a dedicated web server (nginx/Apache) for the frontend.

3. **Environment Variables**: Consider using environment variables for:
   - API URLs
   - Database connections
   - Secret keys

4. **Error Handling**: The frontend includes error handling for API failures. Monitor browser console for errors.

