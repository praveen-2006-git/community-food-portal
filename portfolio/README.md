# Praveen M — Production MERN Stack Portfolio

A high-performance, accessible, production-ready full-stack developer portfolio for **Praveen M**, engineered with the **MERN Stack** (MongoDB, Express.js, React 18, Node.js 20) under strict **"Architectural Precision"** design principles.

---

## ⚡ Architectural Highlights & Core Differentiators

- **Zero AI Clichés**: No purple/cyan gradient text, no floating particle blobs, no robot/brain emojis, and no arbitrary percentage skill meters.
- **Strict Visual Craft**: Hairline borders (`1px solid #1e2436`), Deep Obsidian canvas (`#080a0f`), Titanium Charcoal elevated surfaces (`#0f121a`), and Inter + JetBrains Mono typography.
- **Interactive Backend Sandbox**:
  - **HMAC-SHA256 Verifier**: Live API (`POST /api/demo/verify-hmac`) comparing cryptographic signatures via `crypto.timingSafeEqual()` with 8-block hex byte inspector and a 3-attempt security lockout.
  - **Mongoose Transaction Simulator**: Live API (`GET /api/demo/transaction-demo`) visualizing the 6-step multi-document ACID transaction lifecycle with clean session rollback logic.
- **3 Production-Grade Case Studies (STAR Format)**:
  1. *Community Surplus Food Ingredient Routing Portal* (MERN + OSRM Maps + Multi-Doc ACID Transactions + HMAC Handover)
  2. *Syllabus Management System* (MERN + 3-Tier RBAC + Session Auth + MIME-Validated Upload Pipeline)
  3. *Warranty Tracker Dashboard* (MERN + Automated 30-Day Expiry Cron Alerts + MongoDB Aggregation Engine)
- **Engineered Capabilities Matrix**: Categorized across Server Architecture, ACID Database Modeling, Interface Craft, Security, and Tooling.
- **Full-Stack Working Contact Flow**: Persisted in MongoDB with client & server validation, honeypot bot defenses, rate limiting, and confetti feedback.

---

## 📁 Repository Structure

```
portfolio/
├── client/
│   ├── public/
│   │   └── resume.pdf                  # Resume Asset Placeholder
│   ├── src/
│   │   ├── components/
│   │   │   ├── ErrorFallback.jsx       # Component Error Boundary Fallback
│   │   │   ├── Navbar.jsx              # Telemetry strip, copy badges, skip link
│   │   │   ├── Hero.jsx                # High-contrast H1, subtitle, CTAs, telemetry
│   │   │   ├── BackendShowcase.jsx     # HMAC Verifier + Mongoose Transaction visualizer
│   │   │   ├── Skills.jsx              # Engineered Capabilities Matrix
│   │   │   ├── Projects.jsx            # Case studies with 3 metrics per card
│   │   │   ├── ProjectModal.jsx        # STAR dialog with ASCII architecture & tradeoffs
│   │   │   ├── Education.jsx           # Academic timeline & verified certifications
│   │   │   ├── Contact.jsx             # Validated contact form with honeypot
│   │   │   └── Footer.jsx              # Built with MERN badge & system info
│   │   ├── data/
│   │   │   ├── resumeData.js           # Candidate profile and skills
│   │   │   └── projectsData.js         # Case study specs, metrics, tradeoffs
│   │   ├── hooks/
│   │   │   └── useApi.js               # Reusable API request hook
│   │   ├── App.jsx                     # BrowserRouter & component composition
│   │   ├── main.jsx                    # Vite React entry point
│   │   └── index.css                   # Custom tokens, hairline cards, reduced-motion
│   ├── index.html                      # SEO, OpenGraph, Inter & JetBrains Mono fonts
│   ├── package.json
│   ├── tailwind.config.js              # Architectural palette & tokens
│   ├── vite.config.js                  # Proxy configuration to /api
│   └── .env.example
├── server/
│   ├── config/
│   │   └── db.js                       # Mongoose connection & fallback handler
│   ├── models/
│   │   └── Inquiry.js                  # Contact inquiry schema with indexes
│   ├── routes/
│   │   ├── contactRoutes.js            # POST /api/contact with validation
│   │   └── demoRoutes.js               # POST /api/demo/verify-hmac & transaction
│   ├── middleware/
│   │   └── errorHandler.js             # Centralized sanitizing error handler
│   ├── tests/
│   │   ├── api.test.js                 # Health & demo endpoints integration suite
│   │   └── contact.test.js             # Inquiry submission & validation suite
│   ├── app.js                          # Express setup, Helmet, CORS, Rate limiting
│   ├── server.js                       # Server startup & port listener
│   ├── package.json
│   ├── .env.example
│   └── jest.config.js                  # Jest configuration with coverage thresholds
├── deployment/
│   ├── vercel.json                     # Vercel SPA configuration
│   ├── render.yaml                     # Render Web Service definition
│   └── lighthouse-check.sh             # Automated audit script
├── README.md
└── package.json                        # Root script orchestrator
```

---

## 🛠️ Local Development Setup

### 1. Install All Dependencies
From the `portfolio/` root directory:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy and customize `.env.example` in both `client/` and `server/`:
```bash
# Server (.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/praveen-portfolio
CLIENT_URL=http://localhost:5173
HMAC_SECRET=your-secret-key-change-in-production

# Client (.env)
VITE_API_URL=http://localhost:5000
```

### 3. Run Development Servers
Start both client and server concurrently:
```bash
npm run dev
```
- Frontend application runs on: `http://localhost:5173`
- Backend API server runs on: `http://localhost:5000`

---

## 🧪 Automated Testing & Verification

### Run Backend Integration Tests
```bash
npm test
```
Validates:
- Liveness check (`GET /api/health`)
- HMAC verification with valid signature, invalid signature, and 3-attempt security lockout (`POST /api/demo/verify-hmac`)
- 6-step transaction lifecycle simulation (`GET /api/demo/transaction-demo`)
- Contact validation, email formatting, and honeypot traps (`POST /api/contact`)

### Production Build Verification
```bash
npm run build
```
Compiles client assets with 0 bundling errors via Vite into `dist/`.

---

## 🚀 Deployment

- **Frontend (Vercel)**: Configured via `deployment/vercel.json` with client-side SPA routing rewrites.
- **Backend (Render / Railway / Fly.io)**: Configured via `deployment/render.yaml` with Node.js service definitions and environment variables.
