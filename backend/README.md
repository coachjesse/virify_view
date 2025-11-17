# Valid Phone Backend

Bootstrapped Node.js project with Express and a minimal folder structure.

## Getting started

1. Install dependencies
   ```
   npm install
   ```
2. Copy the example env file
   ```
   cp .env.example .env
   ```
3. Start the dev server
   ```
   npm run dev
   ```

## Available scripts
- `npm run dev` — start the server with nodemon
- `npm start` — run the server with Node
- `npm run build` — build script (placeholder)
- `npm test` — placeholder test script

## Firebase Setup

This backend uses Firebase Firestore for data storage. Configure Firebase by setting one of the following environment variables:

1. **Service Account Key** (recommended for production):
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}
   ```

2. **Project ID** (for GCP/Cloud Run with default credentials):
   ```
   FIREBASE_PROJECT_ID=your-project-id
   ```

3. **Default Credentials**: If running on GCP, Firebase Admin SDK will use Application Default Credentials automatically.

## API Endpoints

### Health Check
- `GET /api/health` - Check server health status

### Watch Time History
- `POST /api/history` - Add a new watch time history entry
  - Body: `{ uid, email, ip (optional), watchedTime }`
- `GET /api/history` - Get all watch time history entries
  - Query params: `uid` (optional) - filter by user ID
- `DELETE /api/history/:id` - Delete a watch time history entry by ID

## Project structure

```
src/
├── app.js          # Express app and middleware
├── config/         # Environment configuration
│   └── firebase.js # Firebase initialization
├── controllers/    # Route controllers
│   ├── healthController.js
│   └── historyController.js
├── index.js        # Application entry point
├── middleware/     # Reusable middleware
├── routes/         # API routes
│   ├── index.js
│   └── historyRoutes.js
└── utils/          # Helpers
```

