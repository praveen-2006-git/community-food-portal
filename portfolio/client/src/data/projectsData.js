export const projectsData = [
  {
    id: "food-routing-portal",
    title: "Community Surplus Food Ingredient Routing Portal",
    shortDescription: "Hyper-local food redistribution system with multi-document atomic transactions and HMAC-SHA256 handover verification.",
    category: "Full Stack / Distributed Logistics",
    stack: ["React.js", "Node.js", "Express.js", "MongoDB", "Mongoose", "OSRM Maps", "Cron", "Crypto"],
    github: "https://github.com/praveen-2006-git/community-food-portal",
    liveDemo: null,
    demoCredentials: null,
    metrics: [
      { label: "Atomicity Isolation", value: "ACID Guaranteed", icon: "ShieldCheck" },
      { label: "Handover Security", value: "HMAC-SHA256", icon: "Lock" },
      { label: "Inventory Strategy", value: "FEFO Batching", icon: "Clock" },
    ],
    problem:
      "Commercial kitchens discard high volumes of edible surplus ingredients due to unpredictable catering demands, while local soup kitchens experience extreme inventory volatility. Manual coordination causes race conditions, double-claiming, expired handovers, and chaotic pickup routing.",
    solution:
      "Engineered an automated MERN routing engine featuring Mongoose multi-document transaction sessions to prevent double-claiming, constant-time HMAC-SHA256 token verification for physical handovers, and OSRM turn-by-turn navigation for pickup routing.",
    architecture: {
      diagram: `[Donor Kitchen Listing] ──► [MongoDB: FoodListing (AVAILABLE)]
                                       │
[Recipient Claim Request] ──────► [Mongoose Transaction Session]
                                       ├── 1. Validate Stock >= Qty
                                       ├── 2. Atomic Decrement Stock
                                       ├── 3. Create Claim (RESERVED)
                                       └── 4. Commit / Abort on Conflict
                                       │
[Physical Handover] ────────────► [HMAC-SHA256 Verification]
                                  (crypto.timingSafeEqual + 3-Attempt Lockout)`,
      keyDecisions: [
        {
          decision: "Multi-Document ACID Transactions vs Simple Increments ($inc)",
          rationale: "Simple increments cannot coordinate multi-collection status changes and audit logs atomically.",
          tradeoff: "Requires MongoDB replica-set support and slight transaction overhead for guaranteed 0 partial writes.",
        },
        {
          decision: "Constant-Time HMAC-SHA256 vs Plain OTP Codes",
          rationale: "Plain string comparison short-circuits on the first mismatched byte, exposing timing side-channels.",
          tradeoff: "Requires equal-length hex buffer allocation before crypto.timingSafeEqual comparison.",
        },
      ],
    },
    technicalHighlights: [
      "Atomic claim execution using session.startTransaction() ensuring strict ACID guarantees during concurrent claims.",
      "Cryptographic handover protocol verified using crypto.timingSafeEqual with server-side 3-attempt lockout TTL.",
      "FEFO (First-Expired, First-Out) inventory batching algorithm prioritizing nearest expiration timestamps.",
      "Automated background cron workers monitoring uncollected reservations and auto-releasing expired locks.",
      "OSRM routing engine integration calculating optimized pickup navigation trajectories between donors and kitchens.",
      "Granular Role-Based Access Control (RBAC) isolating Donors, Kitchens, and System Administrators.",
    ],
    whatNext:
      "Planning integration of multi-stop vehicle routing algorithms (VRP) to aggregate multiple surplus pickups in a single transit run.",
    codeSnippet: `// Atomic Claim Workflow in Node.js / Mongoose
const session = await mongoose.startSession();
session.startTransaction();
try {
  const listing = await FoodListing.findOne({ _id: listingId, status: 'AVAILABLE' }).session(session);
  if (!listing || listing.availableQuantity < requestedQty) {
    throw new Error('Insufficient surplus stock or listing expired');
  }
  
  listing.availableQuantity -= requestedQty;
  if (listing.availableQuantity === 0) listing.status = 'CLAIMED';
  await listing.save({ session });

  const claim = await Claim.create([{
    listingId,
    kitchenId,
    quantity: requestedQty,
    handoverTokenHash: computeHmacHash(listingId, kitchenId),
    status: 'RESERVED'
  }], { session });

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}`,
  },

  {
    id: "syllabus-management",
    title: "Syllabus Management System",
    shortDescription: "Role-based academic curriculum portal with granular permission controls, secure session management, and document storage pipelines.",
    category: "Full Stack / Academic Systems",
    stack: ["React.js", "Node.js", "Express.js", "MongoDB", "Mongoose", "Multer"],
    github: "https://github.com/praveen-2006-git/syllabus-management-system",
    liveDemo: null,
    demoCredentials: null,
    metrics: [
      { label: "Access Control", value: "3-Tier RBAC", icon: "ShieldCheck" },
      { label: "Authentication", value: "Session + JWT", icon: "Lock" },
      { label: "File Pipeline", value: "MIME Validated", icon: "Database" },
    ],
    problem:
      "Higher education departments frequently struggle with fragmented syllabus distribution, resulting in students studying outdated regulations, faculty uploading unversioned curriculum files, and administrators lacking audit logs across departments.",
    solution:
      "Constructed a centralized MERN curriculum management portal featuring strict 3-tier Role-Based Access Control (Admin, Faculty, Student), server-side session management, and a validated multi-format document upload pipeline.",
    architecture: {
      diagram: `[User Request] ──► [Express Auth & Role Middleware]
                           ├── Admin: Master Curriculum & User Roles
                           ├── Faculty: Enrolled Students & Subject Catalogs
                           └── Student: Department Syllabi & Open Electives
                                 │
                     [MongoDB Document Store] (Indexed by Regulation & Semester)`,
      keyDecisions: [
        {
          decision: "Hierarchical Route Middleware vs Route-Level Role Checks",
          rationale: "Centralized authorization middleware prevents privilege escalation and guarantees uniform audit logging.",
          tradeoff: "Requires standardized user request context injection across all protected routes.",
        },
      ],
    },
    technicalHighlights: [
      "Three-tier Role-Based Access Control granting distinct workflows for Administrators, Faculty, and Students.",
      "Server-side session handling and token validation protecting academic resources against unauthorized access.",
      "Validated multipart document pipeline enforcing strict MIME-type checking and file size boundaries.",
      "Department-level indexing allowing students to instantly filter course regulations and semester curricula.",
      "Audit logging tracking syllabus revision timestamps and faculty upload history.",
    ],
    whatNext:
      "Integrating automated syllabus diffing to highlight curriculum changes across academic regulations.",
    codeSnippet: `// Hierarchical Role Authorization Middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient privileges for this academic resource'
      });
    }
    next();
  };
};

router.post('/upload', 
  authenticateSession, 
  authorizeRoles('ADMIN', 'FACULTY_HEAD'), 
  uploadSyllabusDoc
);`,
  },

  {
    id: "warranty-tracker",
    title: "Warranty Tracker — Full Stack Dashboard",
    shortDescription: "Asset lifecycle and warranty monitor with automated pre-expiry cron email alerts and category-wise aggregation analytics.",
    category: "Full Stack / Utility Dashboard",
    stack: ["React.js", "Node.js", "Express.js", "MongoDB", "Cron", "Mongoose Aggregation"],
    github: "https://github.com/praveen-2006-git/warranty-tracker",
    liveDemo: null,
    demoCredentials: null,
    metrics: [
      { label: "Notification Window", value: "30-Day Pre-Expiry", icon: "Clock" },
      { label: "Analytics Engine", value: "MongoDB $facet", icon: "Database" },
      { label: "Dispatch Safety", value: "Idempotent Logs", icon: "ShieldCheck" },
    ],
    problem:
      "Consumers and organizations frequently lose warranty claims and financial value because purchase receipts are misplaced and warranty expiration dates pass unnoticed without automated advance warning.",
    solution:
      "Developed a full-stack asset tracking dashboard with automated background cron schedulers executing idempotent email reminder queues exactly 30 days prior to policy expiration, paired with MongoDB aggregation pipelines.",
    architecture: {
      diagram: `[Asset & Receipt Upload] ──► [MongoDB Asset Store]
                                         │
[Daily 00:00 Cron Job] ──────────► [Scan Expirations: Date.now() + 30 Days]
                                         │
                                   [Idempotent Email Queue]
                                   (Dispatches alert & logs sent status)
                                         │
[Dashboard Request] ─────────────► [MongoDB $facet Aggregation Engine]`,
      keyDecisions: [
        {
          decision: "MongoDB Aggregation Pipeline vs Client-Side Reduction",
          rationale: "Database-side aggregation computes category summaries and cost metrics with minimal memory usage.",
          tradeoff: "Requires structured schema indexing on date and user fields for query efficiency.",
        },
      ],
    },
    technicalHighlights: [
      "Automated background cron workers scanning expiring assets daily for 30-day advance notification.",
      "Idempotent notification dispatch logs preventing duplicate reminder emails across worker restarts.",
      "MongoDB $facet aggregation pipeline computing category expense breakdowns and active warranty counts.",
      "Responsive card-based and list-based UI with live status tags (Active, Expiring Soon, Expired).",
      "Secure receipt file upload and retrieval system linked to individual asset entries.",
    ],
    whatNext:
      "Adding optical character recognition (OCR) for automated purchase date and serial number extraction from receipts.",
    codeSnippet: `// Expiry Aggregation Pipeline in MongoDB
const getAssetAnalytics = async (userId) => {
  return await Asset.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $facet: {
        byCategory: [
          { $group: { _id: "$category", count: { $sum: 1 }, totalValue: { $sum: "$purchasePrice" } } }
        ],
        expiringSoon: [
          {
            $match: {
              expiryDate: {
                $gte: new Date(),
                $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              }
            }
          },
          { $project: { itemName: 1, expiryDate: 1, manufacturer: 1 } }
        ]
      }
    }
  ]);
};`,
  },
];
