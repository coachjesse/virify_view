# Virify API Backend

Express + MongoDB microservice that stores and serves NumVerify API keys (and can be extended for other secrets).

## Requirements

- Node.js 18+
- MongoDB 6+ cluster/instance

## Environment variables

Create a `.env` file based on the template below:

```
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster-url/db-name
CORS_ORIGIN=http://localhost:5173
APP_NAME=virify-backend
```

`CORS_ORIGIN` accepts a comma‑separated list (use `*` to allow everything during local development).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with hot reloading |
| `npm run build` | Emit compiled JS to `dist/` |
| `npm start` | Serve the compiled output |

## API

- `GET /health` → service heartbeat
- `GET /api/api-key` → returns `{ apiKey, updatedAt }`
- `PUT /api/api-key` → accepts `{ apiKey: string }` to create/update; send an empty string to clear
- `DELETE /api/api-key` → removes the stored key

All responses are JSON.

