.PHONY: up down restart build logs shell \
        migrate retrain psql clean

# ── Docker Compose ───────────────────────────────────────────────────────────

up:          ## Build & start all services (db + api) in background
	docker compose up -d --build

down:        ## Stop and remove containers (volumes preserved)
	docker compose down

restart:     ## Restart only the API container
	docker compose restart api

build:       ## Rebuild the API image without starting
	docker compose build api

logs:        ## Tail logs from all services
	docker compose logs -f

logs-api:    ## Tail API logs only
	docker compose logs -f api

logs-db:     ## Tail DB logs only
	docker compose logs -f db

# ── Database ─────────────────────────────────────────────────────────────────

migrate:     ## Apply Alembic migrations inside running api container
	docker compose exec api alembic upgrade head

migrate-down: ## Rollback one migration
	docker compose exec api alembic downgrade -1

psql:        ## Open a psql shell in the db container
	docker compose exec db psql -U puregrain -d puregrain

# ── ML Model ─────────────────────────────────────────────────────────────────

retrain:     ## Force retrain the Random Forest (deletes old artifact)
	docker compose exec api sh -c "rm -f app/data/model.joblib && python -m app.ml.train"

# ── Dev (local, no Docker) ───────────────────────────────────────────────────

dev:         ## Start API locally (requires local postgres + venv)
	.venv/bin/uvicorn app.main:app --reload --port 8000

train:       ## Train model locally (no Docker)
	.venv/bin/python -m app.ml.train

# ── Shell ────────────────────────────────────────────────────────────────────

shell:       ## Open a bash shell inside the api container
	docker compose exec api bash

# ── Cleanup ──────────────────────────────────────────────────────────────────

clean:       ## Stop containers AND delete all volumes (data loss!)
	docker compose down -v

help:        ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
