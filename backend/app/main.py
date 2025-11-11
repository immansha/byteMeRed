from fastapi import FastAPI,HTTPException
from pydantic import BaseModel
import pandas as pd
import joblib
import networkx as nx
import numpy as np
import traceback

from typing import List, Dict, Any, Optional

# -----------------------------
# Load model & data
# -----------------------------
import os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BACKEND_DIR, 'scripts', 'raktsetu_rf.joblib')
DONORS_CSV_PATH = os.path.join(BACKEND_DIR, 'data', 'donors_with_pred.csv')
#MODEL_PATH = os.path.join(BASE_DIR, "scripts", "raktsetu_rf.joblib")
#DONORS_CSV_PATH = os.path.join(BASE_DIR, "data", "donors_with_pred.csv")

# Safe-load model and donors so the API can boot even if files are missing
model = None
df_donors = pd.DataFrame()
try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
    else:
        print(f"[startup] Model file not found at: {MODEL_PATH}")
except Exception as e:
    print(f"[startup] Failed to load model: {e}")

try:
    if os.path.exists(DONORS_CSV_PATH):
        df_donors = pd.read_csv(DONORS_CSV_PATH)
    else:
        print(f"[startup] Donors CSV not found at: {DONORS_CSV_PATH}")
except Exception as e:
    print(f"[startup] Failed to load donors CSV: {e}")

# -----------------------------
# Build network graph
# -----------------------------
G = nx.Graph()
if not df_donors.empty:
    for _, row in df_donors.iterrows():
        G.add_node(row["donor_id"], **row.to_dict())
else:
    print("[startup] Donor graph initialized empty (no donors loaded).")

# -----------------------------
# Prepare category maps for preprocessing
# -----------------------------
category_maps = {}
for col in ["surname", "location", "sex"]:
    if col in df_donors.columns:
        # map all unique values to numeric codes
        unique_values = df_donors[col].dropna().unique()
        category_maps[col] = {str(cat): code for code, cat in enumerate(unique_values)}

# -----------------------------
# FastAPI instance
# -----------------------------
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for easy deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Request models
# -----------------------------
class PredictRequest(BaseModel):
    surname: str
    location: str
    age: int
    sex: str

class MatchRequest(BaseModel):
    patient_id: str
    need: str  # e.g., "Bombay(Oh)"
    location: str
    lat: float = 19.0760   # default Mumbai
    lon: float = 72.8777
    top_k: int = 5

# -----------------------------
# Helper functions
# -----------------------------

def preprocess_input(df: pd.DataFrame):
    df_proc = df.copy()

    # Map categorical columns to numeric codes
    for col in ["surname", "location", "sex"]:
        if col in df_proc.columns:
            df_proc[col] = df_proc[col].astype(str).map(category_maps[col]).fillna(-1).astype(float)
    # Ensure age is numeric
    df_proc["age"] = pd.to_numeric(df_proc["age"], errors='coerce').fillna(0).astype(float)

    # Make sure columns match model's expected features
    if model is not None and hasattr(model, "feature_names_in_"):
        expected_features = model.feature_names_in_
        for feature in expected_features:
            if feature not in df_proc.columns:
                df_proc[feature] = 0.0
        df_proc = df_proc[expected_features]

    return df_proc

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2)**2
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

# -----------------------------
# Routes
# -----------------------------
@app.get("/")
def read_root():
    return {"message": "RaktSetu API is running!"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "donors_loaded": int(len(G.nodes)) if G is not None else 0,
        "paths": {
            "model_path": MODEL_PATH,
            "donors_csv_path": DONORS_CSV_PATH,
            "patients_csv_path": os.path.join(BACKEND_DIR, 'data', 'patients.csv')
        }
    }

@app.get("/debug/categories")
def get_categories():
    """Debug endpoint to see category mappings"""
    return {"category_maps": category_maps}

@app.get("/debug/model")
def get_model_info():
    """Debug endpoint to see model info"""
    info = {}
    if model is not None and hasattr(model, "feature_names_in_"):
        info["expected_features"] = model.feature_names_in_.tolist()
    if model is not None and hasattr(model, "n_features_in_"):
        info["n_features"] = model.n_features_in_
    return info

