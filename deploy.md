# Deploying and testing htlkrems-predict (Docker & Podman)

This document explains how to deploy and test the backend using Docker (recommended) and Podman.

**Prerequisites**
- Docker Engine (with Compose v2) or `docker-compose` installed, or
- Podman with `podman-compose` or Podman (v3+/v4+) for the manual pod approach.
- Ports 8000 (backend) and 3306 (MySQL) available on the host.

Repository files referenced:
- [backend/docker-compose.yml](backend/docker-compose.yml)
- [backend/Dockerfile](backend/Dockerfile)

---

## Docker (recommended)

Quick start with Docker Compose

1. From the repository root, change into the backend directory:

```
cd backend
```

2. Start the stack (Compose plugin or standalone binary):

```
docker compose up --build -d
# or
docker-compose up --build -d
```

3. Check status and logs:

```
docker compose ps
docker compose logs -f backend
docker compose logs -f db
```

4. Wait for the `db` service to become healthy (the compose file includes a healthcheck). When healthy the `backend` service will start.

5. Test the running API:

- Open the OpenAPI UI in your browser: http://localhost:8000/docs
- Or use curl to check the docs endpoint (returns HTML, HTTP 200 when running):

```
curl -I http://localhost:8000/docs
```

To call an API endpoint replace the path with a real route (see `/docs`). Example:

```
curl -sS http://localhost:8000/api/v1/markets | jq .
```

6. Stop and remove containers and volumes:

```
docker compose down -v
```

Notes:
- To override defaults, create a `.env` file in `backend/` with variables used in `docker-compose.yml` (for example `MYSQL_PASSWORD`, `JWT_SECRET_KEY`).
- To run the DB initialization script at `backend/db/init.sql` on first start, mount it into the DB container by adding this volume to the `db` service in `docker-compose.yml`:

```
volumes:
  - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

Manual Docker (no compose)

1. Build the backend image:

```
docker build -t htlkrems-predict-backend ./backend
```

2. Run the DB container:

```
docker run -d --name htlkrems-predict-db \
  -e MYSQL_DATABASE=htlkrems_predict \
  -e MYSQL_USER=htlkrems \
  -e MYSQL_PASSWORD=htlkrems123 \
  -e MYSQL_ROOT_PASSWORD=root12345 \
  -p 3306:3306 \
  -v "$(pwd)/backend/db_data:/var/lib/mysql" \
  mysql:8.4
```

3. Run the backend container (adjust envs as needed):

```
docker run -d --name htlkrems-predict-backend \
  --env MYSQL_HOST=htlkrems-predict-db \
  --env MYSQL_PORT=3306 \
  --env MYSQL_USER=htlkrems \
  --env MYSQL_PASSWORD=htlkrems123 \
  --env MYSQL_DB=htlkrems_predict \
  --link htlkrems-predict-db:db \
  -p 8000:8000 \
  htlkrems-predict-backend \
  uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Podman

Option A — `podman-compose` (recommended if available)

1. Install `podman-compose`.
2. From repo root:

```
cd backend
podman-compose up --build -d
```

3. Verify with:

```
podman ps
podman logs -f htlkrems-predict-backend
podman logs -f htlkrems-predict-db
```

Option B — Podman pods (manual, reliable cross-platform approach)

1. Build the backend image:

```
podman build -t htlkrems-predict-backend -f backend/Dockerfile backend
```

2. Create a pod exposing the ports:

```
podman pod create --name htlkrems-pod -p 8000:8000 -p 3306:3306
```

3. Start the DB in the pod:

```
podman run -d --pod htlkrems-pod --name htlkrems-predict-db \
  -e MYSQL_DATABASE=htlkrems_predict \
  -e MYSQL_USER=htlkrems \
  -e MYSQL_PASSWORD=htlkrems123 \
  -e MYSQL_ROOT_PASSWORD=root12345 \
  mysql:8.4
```

4. Start the backend in the same pod (use `localhost` as DB host inside the pod):

```
podman run -d --pod htlkrems-pod --name htlkrems-predict-backend \
  -e MYSQL_HOST=localhost \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=htlkrems \
  -e MYSQL_PASSWORD=htlkrems123 \
  -e MYSQL_DB=htlkrems_predict \
  htlkrems-predict-backend \
  uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Testing and troubleshooting

- Check the backend is responding:

```
curl -I http://localhost:8000/docs
```

- Tail logs:

```
docker compose logs -f backend
podman logs -f htlkrems-predict-backend
```

- Open a shell inside the backend container:

```
docker compose exec backend sh
podman exec -it htlkrems-predict-backend /bin/sh
```

- Common issues:
  - Database not ready: wait and inspect DB logs; the compose file uses a healthcheck for the DB.
  - Environment variables: verify `MYSQL_*` values and `JWT_SECRET_KEY` in your `.env` (or environment overrides).
  - Windows volume mounts: on Windows prefer running inside WSL2 for consistent bind-mounts.

References

- Docker Compose file: [backend/docker-compose.yml](backend/docker-compose.yml)
- Backend Dockerfile: [backend/Dockerfile](backend/Dockerfile)
