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

# Set up with deployment-friendly audio dependencies
setup-deploy:
	python3 -m venv $(VENV_NAME)
	$(PIP) install --upgrade pip
	@echo "🎯 Trying PyAudio installation..."
	@if $(PIP) install -r requirements.txt; then \
		echo "✅ Full installation with PyAudio successful"; \
	else \
		echo "❌ PyAudio failed, using fallback..."; \
		$(PIP) install -r requirements-deploy.txt; \
		echo "✅ Fallback installation complete"; \
	fi

# Start backend server with auto-reload
run:
	@echo "Starting FastAPI backend..."
	@echo ""
	@echo "🚀 Starting Menurithm Backend Server..."
	@echo "📍 Main API: http://127.0.0.1:8000"
	@echo "📚 API Docs: http://127.0.0.1:8000/docs"
	@echo "📖 ReDoc: http://127.0.0.1:8000/redoc"
	@echo "⚡ Auto-reload enabled"
	@echo ""
	$(UVICORN) $(APP_MODULE) --reload

# Start backend server in production mode (for Render)
start:
	@echo "🚀 Starting FastAPI backend in production mode..."
	@echo "📍 Main API: http://0.0.0.0:$${PORT:-8000}"
	@echo "📚 API Docs: http://0.0.0.0:$${PORT:-8000}/docs"
	@echo "📖 ReDoc: http://0.0.0.0:$${PORT:-8000}/redoc"
	@echo ""
	$(UVICORN) $(APP_MODULE) --host 0.0.0.0 --port $${PORT:-8000}

# Show server URLs
urls:
	@echo "🌐 Menurithm Backend URLs:"
	@echo "📍 Main API: http://127.0.0.1:8000"
	@echo "📚 API Docs (Swagger): http://127.0.0.1:8000/docs"
	@echo "📖 API Docs (ReDoc): http://127.0.0.1:8000/redoc"
	@echo "💾 Health Check: http://127.0.0.1:8000/health"

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
