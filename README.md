# 🩸 RaktSetu — Bridging Donors & Lives

**RaktSetu** is a full-stack blood donation web application built to connect **blood donors and recipients** effortlessly.  
Designed during a hackathon, it integrates a **FastAPI backend** with a **modern frontend** powered by **HTML, CSS, and JavaScript** (with npm for development).

---

## 🚀 Overview

RaktSetu empowers users to:
- 🔍 Search for nearby donors by blood group & location  
- 🩸 Register as a donor with contact & availability details  
- 📩 Request blood when in need  
- ⚙️ Seamlessly integrate backend APIs with a fast, responsive UI  

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | HTML, CSS, JavaScript (served with npm) |
| **Backend** | FastAPI (Python) |
| **Server** | Uvicorn |
| **Database** | SQLite / PostgreSQL |
| **Environment Management** | Virtualenv + requirements.txt |

---

## 📁 Project Structure

```

RaktSetu/
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── routes/              # API routes (donors, requests)
│   │   ├── models.py            # Database models
│   │   ├── database.py          # DB connection setup
│   │   └── schemas.py           # Pydantic models
│   ├── requirements.txt         # Python dependencies
│
├── frontend/
│   ├── index.html               # Homepage
│   ├── register.html            # Donor registration page
│   ├── request.html             # Request form
│   ├── style.css                # Styling
│   ├── script.js                # JS logic for API calls
│   ├── package.json             # npm dependencies
│
├── README.md
└── .gitignore

````

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/RaktSetu.git
cd RaktSetu
````

---

### 2️⃣ Backend Setup (FastAPI + Uvicorn)

#### Create a Virtual Environment

```bash
cd backend
python -m venv venv
```

Activate it:

* **Windows:** `venv\Scripts\activate`
* **Mac/Linux:** `source venv/bin/activate`

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Run Backend Server

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Your backend API will start at:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

API Docs available at:

* **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### 3️⃣ Frontend Setup (HTML + JS + npm)

Open a new terminal and navigate to the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

Your frontend will run at (depending on your setup):
👉 **[http://localhost:5173](http://localhost:5173)** or **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

---

### 4️⃣ Connect Frontend & Backend

In your frontend JavaScript files (like `script.js`), make sure the backend API base URL matches:

```javascript
const BASE_URL = "http://127.0.0.1:8000";
```

---

## 🧾 Example `requirements.txt`

```
fastapi
uvicorn
pandas
joblib
networkx
numpy
pydantic
scikit-learn

```

You can generate your own via:

```bash
pip freeze > requirements.txt
```

---

## 📡 API Routes Overview

| Endpoint                | Method | Description                    |
| ----------------------- | ------ | ------------------------------ |
| `/donors/register`      | POST   | Register a new donor           |
| `/donors`               | GET    | Fetch all donors               |
| `/donors/{blood_group}` | GET    | Get donors by blood group      |
| `/requests/create`      | POST   | Submit a blood request         |
| `/requests`             | GET    | View all active blood requests |

---

## 🧠 Challenges Faced

* The dataset provided included **only donor information**, so we created synthetic patient datasets for requests.
* **Cross-Origin (CORS)** issues between frontend & backend were resolved using FastAPI middleware.
* Built **real-time form validation** and ensured smooth RESTful communication between JS and Python services.

---

## 🤝 Contribution Guide

1. Fork the repository
2. Create your feature branch
3. Commit and push changes
4. Open a pull request

---

## 🏁 License

Licensed under the **MIT License**.
Feel free to use and modify for non-commercial and educational purposes.




