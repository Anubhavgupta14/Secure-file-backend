## Secure File Backend

Secure, deduplicated file upload API built with Express. Files are uploaded to Cloudinary, metadata is stored in PostgreSQL, and duplicates are detected using SHA-256 content hashing.

### Features
- **Secure uploads**: Helmet, rate limiting, and JSON size limits
- **Deduplication**: SHA-256 prevents storing identical files twice
- **External storage**: Files stored in Cloudinary; app stores metadata only
- **PostgreSQL schema**: Simple `files` table with helpful indexes

---

## Quick Start

### Prerequisites
- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+
- **PostgreSQL**: v14+ (local or Docker)
- **Cloudinary account**: Cloud name, API key, API secret

### 1) Install dependencies
```bash
npm install
```

### 2) Start PostgreSQL (via Docker), you can also use supabase URL to skip this step
```bash
docker run --name files-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=files -p 5432:5432 -d postgres:16
```

### 3) Configure environment
Create a `.env` in the project root:
```bash
# Server
PORT=3000

# Database
# (For Docker, you can directly use this url else for supabase replace with your actual db url)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/files
# (For Docker, running db locally)
PGSSL=false
# (For Supabase, of any other cloud service)
PGSSL=true

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional
CLOUDINARY_FOLDER=uploads
```

### 4) Run the server
```bash
# Dev (auto-reload)
npm run dev

# Prod
npm start
```

Health check:
```bash
curl -s http://localhost:3000/health | jq
```

---

## Environment Variables
- **PORT**: Server port (default: `3000`)
- **DATABASE_URL**: PostgreSQL connection string (required)
- **PGSSL**: Set to `true` to enable SSL (with `rejectUnauthorized: false`), else `false`
- **CLOUDINARY_CLOUD_NAME**: Cloudinary cloud name (required)
- **CLOUDINARY_API_KEY**: Cloudinary API key (required)
- **CLOUDINARY_API_SECRET**: Cloudinary API secret (required)
- **CLOUDINARY_FOLDER**: Optional Cloudinary folder to store uploads (default: `uploads`)

---

## API Reference
Base URL: `http://localhost:3000`

### Common Error Format
```json
{
  "status": 400,
  "error": "Message"
}
```

### GET /health
Simple readiness probe.
```bash
curl -s http://localhost:3000/health | jq
```

### POST /files/upload
Upload a file. Accepts `multipart/form-data` with a single field named `file`. Max size: 25 MB.

- **201 Created** for new uploads
- **200 OK** with `duplicate: true` if the same file content already exists
- **400 Bad Request** if no file is provided

You can use Postman to test.

Request (cURL):
```bash
curl -s -X POST \
  -F "file=@/absolute/path/to/your-file.png" \
  http://localhost:3000/files/upload | jq
```

Successful response (new file):
```json
{
  "status": 201,
  "duplicate": false,
  "file": {
    "id": "b1a7d5f1-...",
    "originalName": "your-file.png",
    "mimeType": "image/png",
    "byteSize": 12345,
    "sha256": "<hash>",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "publicId": "uploads/abc123",
    "url": "https://res.cloudinary.com/..."
  }
}
```

Successful response (duplicate upload):
```json
{
  "status": 200,
  "duplicate": true,
  "file": { /* same shape as above */ }
}
```

### GET /files
List all files ordered by newest first.
```bash
curl -s http://localhost:3000/files | jq
```
Response:
```json
{
  "status": 200,
  "files": [
    {
      "id": "...",
      "originalName": "...",
      "mimeType": "...",
      "byteSize": 123,
      "sha256": "...",
      "createdAt": "...",
      "publicId": "...",
      "url": "https://res.cloudinary.com/..."
    }
  ]
}
```

### GET /files/:id/metadata
Fetch metadata for a specific file by `id`.
```bash
curl -s http://localhost:3000/files/<id>/metadata | jq
```
Responses:
- **200 OK** with `{ status, file }`
- **404 Not Found** if no record exists

### GET /files/:id/download
Redirect to the Cloudinary URL for the file.
```bash
# See redirect headers
curl -I http://localhost:3000/files/<id>/download

# Follow redirect and download
curl -L -o output.bin http://localhost:3000/files/<id>/download
```

---

## Postman Usage
You can test all endpoints in Postman:

- **Base URL**: Set a Postman environment variable `baseUrl` = `http://localhost:3000`.
- **Requests**:
  - **POST** `{{baseUrl}}/files/upload`
    - Body: `form-data` → Key: `file` (type: File) → choose a local file
    - Expected: `201` with `duplicate: false` or `200` with `duplicate: true`
  - **GET** `{{baseUrl}}/files`
    - No body
    - Expected: `200` with `files` array
  - **GET** `{{baseUrl}}/files/:id/metadata`
    - Replace `:id` with the `id` from a previous response
    - Expected: `200` with `file`, or `404` if not found
  - **GET** `{{baseUrl}}/files/:id/download`
    - Replace `:id`
    - Expected: `302` redirect to Cloudinary. Enable "Follow redirects" or test with `curl -L`.
  - **GET** `{{baseUrl}}/health`
    - Expected: `{ "status": 200, "message": "ok" }`

---

## Implementation Notes
- Rate limit: `300` requests per `15m` (global)
- JSON body limit: `1mb` (non-multipart endpoints)
- Hashing: Server computes SHA-256 of uploaded content to detect duplicates
- Storage: Only Cloudinary URL/IDs are stored; file bytes are not stored locally
- Table: Automatically created on startup as `files (id, original_name, public_id, secure_url, mime_type, byte_size, sha256, created_at)`

---

## Scripts
- **dev**: `nodemon src/server.js`
- **start**: `node src/server.js`

