# Acocie Stores — Complete Rebuild Specification (Node.js → Java 21)

> **Purpose of this document:** This is a full, self-contained specification of the existing
> Acocie Stores e-commerce REST API (Node.js/Express/Sequelize/PostgreSQL). It captures the
> domain, every database table, every endpoint, every validation rule, and every piece of
> business logic, so that the application can be rebuilt in **Java 21** without reading the
> original codebase. Sections 1–10 are stack-neutral facts about behavior and data;
> Java/Spring suggestions appear only in clearly marked **Java mapping** notes.

---

## 1. What the Application Is

**Acocie Stores** is a **multi-vendor e-commerce marketplace API** (think: a small
Jumia/Amazon-marketplace clone, Kenya-focused — default country "Kenya", 16% VAT, flat
KES-style shipping). It is a headless JSON REST API consumed by a separate React frontend
(`FRONTEND_URL`, Vite dev server on port 5173).

Core capabilities:

- **Customer accounts** with email + OTP verification, JWT auth (access + refresh tokens),
  password reset via emailed OTP, login history, and multiple shipping addresses.
- **Product catalog** owned by multiple vendors: hierarchical categories, products with
  variants (size/color options), multi-image galleries stored on **AWS S3** (images are
  resized to max 1200px and converted to WebP before upload), tags, SEO metadata,
  view/sold counters, and a separate inventory ledger (total/available/reserved stock).
- **Shopping cart** that works for both **guest users** (session-ID based, 7-day expiry)
  and logged-in users, with guest→user cart merging at login.
- **Checkout** with stock validation, stock reservation, address selection, 16% tax,
  flat $10.00 shipping, and order placement in a DB transaction. **There is no payment
  gateway** — payment methods are recorded (`cash_on_delivery`, `card`, `mobile_money`,
  `bank_transfer`) and an **admin manually confirms payment**.
- **Order lifecycle** shared between three actors: admin confirms payment, the vendor
  accepts/ships/delivers, and the customer can track, cancel (before processing), return
  (within 14 days of delivery), and exchange notes on the order.
- **Admin back office**: user management (status/role), vendor application approval,
  category management, full order oversight, cancellations/returns/refunds processing,
  and dashboards for both admins and vendors.
- **Transactional email** (nodemailer/SMTP): OTPs, welcome, order confirmation, and
  order-status notifications. Email failures on order flows are logged but never block
  the request (fire-and-forget).

### 1.1 User Types (Roles)

Role enum on `users.role`: `customer`, `vendor_pending`, `vendor`, `admin`, `super_admin`.
There is also an implicit **guest** (unauthenticated) actor.

| Role | How obtained | What they can do |
|---|---|---|
| **Guest** | No account | Browse/search products & categories, view product details, build a session cart (`X-Session-Id` header). Cannot check out. |
| **Customer** | Self sign-up (always created as `customer`) + email OTP verification | Everything a guest can, plus: profile & addresses, login history, cart tied to account, cart merge, checkout & place orders, order history/tracking/stats, request cancellation/return, add order notes, request to become a vendor, delete own account. |
| **Vendor (pending)** `vendor_pending` | Customer calls "request vendor status" | Same as customer (the customer role-guard explicitly includes `vendor_pending`, so they can still shop) while awaiting admin approval. Cannot access vendor endpoints. |
| **Vendor** | Admin approves the request (or admin sets role directly) | Create/update/delete **their own** products (with images & variants), view orders containing their items, accept → ship → deliver those orders, manage tracking info, add order notes, vendor dashboard (revenue, pending revenue, orders by status). Vendors **cannot** use customer checkout/order endpoints (role guard is customer-only). |
| **Admin** | Seeded, CLI script, or role change by an admin | All vendor product powers (can create products for any vendor via `vendorId` field), category CRUD, user management (list/detail/status/role/delete), vendor request approval/rejection, all-orders view, confirm payment, force status changes, process cancellations/returns/refunds, admin dashboards. Cannot touch `super_admin` accounts or grant `super_admin`. |
| **Super Admin** | Seeded or CLI script only | Everything admin can, plus modify/delete `super_admin` accounts and assign the `super_admin` role. |

Account status enum on `users.status`: `active`, `suspended`, `banned` (admin update
endpoint also accepts `inactive` in its Joi schema but the service only allows
`active|suspended|banned` — see §10). Non-`active` users are rejected at the auth
middleware with 403 on every authenticated request.

### 1.2 User Journeys

**Customer journey (happy path):**
1. `POST /auth/register` → account created (`customer`, unverified), 6-digit OTP emailed (10-min expiry).
2. `POST /auth/verify-otp` → `isVerified = true`, welcome email sent. Login is blocked until verified (403 with `needsVerification: true`).
3. `POST /auth/login` → access token (JWT, default 15m) + refresh token (JWT, default 7d, persisted in DB). Login attempts (success/failure, IP, user agent) recorded in `login_history`.
4. Optionally `POST /cart/merge` to absorb a pre-login guest cart.
5. Browse `GET /products`, `GET /products/search?q=`, `GET /categories?nested=true`.
6. `POST /cart/items` (validates stock; snapshots price as `priceAtAddition`), adjust quantities, `GET /cart/validate` to surface price/stock/status changes.
7. Add an address `POST /users/addresses`; first `isDefault` address wins.
8. `POST /checkout/initiate` → validates every cart line (product active + stock), then moves quantity from `availableStock` → `reservedStock`.
9. `GET /checkout/summary` → line items, addresses, subtotal, 16% tax, $10 shipping, total.
10. `POST /checkout/place-order` → in one DB transaction: creates `orders` + `order_items` (name/SKU/price snapshots + per-item `vendorId`), releases reservation and decrements `totalStock`, increments product `soldCount`, clears the cart. Sends confirmation email. Order starts `pending` / payment `pending`.
11. Track: `GET /orders`, `GET /orders/:id`, `GET /orders/:id/tracking`, `GET /orders/stats`.
12. Optional: `POST /orders/:id/cancel` (only while `pending`/`confirmed`, reason required, one pending request at a time) or `POST /orders/:id/return` (only `delivered`, within 14 days). Both create an `order_cancellations` request that an admin resolves.

**Vendor journey:**
1. Start as a verified customer → `POST /users/request-vendor` (role becomes `vendor_pending`).
2. Admin reviews `GET /admin/vendor-requests` and approves (`role = vendor`) or rejects (`role = customer`).
3. Vendor creates products: `POST /products` (multipart form: JSON-ish fields + up to 10 `images` + 5 `variantImages` files; images optimized and pushed to S3; inventory row auto-created; unique slug auto-generated from name).
4. Orders containing the vendor's items appear in `GET /vendor/orders`. The vendor drives fulfilment on the **whole order**: `PUT .../accept` (`confirmed → processing`), `PUT .../ship` (`processing → shipped`; carrier + tracking number required; creates `order_tracking`), `PUT .../deliver` (`shipped → delivered`). Each transition is written to `order_status_history` and emails the customer.
5. `GET /vendor/dashboard/stats` → total orders, delivered revenue, pending revenue, orders by status, recent orders.

