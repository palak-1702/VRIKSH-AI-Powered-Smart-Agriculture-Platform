AgriSave Leaf Classifier Backend
================================

Quickstart
----------

1) Create and activate a virtual environment (recommended)

   - Windows (PowerShell):

     ```bash
     python -m venv .venv
     .venv\\Scripts\\Activate.ps1
     ```

2) Install dependencies

   ```bash
   pip install -r requirements.txt
   ```

3) Run the server

   ```bash
   python app.py
   ```

   The API will listen on http://localhost:5001

API
---

- POST /classify
  - Content-Types:
    - multipart/form-data with field `image`
    - application/octet-stream (raw image bytes)
    - application/json with `{ "image_base64": "..." }`
  - Response (200):

    ```json
    { "class": "healthy|moderate|unhealthy", "confidence": 0.87, "metrics": { "green_ratio": 0.73, "yellow_ratio": 0.09, "brown_ratio": 0.03, "stress_ratio": 0.12, "pixels": 12345 } }
    ```

Examples
--------

Multipart (curl):

```bash
curl -X POST http://localhost:5001/classify -F "image=@./example.jpg"
```

Raw bytes (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:5001/classify" -Method Post -InFile ".\\example.jpg" -ContentType "application/octet-stream"
```

JSON base64:

```bash
python - << 'PY'
import base64, json, requests
b = base64.b64encode(open('example.jpg','rb').read()).decode()
print(requests.post('http://localhost:5001/classify', json={'image_base64': b}).json())
PY
```

Notes
-----

- This backend uses a lightweight HSV heuristic for quick results. You can later replace `classify_leaf_health` in `app.py` with a trained model while keeping the API unchanged.





