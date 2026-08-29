# 🥗 Community Surplus Food Ingredient Routing Portal

Hey there! 👋 Welcome to our project repository. 

This is a full-stack MERN application we built to solve a real-world problem: helping commercial food donors (like hotels, caterers, marriage halls, and restaurants) easily share their raw, perishable surplus ingredients (especially fresh vegetables!) with local soup kitchens and shelters who need them. 

Rather than letting fresh food go to waste, this portal connects the donor and kitchen directly with map routing and a secure handover confirmation!

---

## 🚀 Key Features we built:

*   **Easy Donor Uploads:** Donors can quickly list what raw ingredients they have, category tags, storage types (Ambient, Chilled, or Frozen), and set strict deadlines so kitchens know when to pick them up.
*   **Indian Gathering Venues:** We structured donor profiles specifically for common venues in India like Mandapams, hotels, marriage halls, community halls, and temples.
*   **Smart Nearby Matching:** Community kitchens see a feed of approved ingredients sorted nearest-first within a default 15 km radius.
*   **Pickup Route Support:** An interactive Leaflet map shows exactly where the kitchen (destination) and donor (origin) are, plotting the route using a free OpenStreetMap (OSRM) driving route API. If the routing API goes down, it draws a direct fallback line automatically.
*   **Atomic Claim Transactions:** To prevent two kitchens from claiming the same ingredient batch at the exact same time, we set up Mongoose database transactions. If any database write fails, the whole operation rolls back safely.
*   **FEFO Pantry Logging:** When a kitchen picks up an ingredient, it is added to their local inventory sorted by First-Expired, First-Out (FEFO) rules so they cook with the oldest ingredients first.
*   **Secure 6-Digit Handover Verification:** We built a custom validation protocol where the donor enters a 6-digit code shared by the kitchen. The server compares the code hashes timing-safely to prevent hacks, and locks out verification after 3 wrong guesses.
*   **Dynamic UI Themes:** We styled the UI with a clean Vercel-style default dark theme, a sleek minimalist light theme, segmented pill-navigation buttons, and monospace numeric layouts.

---

## 🛠️ Setup & Environment Variables

Create a file named `.env` in the `server/` directory and configure these fields:

```env
MONGODB_URI=mongodb://localhost:27017/community-food-portal
JWT_SECRET=your_jwt_signing_key_secret
PORT=5000
FRONTEND_URL=http://localhost:5173
PICKUP_CODE_SECRET=your_32_character_or_longer_secure_hmac_secret_key
