# Splitwise UI

A full-stack web interface for adding Splitwise expenses — built on top of the official Splitwise v3.0 API with OAuth 1.0a authentication. Pick a group, choose members, split the bill your way, and submit — all from a clean browser UI without touching the terminal again.

---

## What it does

- Loads your real Splitwise groups and members automatically
- Lets you choose who's involved in each expense
- Supports all four split modes: Equal, Exact, Percent, and Shares
- Shows a live breakdown preview before submitting
- Posts directly to Splitwise via the official API
- Dates are sent in IST (UTC+5:30) so expenses always land on the correct day and appear at the top

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Auth | OAuth 1.0a (HMAC-SHA1) via `oauth-1.0a` |
| API | Splitwise REST API v3.0 |
| HTTP | Axios (server) + fetch (client) |

---

## Project Structure

```
splitwise-ui/
│
├── package.json                  # Root — runs server + client concurrently
│
├── server/
│   ├── .env                      # Your Splitwise OAuth credentials (git-ignored)
│   ├── .env.example              # Template — copy this to .env
│   ├── index.js                  # Express entry point (port 3001)
│   ├── auth.js                   # OAuth 1.0a header generator
│   ├── splitwiseClient.js        # Axios wrapper — GET and POST to Splitwise
│   ├── splitEngine.js            # Pure split math — no API calls
│   └── routes/
│       └── api.js                # All REST route handlers
│
└── client/
    ├── index.html
    ├── vite.config.js            # Dev server + /api proxy to :3001
    └── src/
        ├── main.jsx
        ├── App.jsx               # Root — loads data, renders form + toasts
        ├── index.css             # All styles
        ├── api/
        │   └── client.js         # fetch() wrapper for all API calls
        ├── hooks/
        │   └── useData.js        # Loads current user + groups on mount
        └── components/
            ├── AddExpenseForm.jsx # 4-step expense form (the main UI)
            └── Toast.jsx          # Success / error notifications
```

---

## Getting your credentials

This app needs **four keys** to work. All four are required — every API request is signed with both pairs.

```
CONSUMER_KEY          → identifies your registered app
CONSUMER_SECRET       → signs requests as your app
ACCESS_TOKEN          → identifies which Splitwise user
ACCESS_TOKEN_SECRET   → signs requests as that user
```

Here's how to get them:

### Step 1 — Register a Splitwise app (gets you Consumer Key + Secret)

1. Go to https://secure.splitwise.com/apps/new
2. Fill in any name (e.g. "My Expense UI") and a placeholder callback URL (e.g. `http://localhost:3001/callback`)
3. Click **Create**
4. You'll see your **Consumer Key** and **Consumer Secret** — copy both

### Step 2 — Get your Access Token + Secret (one-time OAuth flow)

The Access Token identifies *you* as the logged-in Splitwise user. You need to do a one-time OAuth handshake to get it. Run these three steps from your terminal:

**2a. Request a temporary token**
```bash
curl -X POST "https://secure.splitwise.com/api/v3.0/get_request_token" \
  --header "Authorization: OAuth oauth_consumer_key=\"YOUR_CONSUMER_KEY\", \
  oauth_signature_method=\"PLAINTEXT\", \
  oauth_signature=\"YOUR_CONSUMER_SECRET%26\""
```
This returns an `oauth_token` and `oauth_token_secret`. Save both.

**2b. Authorize in your browser**

Open this URL in your browser (replace the token):
```
https://secure.splitwise.com/oauth/authorize?oauth_token=OAUTH_TOKEN_FROM_ABOVE
```
Log in with your Splitwise account and click **Authorize**. You'll be redirected to your callback URL — the URL will contain `oauth_token` and `oauth_verifier` in the query string. Copy the `oauth_verifier` value.

**2c. Exchange for a permanent Access Token**
```bash
curl -X POST "https://secure.splitwise.com/api/v3.0/get_access_token" \
  --header "Authorization: OAuth oauth_consumer_key=\"YOUR_CONSUMER_KEY\", \
  oauth_token=\"OAUTH_TOKEN\", \
  oauth_verifier=\"OAUTH_VERIFIER\", \
  oauth_signature_method=\"PLAINTEXT\", \
  oauth_signature=\"YOUR_CONSUMER_SECRET%26OAUTH_TOKEN_SECRET\""
```
This returns your permanent **`oauth_token`** (= `ACCESS_TOKEN`) and **`oauth_token_secret`** (= `ACCESS_TOKEN_SECRET`). These don't expire — you only need to do this once.

