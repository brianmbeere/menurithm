# === PATHS ===
FRONTEND_DIR=frontend
BACKEND_DIR=backend

# === COMBINED TASKS ===

# Install both frontend and backend dependencies
install:
	cd $(FRONTEND_DIR) && make install
	cd $(BACKEND_DIR) && make setup

# Run both frontend and backend dev servers
dev-all:
	cd $(FRONTEND_DIR) && make dev &
	cd $(BACKEND_DIR) && make run

# Clean everything (node_modules, venv, dist)
clean-all:
	cd $(FRONTEND_DIR) && make clean
	cd $(BACKEND_DIR) && make clean

# Format backend only
format:
	cd $(BACKEND_DIR) && make format

# Rebuild frontend
build:
	cd $(FRONTEND_DIR) && make build

# Serve built frontend and backend (useful for demo/testing)
preview-all:
	cd $(FRONTEND_DIR) && make preview &
	cd $(BACKEND_DIR) && make run

# Show env settings
env:
	cd $(FRONTEND_DIR) && make env
	cd $(BACKEND_DIR) && make env
