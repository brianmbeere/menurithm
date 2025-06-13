# Menurithm MVP

AI-powered restaurant menu generator.

## System Architecture

- **Frontend**: React.js (file upload, menu constraints form, output view, PDF export)
- **Backend**: FastAPI (Python) (handles user input, validation, API routes)
- **Menu Engine**: Rule-based logic (ingredient-to-dish matching), ML model (optional)
- **Data Store**: PostgreSQL, Object Storage (CSV uploads, menu exports)

## Folder Structure

```
/menurithm-mvp
|-- frontend/                  # React app
|   |-- components/
|   |-- pages/
|   |-- App.js
|-- backend/                   # FastAPI server
|   |-- routers/
|   |-- services/
|   |-- main.py
|-- engine/                    # Menu generation logic
|   |-- rules_engine.py
|   |-- ml_model.py (optional)
|-- data/                      # Uploaded and test data
|-- output/                    # Exported PDFs
|-- docker-compose.yml
|-- README.md
```

## Key Entry Points
- `frontend/App.js`: Connects UI to backend API
- `backend/main.py`: API routes for menu generation
- `engine/rules_engine.py`: Ingredient-to-dish logic
- `engine/ml_model.py`: Predictive model (optional)

## Deployment
- Dockerized for easy deployment
- MVP hosting: Render, Railway, or Heroku

## MVP Timeline
- **Week 1**: Backend + Menu Generation Logic
- **Week 2**: Frontend + Export Menu Output
- **Week 3**: Usability Testing