**Admin journey:**
1. Manage users: `GET /admin/users` (filter role/status, search name/email, paginate), suspend/ban, change roles, delete (never own account; `super_admin` targets require super admin).
2. Approve/reject vendor applications.
3. Manage catalog: category CRUD (delete blocked if products or subcategories exist); can create/edit any product.
4. Oversee orders: `GET /admin-orders/orders` (rich filters), `PUT .../confirm` = verify payment (`pending → confirmed`, `paymentStatus → paid`), `PUT .../status` = force any status (restores inventory when cancelling), process cancellation and return requests (approve/reject with notes; approving a cancellation restores stock and cancels the order; refund amount recorded), `POST .../refund` on paid orders (order + payment status → `refunded`).
5. Dashboards: `GET /admin/dashboard/stats` (user metrics) and `GET /admin-orders/dashboard/orders` (order/revenue metrics, pending cancellations/returns).

**Order state machine** (enforced by the services):

```
pending ──(admin confirms payment)──▶ confirmed ──(vendor accepts)──▶ processing
   │                                      │                              │
   │◀────── customer may request ────────▶│                              │(vendor ships,
   │        cancellation here                                            │ tracking created)
   ▼                                                                     ▼
cancelled ◀──(admin approves cancellation / sets status)              shipped
                                                                         │(vendor delivers)
refunded ◀──(admin refund, paid orders only)                             ▼
                                              return window: 14 days  delivered
```

`paymentStatus`: `pending → paid` (admin confirm) `→ refunded` (admin refund); `failed` exists in the enum.

---

## 2. Current Tech Stack → Java 21 Mapping

| Concern | Current (Node.js) | Suggested Java 21 equivalent |
|---|---|---|
| Runtime / framework | Node 22, Express 5 | Spring Boot 3.x (Java 21, virtual threads optional) |
| ORM | Sequelize 6 (PostgreSQL, `pg`) | Spring Data JPA / Hibernate |
| Migrations | sequelize-cli (20 migration files, timestamped) | Flyway or Liquibase |
| Validation | Joi schemas per endpoint (`stripUnknown: true`, `abortEarly: false`) | Jakarta Bean Validation on request DTOs + `@Valid` |
| Auth | `jsonwebtoken` (HS256 access + refresh), `bcrypt` (10 rounds) | Spring Security + jjwt/nimbus-jose; `BCryptPasswordEncoder(10)` |
| File upload | multer (memory storage, 10MB/file, ≤15 files) | Spring `MultipartFile` (`spring.servlet.multipart.max-file-size=10MB`) |
| Image processing | sharp (resize ≤1200px, WebP q82, GIF passthrough) | Thumbnailator / imgscalr + a WebP encoder (e.g. `com.sksamuel.scrimage` webp module), or keep JPEG if WebP is painful |
| Object storage | AWS SDK v3 S3 client + lib-storage | AWS SDK for Java v2 `S3Client` / `S3TransferManager` |
| Email | nodemailer (SMTP, HTML templates inline) | Spring `JavaMailSender` + Thymeleaf/plain HTML templates |
| API docs | Hand-written OpenAPI YAML per component + Scalar UI at `/api-docs` | springdoc-openapi (generate from code) or port the YAML |
| Logging | morgan (custom colored console) | Logback/SLF4J with a request-logging filter |
| Security headers | helmet | Spring Security headers config |
| CORS | `cors` middleware, origin = `FRONTEND_URL`, credentials true | `CorsConfigurationSource` |
| IDs | UUID v4 everywhere (DB default or app-generated) | `java.util.UUID`, `@UuidGenerator` / `gen_random_uuid()` |
| Money | Postgres `DECIMAL(10,2)`, JS floats in math (⚠) | `BigDecimal` end-to-end (fixes a class of float bugs) |
| Config | `.env` + dotenv | `application.yml` + env vars / Spring profiles |
| Container | Multi-stage `node:22-alpine`, non-root user, entrypoint waits for DB then migrates then starts | Multi-stage Maven/Gradle → `eclipse-temurin:21-jre-alpine`; Flyway runs on boot (no shell wait loop needed — use readiness checks) |

**Suggested Java package layout** (mirrors the current component structure):

```
com.acocie.stores
├── auth/          (controller, service, dto, entity: User, OtpCode, RefreshToken, Address, LoginHistory)
├── category/
├── product/       (Product, ProductImage, ProductVariant)
├── cart/          (Cart, CartItem)
├── checkout/      (Inventory lives here in the original; consider inventory/ package)
├── order/         (Order, OrderItem, OrderStatusHistory, OrderTracking, OrderCancellation, OrderNote
│                   + customer/vendor/admin controllers & services)
├── common/        (error handling, pagination, S3/image helpers, email)
└── config/        (security, CORS, S3, mail, OpenAPI)
```

---

## 3. Architecture & Conventions

- **Layering:** `routes → validation middleware (Joi) → controller (thin: extract params, call service, shape HTTP) → service (all business logic, throws `Error` with `statusCode`) → Sequelize models`. Controllers catch service errors and return `{ "error": message }` with the error's status code (500 fallback).
- **Component-per-feature** folder structure: each of `auth, category, product, cart, checkout, orders` has its own `routes/ controllers/ services/ models/ schemas/ docs/`. Models are registered centrally in `src/models/index.js`, which wires all associations.
- **Base path:** all business routes under `/api/v1/...`. Extra routes: `GET /health` (checks DB connection; 200 healthy / 500 unhealthy), `GET /` (API index listing endpoints), `GET /api-docs` (Scalar UI).
- **404 handler:** unknown route → `404 { "error": "Route not found", "path": ... }`.
- **Global error handler:** `err.status || 500`, `{ "error": message }`, stack included only when `NODE_ENV=development`.
- **Response envelope conventions** (no single standard wrapper — replicate per endpoint):
  - Errors: `{ "error": "message" }` (+ occasional extras: `errors[]` for validation, `availableStock`, `details[]`, `currentStatus`, `requiredRoles`/`yourRole`).
  - Validation failure (Joi): `400 { "error": "Validation failed", "errors": [{ "field", "message" }] }`. Unknown body/query fields are **stripped**, not rejected; type coercion is on.
  - Lists: `{ <resourceName>: [...], "pagination": { "total", "page", "limit", "pages" } }`.
  - Mutations: usually `{ "message": "...", <resource>: {...} }`.
- **Naming:** JSON is camelCase; DB columns are snake_case; every table has `created_at` / `updated_at` timestamps unless noted. JSON serialization of a user always strips `passwordHash`.
- **Timestamps behavior:** `sequelize.define` global config: `underscored: true`, `createdAt: 'created_at'`, `updatedAt: 'updated_at'`. Exceptions: `otp_codes` (no updated_at), `refresh_tokens` (no updated_at), `login_history` (no timestamps; has own `login_at`), `order_status_history` (no updated_at).
- **DB pool:** max 10, min 0, acquire 30s, idle 10s. SSL required in production (RDS), disabled locally.

---

## 4. Database Schema (PostgreSQL)

All primary keys are `UUID` (v4, default-generated). All FKs are UUID. Types below use
Postgres names. “+ts” = has `created_at`/`updated_at`.