@app.post("/predict")
def predict_rare(req: PredictRequest):
    try:
        if model is None:
            raise RuntimeError("Model not loaded on server. Check server logs and model path.")
        df = pd.DataFrame([req.dict()])
        df_proc = preprocess_input(df)
        prob = model.predict_proba(df_proc)[0][1]
        label = "Bombay(Oh)" if prob > 0.5 else "NotBombay"
        return {
            "input": req.dict(),
            "prob_rare": round(float(prob), 3),
            "rare_label": label,
            "processed_features": df_proc.to_dict('records')[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

#PATIENTS_CSV_PATH = "C:\Users\imman\OneDrive\Desktop\RaktSetu\backend\data\patients.csv"
PATIENTS_CSV_PATH = os.path.join(BACKEND_DIR, 'data', 'patients.csv')

# # Load patients data
def load_patients_data():
    """Load patients from CSV file"""
    try:
        if os.path.exists(PATIENTS_CSV_PATH):
            df = pd.read_csv(PATIENTS_CSV_PATH)
            # Convert DataFrame to list of dictionaries
            patients = df.to_dict('records')
            return patients
        else:
            print(f"Patients CSV file not found at: {PATIENTS_CSV_PATH}")
            return []
    except Exception as e:
        print(f"Error loading patients data: {e}")
        return []

# Load patients data on startup
patients_data = load_patients_data()

# Add this Pydantic model for patient response
class Patient(BaseModel):
    patient_id: str
    need: str  # This is the blood type
    region: str
    urgency: str
    lat: float
    lon: float
    hospital: str

# Add these new endpoints to your FastAPI app

@app.get("/patients", response_model=Dict[str, Any])
def get_all_patients():
    """Get all patients from CSV"""
    try:
        return {
            "patients": patients_data,
            "total_count": len(patients_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patients: {str(e)}")

@app.get("/patients/{patient_id}")
def get_patient(patient_id: str):
    """Get specific patient by ID"""
    try:
        patient = next((p for p in patients_data if str(p.get('patient_id', '')) == patient_id), None)
        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        return patient
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patient: {str(e)}")

@app.get("/patients/emergency/active")
def get_emergency_patients():
    """Get patients with high or critical urgency"""
    try:
        emergency_patients = [
            p for p in patients_data 
            if p.get('urgency', '').lower() in ['critical', 'high']
        ]
        return {
            "emergency_patients": emergency_patients,
            "count": len(emergency_patients)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching emergency patients: {str(e)}")

# Add endpoint to reload patients data
@app.post("/admin/reload-patients")
def reload_patients():
    """Reload patients data from CSV (admin endpoint)"""
    global patients_data
    try:
        patients_data = load_patients_data()
        return {
            "message": "Patients data reloaded successfully",
            "total_patients": len(patients_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reloading patients: {str(e)}")

# Modified match endpoint to work with CSV patients
@app.post("/match")
def match_patient(req: MatchRequest):
    try:
        # Verify patient exists in CSV data
        patient = next((p for p in patients_data if str(p.get('patient_id', '')) == req.patient_id), None)
        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient {req.patient_id} not found in database")
        
        # Use patient coordinates from CSV if available, otherwise use request coordinates
        patient_lat = float(patient.get('lat', req.lat)) if patient.get('lat') else req.lat
        patient_lon = float(patient.get('lon', req.lon)) if patient.get('lon') else req.lon
        
        # Validate coordinates
        if patient_lat is None or patient_lon is None or (patient_lat == 0 and patient_lon == 0):
            raise HTTPException(status_code=400, detail="Patient coordinates are missing or invalid")
        
        top_candidates = []

        if G is None or len(G.nodes) == 0:
            # Graceful empty response if donors not loaded
            return {
                "patient_id": req.patient_id,
                "patient_info": patient,
                "need": req.need,
                "matches": [],
                "patient_hospital": patient.get('hospital', 'Unknown'),
                "patient_region": patient.get('region', 'Unknown')
            }
        for donor_id, attrs in G.nodes(data=True):
            prob = attrs.get("pred_prob", 0) if req.need == "Bombay(Oh)" else 0.1
            
            # Get donor coordinates with validation
            donor_lat = attrs.get("lat")
            donor_lon = attrs.get("lon")
            
            # Skip donors without valid coordinates
            if donor_lat is None or donor_lon is None:
                continue
            
            try:
                donor_lat = float(donor_lat)
                donor_lon = float(donor_lon)
            except (ValueError, TypeError):
                continue
            
            # Skip if coordinates are invalid (0,0 might be a default/placeholder)
            if donor_lat == 0 and donor_lon == 0:
                continue
            
            dist = haversine(donor_lat, donor_lon, patient_lat, patient_lon)
            dist_score = 1 / (1 + dist) if dist > 0 else 1
            score = 0.6 * prob + 0.4 * dist_score
            top_candidates.append({
                "donor_id": donor_id,
                "score": round(score, 3),
                "location": attrs.get("location"),
                "blood_type": attrs.get("blood_type"),
                "distance_km": round(dist, 2),
                "lat": round(donor_lat, 6),
                "lon": round(donor_lon, 6)
            })
        
        top_candidates = sorted(top_candidates, key=lambda x: x["score"], reverse=True)[:req.top_k]
        
        return {
            "patient_id": req.patient_id,
            "patient_info": patient,
            "need": req.need,
            "matches": top_candidates,
            "patient_hospital": patient.get('hospital', 'Unknown'),
            "patient_region": patient.get('region', 'Unknown')
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error matching patient: {str(e)}")



