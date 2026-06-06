.PHONY: up down logs logs-api front migrate psql import-test shell clean

up:              ## Build + start backend (Docker) and frontend (local, port 3000)
	docker compose up -d --build
	cd frontend && npm install && npm run dev

front:           ## Start frontend locally only (port 3000)
	cd frontend && npm install && npm run dev

down:            ## Stop Docker containers
	docker compose down

logs:            ## Tail logs from all services
	docker compose logs -f

logs-api:        ## Tail api logs only
	docker compose logs -f api

migrate:         ## Run Alembic migrations
	docker compose exec api alembic upgrade head

psql:            ## Open a psql shell
	docker compose exec db psql -U puregrain -d puregrain

import-test:     ## Import test CSV (backend/app/data/input.csv) into the DB
	curl -s -X POST http://localhost:8000/api/v1/imports/csv \
		-F "file=@backend/app/data/input.csv" | python3 -m json.tool

shell:           ## Bash into the api container
	docker compose exec api bash

clean:           ## Stop containers and delete all volumes (data loss!)
	docker compose down -v
