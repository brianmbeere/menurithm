# === CONFIGURATION ===
NPM=npm
VITE_PORT=5173

# === COMMANDS ===

# Install dependencies
install:
	$(NPM) install

# Start dev server
dev:
	$(NPM) run dev

# Run type checking
typecheck:
	$(NPM) run type-check

# Run linting (optional: requires eslint setup)
lint:
	$(NPM) run lint

# Build for production
build:
	$(NPM) run build

# Preview production build
preview:
	$(NPM) run preview -- --port $(VITE_PORT)

# Remove node_modules and lockfile
clean:
	rm -rf node_modules package-lock.json dist

# Show active Vite port
env:
	@echo "Frontend running on http://localhost:$(VITE_PORT)"
