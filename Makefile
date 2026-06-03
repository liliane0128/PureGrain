.PHONY: up down logs migrate psql retrain shell clean

up:       ## Start everything
	docker compose up -d --build

down:     ## Stop everything
	docker compose down

logs:     ## Tail all logs
	docker compose logs -f

migrate:  ## Run migrations
	docker compose exec api alembic upgrade head

psql:     ## Open postgres shell
	docker compose exec db psql -U puregrain -d puregrain

retrain:  ## Retrain the model
	docker compose exec api python -m app.ml.train

shell:    ## Bash into api container
	docker compose exec api bash

clean:    ## Stop + delete volumes (data loss!)
	docker compose down -v