# 🦪 Pearl Exchange

> Live market simulation for classrooms — digitises role cards, tracks transactions in real time, and calculates economic surplus automatically.

---

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | Next.js 14 (App Router)       |
| Backend  | Next.js API Routes            |
| Database | NeonDB (Serverless Postgres)  |
| Hosting  | Vercel                        |
| Styling  | Tailwind CSS + CSS variables  |

---

## Setup

### 1. Database — NeonDB

1. Create a free project at [neon.tech](https://neon.tech)
2. Open the **SQL Editor** in the Neon dashboard
3. Paste and run the contents of `db/schema.sql`
4. Copy your **Connection String** from `Connection Details`

### 2. Local Development

```bash
npm install
cp .env.example .env.local
# Paste your Neon connection string into .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel

```bash
npx vercel
# Add DATABASE_URL as an environment variable in the Vercel dashboard
```

Or connect your GitHub repo to Vercel for automatic deploys.

---

## How to Run a Class

### Teacher
1. Go to the app URL → **Create Game**
2. Set a passphrase (remember it — you'll need it to control the session)
3. Share the **6-digit PIN** with students (display on projector)
4. Wait for everyone to join → click **Start Round**
5. Monitor live trades on the dashboard
6. Click **End Round** when time is up → penalties applied automatically
7. Optionally queue a **Market Shock** before the next round
8. Repeat from step 4

### Students
1. Go to the app URL on their phone → **Join Game**
2. Enter the PIN + their name
3. Wait in lobby until the teacher starts
4. Receive a secret role (BUYER or SELLER) with a secret value
5. Negotiate verbally with classmates, then log the trade in the app
6. Partner confirms → surplus calculated automatically

---

## Game Rules

| Rule | Detail |
|------|--------|
| Buyers | Max willingness to pay: $95–$140 |
| Sellers | Min willingness to accept: $50–$95 |
| Consumer Surplus | Max Price − Transaction Price |
| Producer Surplus | Transaction Price − Min Price |
| No-trade penalty | Entire secret value deducted from total surplus |
| Partner restriction | Cannot trade with the same person across consecutive rounds |

---

## Market Shocks

Shocks are queued between rounds and applied when the next round starts.

- **Supply Shock** — shifts all seller minimum prices upward (models scarcity)
- **Demand Shock** — shifts all buyer maximum prices upward (models increased desire)

Example shock descriptions:
- `"A mysterious virus is killing the oysters!"` → supply shock, +$20
- `"Face masks are suddenly in high demand!"` → demand shock, +$25

---

## Project Structure

```
pearl-exchange/
├── db/
│   └── schema.sql              # Run once in Neon SQL Editor
├── lib/
│   ├── db.ts                   # NeonDB connection
│   └── game.ts                 # PIN gen, role distribution, surplus calc
└── app/
    ├── page.tsx                # Home: Create / Join
    ├── teacher/[sessionId]/    # Teacher dashboard
    ├── play/[sessionId]/       # Student view
    └── api/sessions/           # All API routes
        ├── route.ts            # POST /api/sessions
        └── [id]/
            ├── route.ts        # GET session status
            ├── players/        # GET players / POST join
            ├── rounds/         # POST start round / POST end round
            ├── transactions/   # GET feed / POST propose / PUT confirm
            └── shocks/         # GET / POST market shocks
```

---

## Environment Variables

| Variable       | Description                          |
|----------------|--------------------------------------|
| `DATABASE_URL` | NeonDB connection string (required)  |