### Step 3 — Fill in your .env

```env
CONSUMER_KEY=paste_consumer_key_here
CONSUMER_SECRET=paste_consumer_secret_here
ACCESS_TOKEN=paste_access_token_here
ACCESS_TOKEN_SECRET=paste_access_token_secret_here

PORT=3001
```

> **Never commit this file.** The `.gitignore` already excludes `server/.env`.

---

## How OAuth 1.0a works in this app

Every request to Splitwise is signed with **both** credential pairs:

```
Consumer Key + Secret   →  proves the request comes from your registered app
Access Token + Secret   →  proves the request is acting on behalf of your account
```

Together they produce an `Authorization` header with an HMAC-SHA1 signature. For `POST` requests, the body parameters are also included in the signature — this is why a plain Authorization header alone causes a `401`.

```
CONSUMER_KEY + CONSUMER_SECRET
        ↓
    identifies the app

ACCESS_TOKEN + ACCESS_TOKEN_SECRET
        ↓
    identifies the user

Both pairs together → HMAC-SHA1 signature → Authorization header → Splitwise accepts the request
```

If any of the four values is wrong or missing, every API call returns `401 Unauthorized`.

---

## Setup

### Prerequisites

- Node.js v18 or later
- All four credentials from the section above

### 1. Install dependencies

```bash
# In the root folder
npm install

cd server && npm install
cd ../client && npm install
```

### 2. Configure credentials

```bash
cp server/.env.example server/.env
# Fill in all four values
```

### 3. Run

**Option A — single command:**
```bash
npm run dev
```

**Option B — two terminals (recommended on Windows):**

Terminal 1:
```bash
cd server
npm run dev
```

Terminal 2:
```bash
cd client
npm run dev
```

Open **http://localhost:5173**

---

## How to use

The UI is a 4-step flow:

**Step 1 — Group**
Pick the Splitwise group for this expense. Toggle which members are involved.

**Step 2 — Details**
Enter the description, total amount, currency, date, and who paid.

**Step 3 — Split**
Choose how to divide the bill:

| Mode | How it works |
|---|---|
| ⚖️ Equal | Total divided evenly among all selected members |
| 💲 Exact | You type each person's exact amount — must sum to total |
| % Percent | You type each person's percentage — must sum to 100% |
| 🔢 Shares | You enter a ratio (e.g. 2:1:1) — amounts computed automatically |

**Step 4 — Review**
See the full breakdown before confirming. Click **Add Expense** to submit.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/me` | Returns the authenticated Splitwise user |
| `GET` | `/api/groups` | Returns all groups with their members |
| `GET` | `/api/friends` | Returns all friends |
| `POST` | `/api/expenses/preview` | Computes the split breakdown without submitting |
| `POST` | `/api/expenses` | Submits the expense to Splitwise |

### POST /api/expenses — request body

```json
{
  "total": "1305.53",
  "description": "Dinner at Hyderabad House",
  "groupId": 96201311,
  "currency": "INR",
  "date": "2026-05-02",
  "paidBy": "78809124",
  "splits": {
    "type": "exact",
    "values": [
      { "user": "49302338", "amount": "303" },
      { "user": "54883564", "amount": "570.6" },
      { "user": "78809124", "amount": "431.93" }
    ]
  }
}
```

---

## Architecture notes

**OAuth signing for POST requests**
For `POST` requests with `application/x-www-form-urlencoded` bodies, the body parameters must be included in the OAuth signature base string — not just the URL. `splitwiseClient.js` passes the body params into `oauth.authorize()` before encoding them for the request body. Omitting this causes a `401` even with correct credentials.

**Split engine**
`server/splitEngine.js` is pure computation — no API calls. It takes a total, a payer, and a split config, and outputs the `users__N__user_id / paid_share / owed_share` payload Splitwise expects. The last person always gets the remainder to prevent rounding drift, so `Σ owed_share` always equals the total exactly.

**Date handling (IST)**
Dates are sent as `YYYY-MM-DDT23:59:00+05:30`. This keeps the expense on the correct calendar date when Splitwise converts to UTC, and ensures it sorts to the top within that day.

---

## .gitignore

```
server/.env
node_modules/
dist/
```