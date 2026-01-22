# === CONFIGURATION ===
VENV_NAME=venv
PYTHON=$(VENV_NAME)/bin/python
PIP=$(VENV_NAME)/bin/pip
UVICORN=$(VENV_NAME)/bin/uvicorn
APP_MODULE=app.main:app

# === COMMANDS ===

# Set up virtualenv and install dependencies (deployment-ready)
setup:
	python3 -m venv $(VENV_NAME)
	$(PIP) install --upgrade pip
	@echo "🎯 Installing dependencies (PyAudio-free for deployment compatibility)..."
	$(PIP) install -r requirements.txt
	@echo "✅ Installation complete with pydub + SpeechRecognition audio backend"

# Legacy setup with PyAudio fallback (for development environments that might have PyAudio)
setup-legacy:
	python3 -m venv $(VENV_NAME)
	$(PIP) install --upgrade pip
	@echo "🎯 Attempting installation with potential PyAudio..."
	@if $(PIP) install PyAudio==0.2.14; then \
		echo "✅ PyAudio available, installing with full audio support"; \
		$(PIP) install -r requirements.txt PyAudio==0.2.14; \
	else \
		echo "❌ PyAudio compilation failed, using deployment-friendly setup..."; \
		$(PIP) install -r requirements.txt; \
		echo "✅ Fallback installation complete (pydub + SpeechRecognition)"; \
	fi

# Alternative setup using deployment-specific requirements (if needed)
setup-deploy:
	python3 -m venv $(VENV_NAME)
	$(PIP) install --upgrade pip
	@echo "🎯 Using deployment-specific requirements..."
	$(PIP) install -r requirements-deploy.txt
	@echo "✅ Deployment setup complete"

# Start backend server with auto-reload
run:
	@echo "Starting FastAPI backend..."
	@echo ""
	@echo "🚀 Starting Menurithm Backend Server..."
	@echo "📍 Main API: http://127.0.0.1:8001"
	@echo "📚 API Docs: http://127.0.0.1:8001/docs"
	@echo "📖 ReDoc: http://127.0.0.1:8001/redoc"
	@echo "⚡ Auto-reload enabled"
	@echo ""
	$(UVICORN) $(APP_MODULE) --reload --port 8001

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