### 4.1 users (+ts)
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| first_name | varchar(50) | NOT NULL, len 2–50 |
| last_name | varchar(50) | NOT NULL, len 2–50 |
| email | varchar(100) | NOT NULL, UNIQUE, email format |
| phone | varchar(20) | NULL, UNIQUE |
| password_hash | varchar(255) | NOT NULL (bcrypt, 10 rounds) |
| role | enum(customer, vendor_pending, vendor, admin, super_admin) | NOT NULL, default customer |
| status | enum(active, suspended, banned) | NOT NULL, default active |
| is_verified | boolean | default false |
| profile_completed | boolean | default false (never updated by current code) |
| last_login_at | timestamp | NULL |

Indexes: email, role, status. Relations: hasMany refresh_tokens, otp_codes, addresses,
login_history (all `ON DELETE CASCADE`).

### 4.2 otp_codes (created_at only)
id PK; user_id uuid NULL; email varchar(100) NOT NULL; otp_code varchar(6) NOT NULL;
purpose enum(signup, password_reset, email_verification) NOT NULL; is_used boolean default false;
expires_at timestamp NOT NULL.

### 4.3 refresh_tokens (created_at only)
id PK; user_id uuid NOT NULL FK→users; token text NOT NULL UNIQUE (the JWT string itself);
expires_at timestamp NOT NULL. Indexes: token, user_id, expires_at.

### 4.4 addresses (+ts)
id PK; user_id FK→users NOT NULL; label varchar(50) NULL ("Home"/"Office");
full_name varchar(100) NOT NULL; phone varchar(20) NOT NULL; address_line1 varchar(255) NOT NULL;
address_line2 varchar(255) NULL; city varchar(100) NOT NULL; state varchar(100) NOT NULL;
postal_code varchar(20) NOT NULL; country varchar(100) NOT NULL default 'Kenya';
is_default boolean default false. Indexes: user_id, is_default.
Rule: setting an address as default unsets `is_default` on all the user's other addresses.

### 4.5 login_history (no ts; login_at default NOW)
id PK; user_id FK→users (⚠ model says NOT NULL but the service inserts `userId: null` for
failed logins with unknown email — make it nullable in the rebuild); ip_address varchar(45);
user_agent text; status enum(success, failed) default success; login_at timestamp NOT NULL.
Indexes: user_id, login_at.

### 4.6 categories (+ts) — self-referencing tree
id PK; name varchar(100) NOT NULL; slug varchar(120) NOT NULL UNIQUE (lowercase, generated
from name with `-1`, `-2`… suffix on collision); description text; parent_id uuid NULL
FK→categories (one level of nesting used in practice); image_url varchar(500);
is_active boolean default true; display_order int default 0; meta_title varchar(200);
meta_description text. Indexes: slug, parent_id, is_active, display_order.

### 4.7 products (+ts)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vendor_id | uuid NOT NULL FK→users | owner (vendor or admin) |
| category_id | uuid NOT NULL FK→categories | |
| name | varchar(255) NOT NULL | len 3–255 |
| slug | varchar(300) NOT NULL UNIQUE | generated, lowercase, collision suffix |
| description | text | |
| short_description | varchar(500) | |
| sku | varchar(100) NOT NULL UNIQUE | |
| price | decimal(10,2) NOT NULL, ≥0 | |
| compare_price | decimal(10,2) | original price for discount display |
| cost_price | decimal(10,2) | vendor cost |
| status | enum(draft, active, inactive, out_of_stock) | default draft (service defaults to 'active' on create) |
| is_featured | boolean default false | |
| stock_quantity | int default 0, ≥0 | denormalized copy; source of truth is `inventory` |
| low_stock_threshold | int default 5 | |
| weight | decimal(10,2) | kg |
| dimensions | jsonb | {length,width,height} cm |
| tags | text[] default {} | lowercase tags used in search |
| meta_title | varchar(200) | |
| meta_description | text | |
| view_count | int default 0 | ++ on every product-detail fetch |
| sold_count | int default 0 | += quantity at order placement |

Indexes: vendor_id, category_id, slug, sku, status, is_featured, price, created_at.
Relations: belongsTo vendor(User), category; hasMany images, variants; hasOne inventory
(children CASCADE on delete).

### 4.8 product_images (+ts)
id PK; product_id FK→products NOT NULL; image_url varchar(500) NOT NULL (public S3 URL);
s3_key varchar(700) NULL (object key, used for deletion); alt_text varchar(255) (set to
product name); is_primary boolean default false (first uploaded image); display_order int
default 0 (append order). Indexes: product_id, is_primary.

### 4.9 product_variants (+ts)
id PK; product_id FK→products NOT NULL; sku varchar(100) NOT NULL UNIQUE;
name varchar(255) NOT NULL (e.g. "Large - Red"); options jsonb NOT NULL (e.g.
`{"size":"L","color":"Red"}`); price decimal(10,2) NULL (overrides product price when set);
compare_price decimal(10,2); stock_quantity int default 0 ≥0 (variants track their own
stock — NOT the inventory table); image_url varchar(500); is_active boolean default true.
Indexes: product_id, sku, is_active.

### 4.10 inventory (+ts) — one row per product
id PK; product_id FK→products NOT NULL UNIQUE; total_stock int default 0 ≥0;
available_stock int default 0 ≥0; reserved_stock int default 0 ("stock in pending orders");
low_stock_alert boolean default false (recomputed on writes: totalStock ≤ lowStockThreshold);
last_restocked_at timestamp NULL. Indexes: product_id, low_stock_alert.

### 4.11 carts (+ts)
id PK; user_id uuid NULL UNIQUE FK→users (null for guests); session_id varchar(100) NULL
UNIQUE (guest carts; server-generated UUID returned to client); expires_at timestamp NULL
(guest carts: now + 7 days; nothing currently purges them). Model-level check: must have
user_id OR session_id. Indexes: user_id, session_id, expires_at.

### 4.12 cart_items (+ts)
id PK; cart_id FK→carts NOT NULL; product_id FK→products NOT NULL; variant_id uuid NULL
FK→product_variants; quantity int NOT NULL ≥1 default 1; price_at_addition decimal(10,2)
NOT NULL (price snapshot). UNIQUE(cart_id, product_id, variant_id). Indexes: cart_id,
product_id, variant_id.

### 4.13 orders (+ts)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_number | varchar(50) NOT NULL UNIQUE | `ORD-YYYYMM-#####` — count of this month's orders + 1, zero-padded to 5 (⚠ race-prone, see §10) |
| user_id | uuid NOT NULL FK→users | the customer |
| status | enum(pending, confirmed, processing, shipped, delivered, cancelled, refunded) | default pending |
| payment_status | enum(pending, paid, failed, refunded) | default pending |
| shipping_address_id | uuid NOT NULL FK→addresses | |
| billing_address_id | uuid NULL FK→addresses | defaults to shipping address id at placement |
| subtotal | decimal(10,2) NOT NULL default 0 | Σ item unitPrice×qty |
| tax_amount | decimal(10,2) NOT NULL default 0 | subtotal × 0.16 |
| shipping_cost | decimal(10,2) NOT NULL default 0 | flat 10.00 |
| discount_amount | decimal(10,2) NOT NULL default 0 | always 0 today |
| total_amount | decimal(10,2) NOT NULL | subtotal + tax + shipping − discount |
| payment_method | varchar(50) | cash_on_delivery / card / mobile_money / bank_transfer |
| payment_reference | varchar(255) | gateway/transaction ref, set by admin confirm |
| notes | text | customer instructions at checkout |
| confirmed_at / shipped_at / delivered_at / cancelled_at | timestamp NULL | lifecycle stamps |

