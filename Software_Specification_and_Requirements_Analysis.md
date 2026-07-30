# SOFTWARE PROJECT SPECIFICATION & REQUIREMENTS ANALYSIS
## Community Food Surplus Portal & Ledger System

**Document Ref:** SRS-CFPL-2026-V1.2  
**Date:** July 29, 2026  
**Status:** APPROVED / PRODUCTION-READY  
**Author/Prepared For:** Academic & Software Engineering Reference  

---

## Table of Contents
1. [Project Overview & Objectives](#1-project-overview--objectives)
2. [Scope of the Project](#2-scope-of-the-project)
3. [Stakeholder Analysis & Requirements Gathering](#3-stakeholder-analysis--requirements-gathering)
4. [Functional Requirements & Role-Based Access Control (RBAC)](#4-functional-requirements--role-based-access-control-rbac)
5. [Detailed User Workflows & Use Cases](#5-detailed-user-workflows--use-cases)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [System Architecture & Technology Stack](#7-system-architecture--technology-stack)
8. [Database Requirements & Data Model](#8-database-requirements--data-model)
9. [API Requirements & Interface Specifications](#9-api-requirements--interface-specifications)
10. [Frontend & UI/UX Requirements](#10-frontend--uiux-requirements)
11. [Security, Validation, & Error Handling](#11-security-validation--error-handling)
12. [Testing, Deployment, & Environment Requirements](#12-testing-deployment--environment-requirements)
13. [Assumptions, Constraints, Dependencies, & Risks](#13-assumptions-constraints-dependencies--risks)
14. [Potential Gaps & Missing Requirements (Critical Analysis)](#14-potential-gaps--missing-requirements-critical-analysis)
15. [Requirements Review Checklist](#15-requirements-review-checklist)

---

## 1. Project Overview & Objectives

### 1.1 Project Overview
The **Community Food Surplus Portal & Ledger System** is an interactive, role-based platform designed to coordinate the rescue and distribution of surplus food. The platform bridges the gap between commercial food donors (supermarkets, restaurants, farms, bakeries) and local charity recipients (soup kitchens, shelters, food banks) through a secure custody log and transparent reputation tracker. 

By integrating geospatial query networks, the system matches available surplus assets to nearby kitchens in real-time, reducing transport latency, avoiding spoilage, and tracking transaction history.

### 1.2 Objectives and Goals
*   **Minimize Spoilage:** Connect food donors and soup kitchens within tight time boundaries before food items reach their expiry date.
*   **Ensure Chain of Custody:** Establish a robust custody logging mechanism (Pending -> Approved -> Reserved -> Picked Up -> Delivered -> Fulfilled) to trace item safety.
*   **Establish Accountability:** Implement a dynamic reputation ledger scoring algorithm that suspends underperforming or unsafe donors.
*   **Support Administrative Audits:** Provide a high-performance admin portal to approve listings, manage quality disputes, and oversee accounts.

### 1.3 Problem Statement
Modern supply chains suffer from a matching paradox: commercial establishments discard consumable food products daily due to inventory surpluses, while neighboring food banks struggle to source nutrition due to coordinate mismatches and lack of pickup transportation. Existing platforms lack structural verification codes and accountability systems, leading to transport waste, disputes, and potential health hazards from unmonitored storage conditions.

---

## 2. Scope of the Project

### 2.1 In-Scope Features
*   **Multi-Role Authentication:** Separate workflows and views for Donors, Soup Kitchens, and System Administrators.
*   **Surplus Upload Form:** A structured upload interface for Donors to declare listing details, including unit representation, category classification, storage temperature constraints, expiry date, and pickup deadline offsets.
*   **Geospatial Listing Feeds:** Location-aware, paginated feeds sorting available surplus food by absolute proximity (kilometers away) from the requesting kitchen using MongoDB `2dsphere` query operators.
*   **Interactive Coordinates Selection:** Leaflet map visualizers on registration allowing users to click and accurately pin their coordinates.
*   **Secure Verification Flow:** A 6-digit cryptographic code validation mechanism required at the physical handoff location to mark a reservation as `fulfilled`.
*   **Quality Audit Log:** A dispute submission pipeline for kitchens to report quality/safety defects (attaching reference links), audited by Administrators.
*   **Reputation Ledger:** A dynamic, paginated leaderboard ranking all active organizations by reputation score, applying automated suspensions when score drops below 40.
*   **Global Search Widget:** A header-based, role-aware search bar filtering all dashboard tables and grid cards in real-time.
*   **Interactive Top Header Console:** Featuring a theme toggle (Light / Dark mode), dropdown notifications popover (with "Mark all as read" capability), and user profile popover menu.

### 2.2 Out-of-Scope Features
*   **Tax Receipt / Financial Ledger Integration:** Automatic generation of tax-deductible receipts for donated goods.
*   **Integrated Delivery Dispatching / Fleet Routing:** Automated route planning or native delivery driver assignment tools (system assumes self-managed pickup/transport).
*   **Direct In-App Messaging:** Real-time chat channels between users (system relies on automated alerts/notifications).

### 2.3 Current and Future Scope
*   **Current Scope:** Desktop-first, highly responsive web portal running on a local Node.js server with MongoDB cloud storage.
*   **Future Scope:** Automated push notifications, IoT-based temperature telemetry logging during transit, and native mobile application builds (iOS and Android).

---

## 3. Stakeholder Analysis & Requirements Gathering

### 3.1 Stakeholder Identification
*   **Donors (Commercial Food Entities):** Supermarkets, bakeries, restaurants, and catering services. Their primary concern is simple surplus logging without interrupting core business operations.
*   **Recipients (Charity Kitchens/Shelters):** Local soup kitchens, community pantries, and shelters. Their primary concern is sourcing safe, high-quality ingredients proximate to their location.
*   **Administrators (System Auditors):** Administrative users checking item safety, verifying coordinates, resolving dispute tickets, and resetting suspended accounts.
*   **IT Support & Development Team:** Maintainers of the codebase, server environments, and database migrations.

### 3.2 Requirement Gathering Approach
Requirements were identified using a structural simulation of food recovery loops. By analyzing typical operational failures—such as donors listing expired goods, kitchens failing to pick up claimed orders, and disputing product safety—we established the core functional constraints. Feedback led to the addition of Light Mode contrast adjustments, popover notifications, global search, and keyboard shortcut focus features.

### 3.3 System Assumptions
1.  Users possess a web browser with active internet connectivity and access to geographical coordinates mapping.
2.  Administrative auditors are sufficiently trained to review disputes, check external image/video reference links, and make unbiased judgments.
3.  Donors declare item freshness and temperature requirements accurately.

---

## 4. Functional Requirements & Role-Based Access Control (RBAC)

### 4.1 Functional Requirements by Module

#### User Management & Registration Module
*   **FR-USR-01:** System shall support registration of three roles: `donor`, `soup_kitchen`, and `admin`.
*   **FR-USR-02:** User registration shall require name, email, password, role, and coordinate mapping (latitude and longitude).
*   **FR-USR-03:** Password strings must be hashed via bcrypt before saving to the database.
*   **FR-USR-04:** Leaflet maps must render on registration to permit interactive pin drops on facility locations.

#### Surplus Listing Module
*   **FR-LST-01:** Donors shall upload food surplus declarations specifying item name, quantity, unit (kg, loaves, liters, etc.), category, storage temperature, expiry date, and pickup deadline.
*   **FR-LST-02:** System shall prevent listing uploads if the donor's reputation score is below 40 (Deactivated state).
*   **FR-LST-03:** Listings must validate that the `pickupDeadline` occurs chronologically *before* the `expiryDate`.
*   **FR-LST-04:** Listings must initially be saved with a `pending` status.
*   **FR-LST-05:** System shall run a background process every 30 seconds to transition active listings to `expired` if current time exceeds `pickupDeadline`.

#### Claim & Handoff Module
*   **FR-CLM-01:** Soup Kitchens shall view nearby approved surplus items, sorted nearest-first.
*   **FR-CLM-02:** Kitchens shall claim a specific quantity from available approved listings.
*   **FR-CLM-03:** Claiming generates a `Reservation` record with a unique 6-digit code.
*   **FR-CLM-04:** The 6-digit code must be presented to the Donor during handoff. Entering this code on the Donor workspace updates the status to `fulfilled`.

#### Audit & Dispute Module
*   **FR-AUD-01:** Administrators shall view a pending listings queue, with operations to `approve` or `reject` declarations.
*   **FR-AUD-02:** Kitchens shall submit a Quality Dispute (with description and link proof) for food items found spoiled upon pickup.
*   **FR-AUD-03:** Administrators shall resolve disputes: upholding them deducts 15 points from the donor's reputation score; dismissing them resolves the ticket without penalties.
*   **FR-AUD-04:** Admin can manually reactivate suspended donors, resetting their reputation score to 60.

### 4.2 Role-Based Access Control (RBAC) Matrix

| Feature / Action | Guest | Donor | Soup Kitchen | System Admin |
| :--- | :--- | :--- | :--- | :--- |
| **User Registration / Login** | Allowed | Allowed | Allowed | Allowed |
| **Create Surplus listings** | Denied | Allowed (if active) | Denied | Denied |
| **View Proximity Surplus Feed** | Denied | Denied | Allowed (if active) | Denied |
| **Claim / Reserve Listing** | Denied | Denied | Allowed (if active) | Denied |
| **Verify Handoff (Enter Code)** | Denied | Allowed | Denied | Denied |
| **Audit Review & Approval** | Denied | Denied | Denied | Allowed |
| **File Quality Dispute** | Denied | Denied | Allowed | Denied |
| **Uphold / Dismiss Dispute** | Denied | Denied | Denied | Allowed |
| **Reactivate Suspended Account** | Denied | Denied | Denied | Allowed |

---

## 5. Detailed User Workflows & Use Cases

### 5.1 Use Case 1: Uploading and Approving Surplus Food
```
[Donor Workspace]                      [Admin Queue]                    [Kitchen Feed]
   |                                       |                                  |
   |-- 1. Submit Surplus Listing --------->|                                  |
   |   (Status: Pending)                   |                                  |
   |                                       |-- 2. Audit & Approve Listing --->|
   |                                       |   (Status: Approved)             |
   |                                       |                                  |-- 3. Visible in Feed
```

### 5.2 Use Case 2: Claiming and Verification Loop
```
[Soup Kitchen]                         [System Backend]                     [Donor]
   |                                       |                                   |
   |-- 1. Claim Approved Surplus --------->|                                   |
   |                                       |-- 2. Generate 6-Digit Code ------>| (Visible on Donor panel)
   |                                       |    (Status: Reserved)             |
   |                                       |                                   |
   |-- 3. Present Code at Handoff -------------------------------------------->|
   |                                       |                                   |-- 4. Submit Code
   |                                       |<-- 5. Validate & Fulfill ---------|
   |                                       |    (Status: Fulfilled, Rep +5)    |
```

### 5.3 Use Case 3: Quality Dispute and Account Suspension
```
[Soup Kitchen]                         [Admin Workspace]                    [Donor]
   |                                       |                                   |
   |-- 1. File Quality Dispute ----------->|                                   |
   |    (Uploads reference proof link)     |                                   |
   |                                       |-- 2. Audit & Uphold Dispute ------>|
   |                                       |   (Deduct 15 Reputation Points)   |
   |                                       |                                   |-- 3. Rep Score < 40
   |                                       |                                   |    (Account Suspended)
```

---

## 6. Non-Functional Requirements

### 6.1 Performance Requirements
*   **Latency Bounds:** Frontend list updates must process within 200ms. Database writes (creating listings, reservation claims) must complete within 300ms.
*   **Geospatial Search Efficiency:** Proximity calculation algorithms sorting listings by coordinates distance must resolve in less than 100ms.
*   **Lightweight Compilation:** The client package built via Vite must maintain a bundle size below 500 KB to support quick initial page load times.

### 6.2 Security Requirements
*   **Token-Based Sessions:** All restricted API endpoints must require verification of a JSON Web Token (JWT) in the request header.
*   **Data Sanitation:** Input strings must be validated and sanitized on both client and server to prevent Cross-Site Scripting (XSS) and NoSQL injection attacks.
*   **CORS Compliance:** Cross-Origin Resource Sharing (CORS) limits access to verified frontend hosts using the `FRONTEND_URL` environment variable.

### 6.3 Scalability & Reliability
*   **Database Indexing:** Users and Ingredients collections must declare index configurations (`email: 1` and `locationGeo: "2dsphere"`) to support high query volumes.
*   **Background Cron Stability:** The background auto-expire sweeping scheduler must handle errors gracefully without interrupting the main server event loop.
*   **Error Boundaries:** The React layout must utilize a root-level Error Boundary to isolate rendering errors and prevent white-screen crashes.

### 6.4 Usability & Accessibility
*   **Double-Theme Contrast:** Every dashboard interface must support immediate Dark and Light mode styling, adhering to WCAG 2.1 AA readability contrast guidelines.
*   **Micro-interactions:** Interactive components must utilize consistent transition timings (e.g. 150ms hover shifts, 97% scale active clicks) to simulate professional human design quality.
*   **Keyboard Accessibility:** Critical search inputs must be focusable using keyboard shortcuts (e.g., `Ctrl /`).

---

## 7. System Architecture & Technology Stack

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT VIEWPORT                                   |
|   +--------------------------+  +--------------------------+  +---------------+   |
|   |     Donor Workspace      |  |    Kitchen Workspace     |  |  Admin Panel  |   |
|   +--------------------------+  +--------------------------+  +---------------+   |
|                                         |                                         |
|                       React 18 Component Architecture                             |
+----------------------------------------|------------------------------------------+
                                         | HTTP REST (JWT Authed)
                                         v
+-----------------------------------------------------------------------------------+
|                                EXPRESS API ENGINE                                 |
|   +--------------------+  +--------------------------+  +---------------------+   |
|   |  Auth Middleware   |  |   Geospatial Services    |  |  Auto-Expire Sweep  |   |
|   +--------------------+  +--------------------------+  +---------------------+   |
+----------------------------------------|------------------------------------------+
                                         | Mongoose ODM Layer
                                         v
+-----------------------------------------------------------------------------------+
|                                 DATABASE PERSISTENCE                              |
|   +---------------------------------------------------------------------------+   |
|   |                       MongoDB Cloud Atlas Document Store                   |   |
|   |                       (2dsphere Proximity Index Enabled)                  |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

### Tech Stack Justification:
*   **React 18 & Vite 8:** Decoupled single-page application lifecycle with fast reloading and highly optimized assets pipeline.
*   **Node.js & Express 4:** Event-driven backend supporting scalable asynchronous routing and robust JSON schema payloads.
*   **MongoDB & Mongoose 8:** Document-based storage offering native geospatial index matching and seamless nested model relations.

---

## 8. Database Requirements & Data Model

The database contains five primary models: `User`, `Ingredient`, `Request`, `Reservation`, and `QualityReport`.

### 8.1 Schema Specifications

#### 1. User Model
```javascript
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['donor', 'soup_kitchen', 'admin'] },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  locationGeo: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  reputationScore: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}
```
*Note: `locationGeo` is decorated with a `2dsphere` index to support location distance queries.*

#### 2. Ingredient Model
```javascript
{
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.1 },
  unit: { type: String, required: true },
  category: { type: String, required: true, enum: ['Vegetables', 'Fruits', 'Grains', 'Bakery', 'Dairy', 'Protein', 'Other'] },
  storageType: { type: String, required: true, enum: ['Ambient', 'Refrigerated', 'Frozen'] },
  expiryDate: { type: Date, required: true },
  pickupDeadline: { type: Date, required: true },
  status: { type: String, required: true, enum: ['pending', 'approved', 'rejected', 'reserved', 'fulfilled', 'expired'] },
  donorRef: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}
```

#### 3. Request Model
```javascript
{
  ingredientRef: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  kitchenRef: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, required: true, enum: ['pending', 'approved', 'rejected', 'expired', 'fulfilled'] },
  requestedQuantity: { type: Number, required: true, min: 0.1 },
  pickupMode: { type: String, required: true, enum: ['DONOR_DELIVERY', 'KITCHEN_PICKUP'] },
  createdAt: { type: Date, default: Date.now }
}
```

#### 4. Reservation Model
```javascript
{
  requestRef: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
  ingredientRef: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  kitchenRef: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reservedQuantity: { type: Number, required: true },
  verificationCode: { type: String, required: true, unique: true },
  deliveryStatus: { type: String, required: true, enum: ['reserved', 'picked_up', 'delivered', 'expired'] },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
}
```

#### 5. QualityReport Model
```javascript
{
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reservationRef: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true },
  ingredientRef: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  reason: { type: String, required: true },
  proofDescription: { type: String, required: true }, // Verification URL or photo link
  status: { type: String, required: true, enum: ['pending', 'upheld', 'dismissed'] },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
}
```

---

## 9. API Requirements & Interface Specifications

All routes (excluding login/registration) are protected by a JWT authorization header: `Authorization: Bearer <token>`.

### 9.1 Authentication API

*   **POST `/api/auth/register`**
    *   *Payload:* `{ name, email, password, role, location: { lat, lng } }`
    *   *Response:* `201 Created` with JWT token and user profile object.
*   **POST `/api/auth/login`**
    *   *Payload:* `{ email, password }`
    *   *Response:* `200 OK` with JWT token and user profile object.

### 9.2 Donor API (Listing Operations)

*   **POST `/api/donor/ingredients`**
    *   *Payload:* `{ name, quantity, unit, category, storageType, expiryDate, pickupDeadline }`
    *   *Response:* `201 Created` with listing document. Returns `403 Forbidden` if user is suspended.
*   **DELETE `/api/donor/ingredients/:id`**
    *   *Response:* `200 OK`. Deletes the listing. Returns `400 Bad Request` if the listing has already been claimed.
*   **POST `/api/donor/verify-handoff`**
    *   *Payload:* `{ verificationCode }`
    *   *Response:* `200 OK` indicating successful code verification. Increases reputation by +5 points.

### 9.3 Kitchen API (Claim Operations)

*   **GET `/api/kitchen/ingredients?page=1&limit=6`**
    *   *Query Parameters:* Proximity mapping determined by user coordinate location.
    *   *Response:* `200 OK` with a paginated array of approved listings sorted nearest-first.
*   **POST `/api/kitchen/claim`**
    *   *Payload:* `{ ingredientId, quantity, pickupMode }`
    *   *Response:* `201 Created` returning the reservation record along with the 6-digit verification code.

### 9.4 Administrative API

*   **GET `/api/admin/pending`**
    *   *Response:* `200 OK` with array of ingredients having `pending` status.
*   **PUT `/api/admin/approve/:id`**
    *   *Response:* `200 OK`. Updates status to `approved`.
*   **PUT `/api/admin/resolve-dispute`**
    *   *Payload:* `{ disputeId, resolution: 'upheld' | 'dismissed' }`
    *   *Response:* `200 OK`. If upheld, deducts 15 points from donor's reputation score.
*   **PUT `/api/admin/reactivate/:id`**
    *   *Response:* `200 OK`. Resets the suspended account status and resets reputation score to 60.

---

## 10. Frontend & UI/UX Requirements

### 10.1 Theme Variables
Styling is maintained via custom CSS variables inside `index.css`:

```css
:root {
  --bg: #F5F6F8;
  --surface: #FFFFFF;
  --border: #E2E8F0;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --active: #4F46E5; /* Indigo */
  --active-glow: rgba(79, 70, 229, 0.15);
}

.light-mode {
  --bg: #F5F6F8;
  --surface: #FFFFFF;
  --border: #E2E8F0;
  --text-primary: #0F172A;
  --text-secondary: #475569;
}

.dark-mode {
  --bg: #0B0D17;
  --surface: #161925;
  --border: #222533;
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
}
```

### 10.2 Global Search Component Behavior
*   The global search widget filters all list arrays (e.g. Listings, Claims, Pending Reviews, Reputation Leaderboards) dynamically as the user types.
*   It supports a quick focus shortcut: pressing `Ctrl + /` moves cursor focus into the search field immediately.
*   If the filtered array result length equals 0, the system displays a search empty-state layout with a magnifying glass icon (🔍) and a clear query button.

### 10.3 Popup Menus
*   **Notification Popover:** Clicking the bell icon toggles a dropdown showing a list of recent events (successful claims, approvals, deactivations). Includes a "Mark all as read" button that sets the unread alerts badge count to zero.
*   **Profile Dropdown Menu:** Clicking the avatar initials container displays the account email, role badge, settings link, and a logout button.
*   **Click-Outside Directive:** Wrappers use React mouse hooks and `useRefs` to detect mouse clicks outside open dropdown areas, closing them immediately to maintain clean usability.

---

## 11. Security, Validation, & Error Handling

### 11.1 Input Validations

| Schema Field | Target Rules | Error Action / Code |
| :--- | :--- | :--- |
| **Email Address** | Must pass standard email regex format and unique DB query. | `400 Bad Request` |
| **Password** | Min 6 characters, must contain at least one number. | `400 Bad Request` |
| **Ingredient Quantity** | Numerical value greater than 0. | `400 Bad Request` |
| **Geospatial coordinates** | Mapped as `Point`, latitude [-90, 90], longitude [-180, 180]. | `500 Server Error` |
| **Pickup Deadline** | Chronologically prior to the expiryDate. | `400 Bad Request` |

### 11.2 Error Boundary & API Errors
*   API endpoints must respond with standardized JSON objects: `{ message: "Error description text" }`.
*   A global API interceptor handles expired tokens, redirecting users to the login route while dispatching a Toast alert: `"Session expired. Please log in again."`.

---

## 12. Testing, Deployment, & Environment Requirements

### 12.1 Environment Requirements
*   **Development Node.js:** v18.0.0 or higher.
*   **Database Engine:** MongoDB v6.0 or higher (supporting geospatial indexes).
*   **Frontend Server:** Dev server running on port `5174` (or fallback).
*   **Backend Server:** API listening on port `5000` (or fallback).

### 12.2 Integration Test Suites
1.  **verify_deactivation.js:** Tests if reputation drops below 40 successfully deactivates listing creations, and verifies administrative reactivation resets donor score to 60.
2.  **verify_robustness.js:** Validates negative quantity rejections, past deadline uploads, role boundary cross-permissions, and sweeper operations on expired items.
3.  **verify_geo_hook.js:** Assesses the model lifecycle trigger updating MongoDB `2dsphere` points automatically whenever coordinates edit.
4.  **verify_pagination.js:** Confirms that network reputation ledgers and kitchen listings feeds support paginated offset pages.
5.  **verify_cors.js:** Evaluates CORS origin constraints, confirming origin rejection on mismatch.

---

## 13. Assumptions, Constraints, Dependencies, & Risks

### 13.1 Dependencies
*   **leaflet & react-leaflet:** Interactive coordinates mapping.
*   **bcryptjs & jsonwebtoken:** Hashing passwords and managing API authentication tokens.
*   **cors & dotenv:** Restricting origin access and injecting server environment parameters safely.

### 13.2 Project Constraints
*   **Geospatial Dependency:** Relies on coordinate accuracy. Incorrect GPS location entry during registration yields incorrect proximity calculations in feed matches.
*   **Spoilage Limits:** Time-sensitive. Items marked as expired are immediately removed from active views, making timely pickup verification essential.

### 13.3 Potential Risks
*   *Verification Code Brute-Forcing:* Malicious users attempting to guess the 6-digit confirmation code to falsely claim reputation points.
*   *Dispute Collusion:* Malicious competitors submitting false quality reports to force administrative suspensions.

---

## 14. Potential Gaps & Missing Requirements (Critical Analysis)

Critical analysis of the system architecture and current functional requirements reveals the following areas requiring engineering revisions:

### 14.1 Real-Time Coordinates Drift (Multi-Branch Support)
*   **The Gap:** Currently, coordinate mapping only occurs during user registration. If a donor facility moves or has multiple branch locations, the system cannot match proximity accurately. This leads to transit waste.
*   **Why it matters:** If a donor has multiple branch locations, matching available surplus to a single registration coordinate yields matching errors and transport delays.
*   **Recommended Improvement:** Refactor the User schema to support an array of active branch locations, each with unique coordinates, allowing donors to select the listing location at upload time.

### 14.2 Quality Audit Collusion (Dispute Mediation)
*   **The Gap:** Currently, any kitchen can file a quality dispute, immediately trigger an administrative audit, and deduct 15 points. This creates a risk of competitor collusion or malicious reports that unfairly suspend active donors.
*   **Why it matters:** It is easy for malicious actors to submit false disputes to systematically suspend rival businesses from the portal.
*   **Recommended Improvement:** Introduce a dispute mediation state. Upholding a dispute should require verification from at least two separate kitchens, or a manual inspection upload from an administrator before reputation penalties apply.

### 14.3 Absence of Administrative Audit Logs
*   **The Gap:** The system has no persistent history of administrative actions. If an admin dismisses a valid food quality report or maliciously reactivates a suspended donor, there is no ledger trail to audit their actions.
*   **Why it matters:** Lack of auditing poses compliance and safety risks in production environments.
*   **Recommended Improvement:** Create an AdminAuditLog schema tracking the admin user ID, targeted action type (uphold, dismiss, reactivate), target document ID, and custom resolution notes.

### 14.4 Geospatial PII (Coordinates Privacy)
*   **The Gap:** Donors and kitchens share precise coordinate points. While useful for mapping, exposing exact address locations publicly poses security risks, particularly for domestic abuse shelters acting as soup kitchens.
*   **Why it matters:** Openly exposing exact shelter locations is a major safety and data privacy concern.
*   **Recommended Improvement:** Implement a coordinate fuzzing mechanism. Expose only fuzzed coordinates (within a 500m radius) on public feeds. Reveal the exact handoff coordinates only after a reservation has been approved.

### 14.5 Verification Code Rate-Limiting
*   **The Gap:** The verification code is a simple 6-digit string. If a malicious donor wants to falsely claim a listing was fulfilled to gain reputation points, they could query the verification endpoint in a rapid brute-force loop.
*   **Why it matters:** Brute-force attacks could exploit the system's reputation algorithm, leading to unearned ratings.
*   **Recommended Improvement:** Implement rate-limiting on the handoff verification API. Suspend requests from any IP address or user account that fails code verification more than three consecutive times within a 15-minute window.

---

## 15. Requirements Review Checklist

This matrix summarizes the coverage status of all specified requirements areas in the current implementation:

| Requirement Area | Status | Implementation Notes / Actions Needed |
| :--- | :--- | :--- |
| **Role-Based Access Control (RBAC)** | Covered | Checked via Express roles middleware and validated in integration tests. |
| **Geospatial Proximity Queries** | Covered | Implemented via MongoDB 2dsphere indexes and tested successfully in verify_geo_hook.js. |
| **Interactive UI & Themes** | Covered | Fully support Light and Dark mode styling with cohesive theme variables in index.css. |
| **Global Search & Reset** | Covered | Added SearchContext hook filtering active lists dynamically with clear buttons. |
| **Notifications & Popovers** | Covered | Added interactive dropdown popovers in header console with click-outside listener. |
| **Audit Logging of Admin Actions** | Missing | Admin actions are executed directly on documents. Needs dedicated AuditLog model. |
| **Rate Limiting & Anti-Brute-Force** | Missing | Needs rate limiter middleware added to the handoff verification API route. |
| **Geospatial Data Privacy (PII)** | Needs Clarification | Decide if exact coordinates should be fuzzed for sensitive recipient facilities. |
| **Automatic Expiry Sweeper** | Covered | Background sweeper runs every 30s to clean expired inventory records. |
