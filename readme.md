# Secure Auth Service

A Node.js authentication API built with Express, MongoDB, and Mongoose. It includes user registration, login, JWT access tokens, refresh-token sessions, and logout endpoints.

## Requirements

- Node.js compatible with the installed Mongoose version
- MongoDB
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   MONGODB_URL=mongodb://127.0.0.1:27017
   MONGO_NAME=authflow
   JWT_SECRET=replace_with_a_long_random_secret
   ```

   `MONGODB_URL` is combined with `MONGO_NAME` to form the MongoDB connection URL. Keep `.env` private and do not commit real credentials.

3. Start the server:

   ```bash
   npm run dev
   ```

   Or run the production start script:

   ```bash
   npm start
   ```

The API listens on port `500`. For local development, the base URL is `http://localhost:500`.

## API

All routes are prefixed with `/api`. Send JSON request bodies with `Content-Type: application/json`. Refresh-token routes use the `refreshToken` cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/register` | Create an account and start a session |
| `POST` | `/api/login` | Start a session for an existing account |
| `GET` | `/api/get` | Get the current user's username and email |
| `POST` | `/api/refresh-token` | Rotate the refresh token and issue a new access token |
| `POST` | `/api/logout` | Revoke the current session |
| `POST` | `/api/logoutAll` | Revoke all sessions for the user |

### Register

```json
{
  "username": "alex",
  "email": "alex@example.com",
  "password": "choose-a-password"
}
```

Returns an access token and sets a `refreshToken` cookie. Duplicate username or email returns `409`.

### Login

```json
{
  "email": "alex@example.com",
  "password": "choose-a-password"
}
```

Returns user details and tokens. See [Known limitations](#known-limitations) before relying on login in a real environment.

### Get current user

Send the access token in the `Authorization` header:

```http
Authorization: Bearer <access-token>
```

### Refresh, logout, and logout all

These endpoints read the `refreshToken` cookie. Keep cookies enabled in your API client or browser. The access token expires after 15 minutes; refresh tokens are issued with a 7-day lifetime.

## Current implementation notes

- Passwords are intended to be stored as bcrypt hashes.
- Refresh-token hashes are stored with session records in MongoDB.
- The server uses `cookie-parser` to read refresh-token cookies.

## Known limitations

The current source has issues that should be fixed before using this service with real accounts:

- The login handler hashes the submitted password instead of comparing it with the stored hash. It therefore does not correctly verify passwords.
- The logout-all handler refers to `decode.id` instead of the verified token payload's user ID, so session revocation may fail.
- Refresh-token rotation returns the new token in JSON but does not update the refresh-token cookie. A client must account for this, or the handler should set the rotated cookie.
- The cookie option is misspelled as `socure`; the `Secure` cookie attribute is not currently enabled.

These are implementation limitations, not setup steps. Do not rely on the affected endpoints for production authentication until they are corrected.