Indexes: order_number, user_id, status, payment_status, created_at.
Relations: belongsTo user, shippingAddress, billingAddress; hasMany items (`order_items`),
hasOne tracking, hasMany orderNotes.

### 4.14 order_items (+ts) — immutable purchase snapshots
id PK; order_id FK→orders NOT NULL; product_id FK→products NOT NULL; variant_id uuid NULL
FK→product_variants; **vendor_id uuid NOT NULL FK→users** (copied from product at
purchase — this is what powers the multi-vendor order views); product_name varchar(255)
NOT NULL (snapshot); variant_name varchar(255) NULL (snapshot); sku varchar(100) NOT NULL
(snapshot; variant SKU if variant chosen); quantity int NOT NULL ≥1; unit_price
decimal(10,2) NOT NULL (snapshot; variant price if set, else product price); subtotal
decimal(10,2) NOT NULL (= quantity × unit_price). Indexes: order_id, product_id, vendor_id.

### 4.15 order_status_history (created_at only) — audit trail
id PK; order_id FK→orders NOT NULL; old_status enum(order statuses) NULL (null = initial);
new_status enum NOT NULL; changed_by_user_id uuid NULL FK→users (null = system);
change_reason text; notes text. Indexes: order_id, created_at.
Written on every transition: vendor accept ("Vendor accepted order"), ship ("Shipped via
{carrier}, tracking: {n}"), deliver, admin status updates, payment confirmation
("Payment verified by admin"), cancellation approval, refund.

### 4.16 order_tracking (+ts) — one row per order, created at ship time
id PK; order_id FK→orders NOT NULL UNIQUE; carrier varchar(100) NOT NULL;
tracking_number varchar(100) NOT NULL UNIQUE; tracking_url varchar(500);
estimated_delivery timestamp; current_location varchar(255); tracking_status
enum(in_transit, out_for_delivery, delivered, failed_attempt, returned) — set to
`in_transit` at ship, `delivered` at delivery (⚠ vendor update schema also accepts
`pending`/`failed` which aren't in the DB enum — align in the rebuild);
last_updated timestamp NOT NULL default NOW.

### 4.17 order_cancellations (+ts) — cancellation, return AND refund requests
id PK; order_id FK→orders NOT NULL; type enum(cancellation, return, refund) NOT NULL;
status enum(pending, approved, rejected, completed) NOT NULL default pending;
reason text NOT NULL; requested_by_user_id FK→users NOT NULL; processed_by_user_id
FK→users NULL; refund_amount decimal(10,2); refund_method varchar(50)
(original_payment / store_credit / bank_transfer); admin_notes text;
requested_at timestamp NOT NULL default NOW; processed_at timestamp NULL.
Indexes: order_id, type, status, requested_at.

### 4.18 order_notes (+ts) — threaded communication on an order
id PK; order_id FK→orders NOT NULL; user_id FK→users NOT NULL (author);
note_type enum(customer_note, vendor_note, admin_note, system_note) NOT NULL;
content text NOT NULL; is_visible_to_customer boolean NOT NULL default true
(admin notes default false; customer sees only visible notes or their own).
Indexes: order_id, note_type, created_at.

---

## 5. Complete API Reference

Base URL: `/api/v1`. Auth = `Authorization: Bearer <accessToken>`. Roles in brackets.
“Joi” column lists the validation rules enforced before the controller runs.

**Common validation atoms:**
- `email`: valid email, lowercased, trimmed.
- `password` (strength-checked): 8–128 chars, must contain lowercase + uppercase + digit.
- `otpCode`: exactly 6 digits.
- `phone`: optional, pattern `^\+?[1-9]\d{6,14}$` (E.164-ish).
- pagination: `page` int ≥1 default 1; `limit` int 1–100 default 20.

### 5.1 Auth — `/auth` (public unless noted)

| Method & path | Body (Joi) | Behavior / response |
|---|---|---|
| POST `/register` | firstName 2–50 req, lastName 2–50 req, email req, password (strength) req, phone opt | 409 if email exists. Creates `customer` (unverified), bcrypt-hashes password, creates signup OTP (10 min), emails it. 201-style JSON: `{message, email, userId, userRole}`. If the OTP email fails, the whole request fails (user already created — see §10). |
| POST `/verify-otp` | email, otpCode | Finds newest unused unexpired OTP (purpose=signup) in a transaction; marks used; sets user `isVerified=true`; sends welcome email. 400 invalid/expired; 404 no user. |
| POST `/login` | email req, password req (no strength check) | 401 wrong email/password (failed attempt logged w/ IP + user agent; unknown email logs with null user); 403 `{error, needsVerification:true}`-style if unverified. Success: issues access JWT (`{userId, email, role}`, expiry `JWT_ACCESS_EXPIRY` def 15m) + refresh JWT (`{userId, email}`, `JWT_REFRESH_EXPIRY` def 7d) stored in `refresh_tokens`; updates `lastLoginAt`; logs success. Returns `{message, accessToken, refreshToken, user:{id, firstName, lastName, email, role, isVerified}}`. ⚠ status (banned/suspended) is NOT checked at login — only by the auth middleware afterwards. |
| POST `/refresh-token` | refreshToken req | Verifies JWT signature AND DB row (must exist, unexpired), user must exist and be `active`. Returns new **access token only** (no rotation): `{message, accessToken}`. 401 otherwise. |
| POST `/logout` 🔒 | refreshToken opt | Deletes that refresh-token row if provided. Always `{message: 'Logged out successfully'}`. |
| POST `/forgot-password` | email | Always returns `{message: 'If email exists, an OTP has been sent'}` (anti-enumeration). If user exists: creates password_reset OTP + emails it. |
| POST `/verify-reset-otp` | email, otpCode | Validates newest unused unexpired password_reset OTP, marks used. `{message, email}`. |
| POST `/reset-password` | email, newPassword (strength), confirmPassword must equal | Sets new hash, deletes ALL user's refresh tokens. ⚠ Does not verify the OTP step happened — critical flaw, see §10. |
| POST `/change-password` 🔒 | currentPassword req, newPassword (strength), confirmPassword | 401 wrong current password. Updates hash, revokes all refresh tokens. |

### 5.2 Users — `/users` (all 🔒 any authenticated role)

| Method & path | Body/Query | Behavior |
|---|---|---|
| GET `/profile` | — | User (sans hash) incl. `addresses[]`. |
| PUT `/profile` | ≥1 of firstName 2–50, lastName 2–50, phone | 409 if phone belongs to another user. Returns trimmed user object. |
| DELETE `/delete` | body: `password` (not Joi-validated) | Verifies password (401 wrong), hard-deletes user (cascades tokens/OTPs/addresses/history). |
| GET `/addresses` | — | All addresses, default first then newest. |
| POST `/addresses` | label opt ≤50; fullName 2–100 req; phone req; addressLine1 3–255 req; addressLine2 opt; city 2–100 req; state 2–100 req; postalCode 2–20 req; country opt default "Kenya"; isDefault opt | If isDefault, unsets other defaults first. `{message, address}`. |
| PUT `/addresses/:id` | ≥1 of the above (all optional) | 404 if not owned. Same default-flip rule. |
| DELETE `/addresses/:id` | — | 404 if not owned. |
| GET `/login-history` | — | Last 10 entries, newest first. |
| POST `/request-vendor` | — | Guards: must be verified (403), not already pending (409), not already vendor (409), must currently be `customer` (403). Sets role `vendor_pending`. |

### 5.3 Admin users — `/admin` (all 🔒 admin, super_admin)

| Method & path | Body/Query | Behavior |
|---|---|---|
| GET `/users` | query: page, limit, role∈{customer,vendor_pending,vendor,admin,super_admin}, status∈{active,inactive,suspended,banned}, search ≤100 (ILIKE on first/last/email) | Paginated users (sans hash), newest first. |
| GET `/users/:id` | — | User + last 10 login-history rows. 404. |
| PUT `/users/:id/status` | status ∈ {active,inactive,suspended} (Joi) — service allows {active,suspended,banned} (⚠ mismatch: effective set is {active, suspended}) | 403 if target is super_admin and caller isn't. `{message, user:{id,email,status}}`. |
| PUT `/users/:id/role` | role ∈ {customer,vendor,admin} (Joi; service also handles super_admin but Joi blocks it) | 403 super_admin protections. `{message, user:{id,email,role}}`. |
| DELETE `/users/:id` | — | 400 own account; 403 super_admin target unless super admin. Hard delete. |
| GET `/dashboard/stats` | — | `{totalUsers, newUsersThisMonth, usersByRole[], usersByStatus[], verification:{verified,unverified}}`. |
| GET `/vendor-requests` | page, limit | Users with role `vendor_pending`, oldest first, paginated. |
| PUT `/vendor-requests/:id/approve` | — | 400 if not pending. Role → `vendor`. |
| PUT `/vendor-requests/:id/reject` | — | 400 if not pending. Role → `customer`. |

### 5.4 Categories — `/categories`

| Method & path | Auth | Body/Query | Behavior |
|---|---|---|---|
| GET `/` | public | query: includeInactive 'true'/'false', nested 'true'/'false' | Default only active. `nested=true` → root categories with active `children[]`. Else flat list with `parent`. Ordered displayOrder ASC, name ASC. `includeInactive` honored only for admins (note: route is public, so req.user is never set — effectively always active-only). |
| GET `/:id` | public | query: includeProducts 'true'/'false' | Category + parent + active children (+ up to 20 active products if requested). 404. |
| POST `/` | 🔒 admin | name 2–100 req; description ≤1000; parentId uuid (must exist, 404); imageUrl uri; isActive bool; displayOrder int ≥0; metaTitle ≤160; metaDescription ≤320 | Slug auto-generated with collision suffix. Returns category. |
| PUT `/:id` | 🔒 admin | ≥1 of the above | Name change regenerates slug (⚠ without collision check). parentId ≠ own id (400), must exist (404). |
| DELETE `/:id` | 🔒 admin | — | 400 if category has products; 400 if it has subcategories. |

### 5.5 Products — `/products`

| Method & path | Auth | Input | Behavior |
|---|---|---|---|
| GET `/` | public | query: page, limit, category (uuid), minPrice, maxPrice, status, featured='true', vendor (uuid), sortBy (default created_at), order (default DESC) | Non-admins always see only `active` (status filter admin-only — but route has no auth middleware, so req.user is undefined and the public always gets active). Includes category (id,name,slug), primary image, vendor (id,firstName,lastName,email). Paginated. |
| GET `/search` | public | q req, page, limit | Active products where name ILIKE %q% OR description ILIKE %q% OR tags contains lowercase(q). Ordered viewCount DESC, newest. `{query, products, pagination}`. |
| GET `/featured` | public | limit (default 10) | Active + isFeatured, ordered soldCount DESC then viewCount DESC. |
| GET `/:id` | public | — | Full detail: category, all images (displayOrder ASC), active variants, inventory, vendor. Increments viewCount. 404 (non-active products 404 for public). |
| POST `/` | 🔒 vendor, admin, super_admin | **multipart/form-data**: text fields categoryId req, name req, sku req, price req, vendorId (admins only — vendors are forced to themselves), description, shortDescription, comparePrice, costPrice, stockQuantity, lowStockThreshold, weight, dimensions (JSON string), tags (JSON string array), variants (JSON string array of {sku req, name req, options obj, price, comparePrice, stockQuantity, imageUrl, isActive}), metaTitle, metaDescription, status, isFeatured ('true'); files: `images[]` ≤10, `variantImages[]` ≤5 (jpeg/png/webp/gif, ≤10MB each, ≤15 total) | Category must exist (404); SKU unique (409); slug generated + de-duped. Creates product (status defaults 'active' here), inventory row (total=available=stockQuantity, reserved 0), image rows (first = primary, S3 upload: resize ≤1200px → WebP q82, key `products/YYYY/MM/<uuid>.webp`), variant rows (variantImages matched to variants by index). 201 `{message, product}` with everything included. |
| PUT `/:id` | 🔒 vendor (own only, 403), admin | same shape; all optional | Name change regenerates slug (no dedupe ⚠). stockQuantity resets inventory total AND available (reserved untouched). New images are appended (primary only if none existed). Variants are NOT updated by this endpoint. ⚠ omitting isFeatured/tags/variants resets isFeatured→false and tags→[] due to controller defaults — see §10. |
| DELETE `/:id` | 🔒 vendor (own only), admin | — | Transaction deletes images/variants/inventory/product rows, then best-effort deletes S3 objects. `{message}`. |

### 5.6 Cart — `/cart` (guest OR user; guests use `X-Session-Id` header)

Auth is **optional** (except merge): a valid Bearer token binds the cart to the user;
otherwise the `X-Session-Id` header identifies a guest cart. On first `POST /items`
without a session id the server generates one and returns it as `sessionId` — the client
must persist and resend it.

| Method & path | Body | Behavior |
|---|---|---|
| GET `/` | — | 400 if no user and no session id. Creates cart lazily. Returns `{cart: {id, items[], subtotal, itemCount}}`; each item enriched with product (primary image, inventory, vendor name), variant, `currentPrice`, `availableStock`, `priceChanged`, `issues[]` (unavailable / insufficient stock / price change). Subtotal uses **current** prices. |
| POST `/items` | productId uuid req; variantId uuid opt; quantity 1–100 default 1; (sessionId in body allowed by schema but the header is what's read) | Product must be active (404). Variant must exist, belong to product, be active (404). Stock check: variant.stockQuantity or inventory.availableStock; 400 `{error, availableStock}` if short. Same product+variant already in cart → quantities are summed (re-checked against stock) and priceAtAddition refreshed. 201 `{message, cartItem, sessionId?}`. |
| PUT `/items/:id` | quantity 1–100 req | 404 if not in caller's cart. Stock re-checked. |
| DELETE `/items/:id` | — | 404 if not in caller's cart. |
| DELETE `/clear` | — | Removes all items (cart row kept). |
| GET `/validate` | — | `{isValid, issues[], invalidItems[{itemId, productName, issues[]}]}` — checks product active + price drift (⚠ not stock, unlike getCart). |
| POST `/merge` 🔒 | sessionId req (⚠ controller reads `guestSessionId` — broken today, see §10) | Intended: move guest-cart items into the user cart (existing lines: quantities summed; others: re-parented), delete guest cart. `{message}`. |

### 5.7 Checkout — `/checkout` (🔒 customer, vendor_pending only)

| Method & path | Body/Query | Behavior |
|---|---|---|
| POST `/initiate` | — | 400 empty cart. Validates every line (product active, stock sufficient) → on failure 400 `{error:'Cart validation failed', details:[...]}`. On success moves each quantity availableStock→reservedStock (⚠ not transactional, no expiry). `{cartId, itemCount}`. |
| GET `/summary` | shippingAddressId uuid opt | 400 empty cart. Returns `{items[{productId, variantId, productName, variantName, quantity, unitPrice}], addresses[], selectedShippingAddress (param or default/first), subtotal, taxAmount (16%), shippingCost (10.00), totalAmount}`. |
| POST `/place-order` | shippingAddressId uuid req; billingAddressId uuid opt (defaults to shipping); paymentMethod ∈ {cash_on_delivery, card, mobile_money, bank_transfer} default cash_on_delivery; notes ≤1000 | Address must belong to user (404). In ONE transaction: create order (`pending`/`pending`, generated order number, totals as in summary) + order_items (snapshots + vendorId), inventory: reservedStock −= qty, totalStock −= qty, lowStockAlert recomputed (⚠ availableStock not touched here — assumes `/initiate` ran; see §10), product.soldCount += qty, clear cart items. After commit: fire-and-forget confirmation email. Returns full order with items (+vendor names) and both addresses. |

### 5.8 Customer orders — `/orders` (🔒 customer, vendor_pending)

| Method & path | Body/Query | Behavior |
|---|---|---|
| GET `/` | page, limit, status (7 statuses), startDate/endDate ISO (endDate ≥ startDate) | Own orders + items (with product id/name/slug), newest first, paginated. |
| GET `/stats` | — | `{totalOrders, totalSpent (paid only), ordersByStatus[], recentOrders[5]}`. |
| GET `/number/:orderNumber` | — | Own order by number (items+product, shipping address, tracking). 404. |
| GET `/:id` | — | Own order: items (product + vendor), both addresses, tracking, order notes visible to customer or authored by them (with author name/role). 404. |
| GET `/:id/tracking` | — | 404 if no order or no tracking yet ("Tracking information not available yet"). |
| POST `/:id/cancel` | reason 5–500 req | Only status pending/confirmed (400 with `currentStatus`); one pending cancellation per order (400). Creates order_cancellations(type=cancellation, pending). Emails admin-ish notification (fire-and-forget). Returns the request. |
| POST `/:id/return` | reason 5–500 req | Only `delivered`; ≤14 days since deliveredAt (400 "Return window has expired"); one pending return (400). Creates type=return pending. |
| POST `/:id/notes` | content 1–1000 req | Creates customer_note (visible to customer). Returns note with author. |

### 5.9 Vendor orders — `/vendor` (🔒 vendor, admin, super_admin)

All queries are scoped to orders that contain ≥1 item with the caller's `vendorId`.

| Method & path | Body/Query | Behavior |
|---|---|---|
| GET `/orders` | page, limit, status (6, no refunded), startDate, endDate | Orders with the vendor's items only (items filtered to theirs) + customer name/email. Paginated. |
| GET `/dashboard/stats` | — | `{totalOrders (distinct), totalRevenue (Σ own item subtotals on delivered orders), pendingRevenue (pending/confirmed/processing/shipped), ordersByStatus[], recentOrders[5]}`. |
| GET `/orders/:id` | — | Order detail: own items, customer (incl. phone), shipping address, tracking. 404 "Order not found or no items from your store". |
| PUT `/orders/:id/accept` | — | Requires status `confirmed` (400 + currentStatus). → `processing`; history row; emails customer. |
| PUT `/orders/:id/ship` | carrier 2–100 req; trackingNumber 2–100 req; trackingUrl uri opt; estimatedDelivery ISO opt | Requires `processing`. Transaction: status→`shipped` + shippedAt, create order_tracking (status in_transit), history row. Emails customer with tracking number. |
| PUT `/orders/:id/deliver` | — | Requires `shipped`. → `delivered` + deliveredAt; tracking status → delivered; history row; email. |
| PUT `/orders/:id/tracking` | ≥1 of currentLocation ≤255, trackingStatus ∈ {pending,in_transit,out_for_delivery,delivered,failed}, estimatedDelivery | Updates tracking row (404 if none), bumps lastUpdated. |
| POST `/orders/:id/notes` | content 1–1000 req; isVisibleToCustomer bool default true | Creates vendor_note. |

⚠ Note: vendor actions transition the **whole order**, even if it contains other vendors'
items — the multi-vendor split exists only at the item level. Keep or fix in the rebuild (§10).

### 5.10 Admin orders — `/admin-orders` (🔒 admin, super_admin)

| Method & path | Body/Query | Behavior |
|---|---|---|
| GET `/orders` | page, limit, status, paymentStatus ∈ {pending,paid,failed,refunded}, userId uuid, vendorId uuid (filters items), startDate, endDate, minAmount, maxAmount, search ≤100 (order number / customer email / name) | All orders + items + customer. Paginated. |
| GET `/dashboard/orders` | — | `{totalOrders, totalRevenue (paid), ordersToday, revenueToday, ordersByStatus[], ordersByPaymentStatus[], pendingActions:{cancellations, returns}}`. |
| GET `/orders/:id` | — | Everything: items (product + vendor), customer, both addresses, all notes with authors. ⚠ currently crashes — association alias bug, see §10. |
| PUT `/orders/:id/status` | status (any of the 7) req; reason ≤500 opt | Transaction. If `cancelled`: for each item, inventory reservedStock −= qty, availableStock += qty (⚠ wrong after placement — see §10). Stamps confirmed/shipped/delivered/cancelled timestamps (⚠ mostly not persisted, see §10). History row + status email. |
| PUT `/orders/:id/confirm` | paymentReference ≤255 opt | Requires `pending`. → status confirmed, paymentStatus paid, paymentReference, confirmedAt. History ("Payment verified by admin") + email. |
| GET `/orders/:id/history` | — | order_status_history rows (with changer name/role), oldest first. |
| POST `/orders/:id/notes` | content 1–1000 req; isVisibleToCustomer default false | admin_note. |
| GET `/orders/cancellations` | (status defaults 'pending') | Pending cancellation requests + order + customer + requester. ⚠ route shadowed by `/orders/:id` — see §10. |
| PUT `/orders/cancellations/:id` | action ∈ {approve,reject} req; adminNotes ≤1000 | Approve (transaction): restore inventory (reserved −, available +), order → cancelled + cancelledAt, history row, request → approved with refundAmount = totalAmount if paid else 0, refundMethod original_payment; email (⚠ crashes — user not loaded, §10). Reject: request → rejected. |
| GET `/orders/returns` | — | Pending return requests (same shape as cancellations). ⚠ same shadowing bug. |
| PUT `/orders/returns/:id` | action req; adminNotes; refundAmount positive 2dp opt | Approve: request → approved, refundAmount (param or order total), method original_payment. Reject: → rejected. (No stock restore, no order status change.) |
| POST `/orders/:id/refund` | refundAmount opt (default order total); refundMethod ∈ {original_payment, bank_transfer, store_credit} default original_payment; notes ≤1000 | Requires paymentStatus `paid` (400). Transaction: order status → refunded, paymentStatus → refunded, creates order_cancellations(type=refund, status=completed) audit row, history row. Email. |

### 5.11 System

| Method & path | Behavior |
|---|---|
| GET `/health` | `{status:'healthy', database:'connected', timestamp}` or 500 unhealthy. Used by ALB/ECS health checks. |
| GET `/` | API index: name, version, endpoint map. |
| GET `/api-docs` | Interactive API reference (Scalar) rendered from hand-written OpenAPI YAML (`src/components/*/docs/*.yml`, merged by `src/docs/openapi.config.js`). |

---

## 6. Cross-Cutting Business Rules (the stuff an endpoint table can't show)

1. **Password hashing:** bcrypt, 10 salt rounds. Strength rule (signup/reset/change):
   ≥8 chars with lower + upper + digit.
2. **OTP:** 6 random digits (`100000–999999`), expiry `OTP_EXPIRY_MINUTES` (default 10),
   single-use (`is_used`), scoped by purpose. Newest matching OTP wins. Multiple OTPs may
   coexist per user.
3. **JWTs:** two secrets. Access token: HS256, payload `{userId, email, role}`, expiry
   `JWT_ACCESS_EXPIRY` (code default 15m). Refresh: payload `{userId, email}`, expiry
   `JWT_REFRESH_EXPIRY` (default 7d), stored server-side; refresh returns a new access
   token only (no rotation). Password reset/change revokes all refresh tokens.
4. **Auth middleware:** verifies token → loads user from DB every request → 401 unknown
   user, 403 if `status !== 'active'` → attaches `{userId, email, role}` to the request.
   Role checks: exact-set guards (`isAdmin` = admin|super_admin; `isVendorOrAdmin` =
   vendor|admin|super_admin; `isCustomer` = customer|vendor_pending) plus an unused
   hierarchy helper (super_admin 4 > admin 3 > vendor 2 > customer 1 > vendor_pending 0).
5. **Slugs:** `lowercase(name)` with non-alphanumerics collapsed to `-`, trimmed; on
   collision append `-1`, `-2`, … (create paths only).
6. **Pricing precedence:** variant price (if the line has a variant AND the variant has a
   price) else product price. Cart keeps `priceAtAddition` snapshots and reports drift;
   orders snapshot name/SKU/price permanently in `order_items`.
7. **Stock model:** products without variants use the `inventory` row
   (total/available/reserved); variants carry their own `stock_quantity` (checked in cart
   but **never decremented at purchase** — gap, §10). Reservation happens at
   `/checkout/initiate`; purchase converts reservation into a total-stock decrement.
   Admin cancellation restores available stock.
8. **Order totals:** subtotal = Σ unitPrice×qty; tax = 16% of subtotal; shipping flat
   10.00; discount 0; total = subtotal + tax + shipping. (Hardcoded — make configurable.)
9. **Order numbers:** `ORD-{YYYY}{MM}-{count-of-month + 1, padded 5}`.
10. **Multi-vendor:** one order can contain items from many vendors; vendor views filter
    by `order_items.vendor_id`; vendor fulfilment actions currently mutate the whole order.
11. **Emails:** auth-flow emails are awaited (failures fail the request); all order-flow
    emails are fire-and-forget (`.catch(console.error)`). Full inventory of templates:
    signup OTP, password-reset OTP, welcome, order confirmation, order confirmed,
    processing, shipped (with tracking), delivered, cancellation-request received,
    cancellation approved, refund processed, generic status update. All are branded HTML
    (blue #2563eb header, footer, CTA button to `FRONTEND_URL`).
12. **Images:** accepted mime types jpeg/jpg/png/webp/gif; ≤10 MB each; ≤15 files/request.
    Non-GIFs: resized to fit 1200×1200 (no enlargement) and re-encoded WebP q82. Keys:
    `{folder}/{YYYY}/{MM}/{uuid}{ext}` under folders `products/` and `products/variants/`.
    Public URL = `AWS_S3_BASE_URL || https://{bucket}.s3.{region}.amazonaws.com` + `/` + key.
    Bucket is public-read (no signed URLs). Product deletion removes S3 objects best-effort.

---

## 7. Configuration (environment variables)

| Variable | Used for | Default in code |
|---|---|---|
| NODE_ENV | 'production' enables DB SSL; 'development' adds stack traces to errors | development |
| PORT | HTTP port | 5002 |
| DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD | Postgres | localhost / 5432 / acocie_stores / postgres / — |
| JWT_SECRET | access-token signing | — (required) |
| JWT_REFRESH_SECRET | refresh-token signing | — (required) |
| JWT_ACCESS_EXPIRY | access TTL (`15m`, `60m`…) | 15m |
| JWT_REFRESH_EXPIRY | refresh TTL | 7d |
| OTP_EXPIRY_MINUTES | OTP TTL | 10 |
| EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASSWORD / EMAIL_FROM | SMTP (TLS `secure:true`, e.g. Gmail app password; whitespace stripped from password) | — |
| FRONTEND_URL | CORS origin + email CTA links | http://localhost:5173 |
| AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION / AWS_S3_BUCKET | S3 uploads | region us-east-1 |
| AWS_S3_BASE_URL | optional CDN/base override for public image URLs | bucket URL |

(`.env.example` also lists an unused `JWT_ACCESS_SECRET` — ignore it.)

**Java mapping:** put these in `application.yml` with env-var placeholders; on AWS inject
DB and JWT/email secrets from Secrets Manager exactly as the current ECS task does.

---

## 8. Infrastructure & Deployment

### 8.1 Local dev
`docker-compose.yml`: `db` (postgres:16-alpine, host port **5436**, healthcheck
pg_isready), `api` (built from Dockerfile, waits for healthy DB), `pgadmin` (port 5050).
The API container entrypoint: wait-for-Postgres loop → `sequelize-cli db:migrate` → start
server. NPM scripts: `dev` (nodemon), `migrate`, `seed`, `create-admin`.

### 8.2 Container image
Multi-stage `node:22-alpine`: prod-deps install → runtime stage, non-root `appuser`,
EXPOSE 5002. **Java mapping:** multi-stage Maven/Gradle build → JRE-21 alpine runtime,
non-root user, same port or 8080; run Flyway on startup instead of the entrypoint script;
give the JVM container ≥512 MB (the Node task ran on Fargate 256 CPU / 512 MB — a JVM
will want 512 CPU / 1024 MB).

### 8.3 AWS (Terraform, `terraform/` — modular, envs/dev composition)
State backend: S3 bucket + DynamoDB lock table (kept alive; the dev stack itself was
**destroyed on 2026-07-07** for cost, so this describes the code, not live infra).

- **vpc module:** VPC, 2 public + 2 private subnets across AZs, IGW, single NAT gateway,
  route tables; security groups: `alb` (80 from world), `ecs` (app port from ALB SG only),
  `rds` (5432 from ECS SG only).
- **ecr module:** repository for the API image + lifecycle policy.
- **rds module:** subnet group (private) + `aws_db_instance` PostgreSQL (dev-sized),
  master credentials via Secrets Manager (`db_secret_arn`).
- **alb module:** internet-facing ALB, target group with `/health` checks, HTTP :80
  listener (no HTTPS in dev).
- **ecs module:** CloudWatch log group `/ecs/{project}-{env}`; Secrets Manager secret
  `{project}/{env}/app-secrets` (JWT + email values, not overwritten on re-apply);
  execution role (pull ECR, logs, read the two secrets) and task role (S3 access policy
  for the images bucket); Fargate cluster, task definition (container port from var,
  `NODE_ENV=production` env + DB/app values injected as `secrets`), service wired to the
  ALB target group.
- **s3 module / root main.tf:** product-images bucket — public-read policy, permissive
  CORS (all origins), versioning, AES-256 SSE.

**Java rebuild notes:** all of this transfers as-is except the task definition (new image,
health check path stays `/health` if you keep the same actuator-style endpoint, bump
CPU/memory) and container port.

### 8.4 Seed data & scripts
Seeders create: super admin `superadmin@acocie.com`, admin `admin@acocie.com`, two vendors
(`vendor1/2@acocie.com`), three customers (`customer1-3@acocie.com`) — all bcrypt-hashed
known passwords; plus categories, addresses, products, carts, and orders for demo/testing.
`npm run create-admin` = interactive CLI to create an admin/super_admin (validates email +
password strength). Reproduce both in the Java version (Flyway seed migrations or a
CommandLineRunner + a CLI/endpoint guarded appropriately). There are also 8 Postman
collections (one per component) worth keeping as behavioral reference.

---

## 9. API Documentation Setup

Each component ships a hand-written OpenAPI 3.0 YAML fragment
(`src/components/<x>/docs/*.yml` — auth, user, admin, product, category, cart, checkout,
orders, vendorOrders, adminOrders). `src/docs/openapi.config.js` merges them into one spec
served by Scalar at `/api-docs` (with a relaxed CSP for that route only). In Java, prefer
springdoc-openapi so the spec can't drift from the code, and validate it against the
Postman collections.

---

## 10. Known Bugs, Gaps & Rebuild Recommendations

Port the behavior above **except** these — fix them in the Java version (they were found
by reading the code; several are live bugs):

**Security (fix, do not port):**
1. **`POST /auth/reset-password` never checks the OTP.** It resets any account's password
   given only the email + a new password. `verify-reset-otp` marks the OTP used but
   nothing links the two calls. Fix: issue a short-lived reset token at OTP verification
   and require it at reset.
2. Login does not check `status` — banned users can obtain fresh tokens (they're blocked
   at middleware, but refresh/login should reject too, and login should say so).
3. No rate limiting / brute-force lockout on login or OTP endpoints; OTPs are 6 digits
   with 10-minute windows. Add attempt limits.
4. S3 bucket is fully public-read with `*` CORS — acceptable for product images, but
   consider CloudFront + OAC in the rebuild.
5. `tls.rejectUnauthorized: false` on SMTP and `rejectUnauthorized: false` on DB SSL —
   tighten in production.

**Live functional bugs:**
6. **Admin order routes are shadowed:** `GET /admin-orders/orders/cancellations` and
   `/returns` are declared *after* `GET /orders/:id`, so Express matches `:id` first and
   the request dies parsing "cancellations" as a UUID. Order the routes correctly (static
   before param) in the rebuild.
7. **`GET /admin-orders/orders/:id` crashes:** it includes order notes under alias
   `notes`, but the Order→OrderNote association is aliased `orderNotes`.
8. **`POST /cart/merge` is broken:** the Joi schema keeps `sessionId` (stripping unknown
   keys) but the controller reads `req.body.guestSessionId` → always "Guest session ID
   required".
9. **Cancellation-approval email crashes the response:** the approve path reads
   `order.user.email` but never includes `user` in the query; the TypeError after commit
   turns a successful approval into a 500.
10. `sendPasswordResetOTP` has `rom:` instead of `from:` (reset emails go out with a
    default/undefined sender).
11. In admin `updateOrderStatus`, lifecycle timestamps are assigned as raw snake_case
    properties (`order.cancelled_at = ...`) and not included in `order.update({status})`,
    so confirmed/shipped/delivered/cancelled stamps are silently lost on that path.
12. Product update: because the controller defaults `isFeatured` to false and
    `tags`/`variants` to `[]`, any product update that omits those fields un-features the
    product and wipes its tags. Use null-means-unchanged semantics in the DTO.
13. Category/product rename regenerates the slug without a uniqueness check → possible
    unique-constraint 500.
14. Joi/service enum mismatches: admin user-status (`inactive` vs `banned`), tracking
    status values (`pending`/`failed` vs DB enum `failed_attempt`/`returned`), admin
    user-role schema blocks `super_admin` that the service supports.

**Data-integrity design flaws (redesign in Java):**
15. **Inventory accounting is inconsistent.** `initiate` reserves (available→reserved,
    non-transactionally, with no expiry — abandoned checkouts leak reserved stock and a
    client can skip `initiate` entirely, driving `reservedStock` negative at placement).
    Admin cancellation adds back to `available` but the placement already removed from
    `total`, so counters drift. Redesign: single transactional decrement at placement
    (`SELECT ... FOR UPDATE` / optimistic locking) or reservations with TTL; make
    cancellation an exact inverse. This is the DDIA-flavored heart of the rebuild.
16. **Variant stock is checked but never decremented** at order placement, and product
    deletion isn't blocked by existing order references (FK will error at DB level).
17. **Order-number generation races** (count-based). Use a DB sequence per month or a
    retry-on-unique-violation loop.
18. Vendor fulfilment mutates the whole (possibly multi-vendor) order; decide: per-vendor
    sub-orders/shipments, or restrict carts to one vendor.
19. Signup is not transactional: if the OTP email fails, the user row exists but the
    client sees an error (and re-registering returns 409). Make signup idempotent /
    resendable (`resend-otp` endpoint is missing entirely).
20. Hard-deleting users breaks FK references from orders/products. Prefer soft-delete
    (status) or anonymization.
21. Money math is done in JS floats before storage. In Java use `BigDecimal` everywhere.
22. Guest carts are never purged despite `expires_at`. Add a scheduled cleanup job.
23. Expired refresh tokens and used OTPs accumulate. Add cleanup jobs.

**Missing entirely (candidates for the Java roadmap):**
24. **Zero automated tests.** Stand the Java project up with unit tests for the service
    rules in §6 and integration tests (Testcontainers Postgres) for the flows in §1.2.
25. No payment gateway (M-Pesa/Stripe), no discounts/coupons (column exists), no
    wishlist/reviews (emails mention wishlists), no product-image delete/reorder or
    variant-update endpoints, no admin inventory/restock endpoint (`last_restocked_at` is
    never set), no pagination on admin cancellation/return lists, no structured logging
    or metrics.

---

*Generated 2026-07-10 by reading the full source at commit c7d0f80 (branch master).*
