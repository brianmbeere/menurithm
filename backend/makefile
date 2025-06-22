# === CONFIGURATION ===
VENV_NAME=venv
PYTHON=$(VENV_NAME)/bin/python
PIP=$(VENV_NAME)/bin/pip
UVICORN=$(VENV_NAME)/bin/uvicorn
APP_MODULE=app.main:app

# === COMMANDS ===

# Set up virtualenv and install dependencies
setup:
	python3 -m venv $(VENV_NAME)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

# Start backend server with auto-reload
run:
	@echo "Starting FastAPI backend..."
	$(UVICORN) $(APP_MODULE) --reload

# Start backend server in production mode (for Render)
start:
	@echo "Starting FastAPI backend in production mode..."
	$(UVICORN) $(APP_MODULE) --host 0.0.0.0 --port $${PORT:-8000}

# Format code using black
format:
	$(VENV_NAME)/bin/black app

# Run Python REPL inside virtualenv
shell:
	$(PYTHON)

# Delete virtual environment
clean:
	rm -rf $(VENV_NAME)

# Show environment variables
env:
	@echo DATABASE_URL=$$(grep DATABASE_URL .env | cut -d '=' -f2)
	@echo ALLOWED_ORIGINS=$$(grep ALLOWED_ORIGINS .env | cut -d '=' -f2)
