# RaktSetu Deployment Guide

## Quick Start (Local, no Docker)

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

