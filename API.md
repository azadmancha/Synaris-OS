# API Reference

> **Endpoints will be documented as they are implemented.**

---

## Current Status

| Endpoint | Status |
|---|---|
| `POST /v1/chat` | Planned |
| `POST /v1/quiz` | Planned |
| `GET /v1/progress` | Planned |
| `POST /v1/evaluate` | Planned |
| `GET /v1/health` | Implemented |

---

## Base URL

Production: `https://api.synaris.app/v1`
Development: `http://localhost:8000/v1`

---

## Authentication

All requests (except `/health`) require a JWT token:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained via Google OAuth.

---

## Endpoints

### `POST /v1/chat`

Send a message to the AI tutor.

**Request:**
```json
{
  "message": "Explain entropy",
  "mode": "balanced"
}
```

**Response:**
```json
{
  "response": "...",
  "citations": ["..."],
  "confidence": 0.92
}
```

---

### `POST /v1/quiz`

Generate a quiz on a topic.

**Request:**
```json
{
  "topic": "thermodynamics",
  "difficulty": "medium",
  "question_count": 5
}
```

---

### `GET /v1/progress`

Get the user's learning progress.

---

### `POST /v1/evaluate`

Evaluate a response for quality.

---

## See Also

Detailed API documentation will be added after implementation.
