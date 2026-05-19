.PHONY: dev build seed migrate docker-up docker-down lint typecheck clean

dev:
	pnpm dev

build:
	pnpm build

seed:
	pnpm seed

migrate:
	pnpm migrate

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-clean:
	docker-compose down -v --remove-orphans

lint:
	pnpm lint

typecheck:
	pnpm typecheck

clean:
	pnpm clean

install:
	pnpm install

setup: install docker-up
	@echo "Waiting for services to be ready..."
	@sleep 5
	@pnpm migrate
	@pnpm seed
	@echo "Setup complete! Run 'make dev' to start development servers."
