
  # Build AgriSave Website

  This is a code bundle for Build AgriSave Website. The original project is available at https://www.figma.com/design/4805HlvFCdjjLuqNVIO8by/Build-AgriSave-Website.

 ## Running the code

 - Frontend (Vite React):
   - Run `npm i`
   - Run `npm run dev`

 - Backend (Flask leaf classifier):
   - `cd backend`
   - Create venv (Windows PowerShell): `python -m venv .venv; .venv\\Scripts\\Activate.ps1`
   - `pip install -r requirements.txt`
   - Build frontend: from project root run `npm run build` (outputs to `dist/`)
   - `python app.py` (serves both frontend and API at http://localhost:5001)

 Single server usage:
 - Visit `http://localhost:5001` to load the React UI served by Flask.
 - The UI will POST to `/classify` on the same origin.
  