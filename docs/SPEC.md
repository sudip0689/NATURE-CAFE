# CLAUDE.md — Nature Caffe Billing / POS System

## Project Overview

Build a production-ready café billing/POS web application called **Nature Caffe**.

The application is intended for a café counter and must be fast, simple, touch-friendly, and reliable.

### Core workflow

Owner:
1. Login
2. Add/edit/delete food items
3. Set food category and price
4. Enable/disable products
5. View sales and bill history
6. Manage cashier accounts
7. Configure café information and UPI QR

Cashier:
1. Login
2. Search/select food items
3. Add items to cart
4. Change quantities
5. Enter customer name and mobile number
6. Select Cash / UPI / Card
7. Generate bill
8. Print a 58mm thermal receipt
9. Reprint previous bills

### Explicitly NOT required

Do NOT build stock/inventory management in the first version.

No:
- Stock quantity
- Purchase management
- Supplier management
- Inventory deduction
- Inventory alerts

Keep the product system focused on **items, prices, categories, availability, and billing**.

---

## Product Name / Branding

Name: **Nature Caffe**

Suggested tagline:

> Good Food · Good Mood

Visual direction:
- Warm café/brown primary color
- Cream/white backgrounds
- Green for successful actions/payment confirmation
- Clean rounded cards
- Large touch targets
- Minimal animations
- Professional POS appearance
- Mobile/tablet first

The UI should feel appropriate for a real Indian café counter.

---

## Recommended Technology

Use:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui where useful
- Supabase
  - PostgreSQL database
  - Supabase Auth
  - Row Level Security
  - Storage for café/product images if needed
- Vercel for deployment

Use current stable versions compatible with the project.

Prefer server-side data fetching and Server Actions/Route Handlers where appropriate.

Keep client components only where interactivity requires them.

---

# User Roles

## Owner

Owner permissions:

- View dashboard
- Add product
- Edit product
- Delete/deactivate product
- Change prices
- Manage categories
- View all bills
- View sales reports
- Reprint bills
- Manage cashiers
- Configure café details
- Configure UPI details/QR

Owner must be able to access the cashier POS as well.

## Cashier

Cashier permissions:

- Access billing/POS
- Search products
- Select categories
- Add/remove products
- Change quantity
- Enter customer details
- Select payment mode
- Generate bill
- Print bill
- Reprint permitted recent bills

Cashier must NOT be able to:

- Change product prices
- Add/delete products
- Manage cashiers
- Change UPI configuration
- Change system settings
- Access sensitive owner reports unless explicitly permitted later

Use role-based authorization on the server/database, not only UI hiding.

---

# Main Pages

## 1. Login

Route:

`/login`

UI:
- Nature Caffe logo/name
- Username/email
- Password/PIN
- Login button
- Clear error messages

After login:
- Owner → `/owner`
- Cashier → `/pos`

Do not rely on localStorage for authentication in production.

---

# 2. Cashier POS

Route:

`/pos`

This is the most important screen.

### Layout

Desktop/tablet:

Left/main:
- Search bar
- Category tabs
- Product grid

Right:
- Current order/cart
- Customer information
- Payment selection
- Total
- Generate & Print button

Mobile:
- Product grid first
- Cart can become a bottom sheet/drawer
- Keep Generate Bill button sticky

### Product card

Each card should show:
- Product image/icon
- Product name
- Price
- Add button

Example:

```text
Chicken Roll
₹120

[ + ]
```

Tap product → add to cart.

### Cart

Show:

```text
Chicken Roll      2 × ₹120    ₹240
Cold Coffee       1 × ₹80      ₹80
French Fries      1 × ₹90      ₹90
--------------------------------
Subtotal                     ₹410
Discount                       ₹0
TOTAL                        ₹410
```

Quantity controls:
- minus
- quantity
- plus

Allow removing item when quantity reaches zero.

---

# Customer Details

Customer fields:

- Customer Name
- Mobile Number

Customer name can default to:

`Walk-in Customer`

Mobile number can be optional.

Validate Indian mobile number reasonably but don't make the billing process unnecessarily difficult.

---

# Payment Methods

Initial payment methods:

- Cash
- UPI
- Card

Use a clear segmented control/radio group.

The selected payment method must be saved with the bill.

---

# UPI

Owner should be able to configure:

- UPI ID
- Merchant/business name
- UPI QR image

Example:

`naturecaffe@upi`

Do not hardcode the actual UPI ID.

### Printed bill

The 58mm receipt must include a UPI QR code.

For a fixed merchant QR, generate/use a QR containing the configured UPI payment URI.

Example format:

`upi://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>`

If dynamic UPI/payment-gateway integration is added later, the system can generate amount-specific QR codes.

Important:
A static QR does NOT prove that payment was completed.

For the first version:
- Cashier selects UPI
- Customer scans QR
- Cashier confirms payment
- Bill is saved as paid

Do not claim automatic payment verification unless an actual payment gateway/bank integration is implemented.

---

# Owner Dashboard

Route:

`/owner`

Dashboard cards:

- Today's Sales
- Today's Bills
- Cash Sales
- UPI Sales
- Card Sales

Quick actions:

- Add Item
- Products
- Sales
- Bills
- Cashiers
- Settings

Keep reports simple in v1.

---

# Product Management

Route:

`/owner/products`

Owner can:

- Add
- Edit
- Deactivate
- Delete if safe
- Search
- Filter by category

Product fields:

```text
name
category_id
price
image_url (optional)
is_active
created_at
updated_at
```

Do not add stock fields.

### Add/Edit Product

Fields:

- Food Name
- Category
- Price
- Optional image
- Active/Inactive

Example:

```text
Food Name: Chicken Roll
Category: Rolls
Price: ₹120
Active: ON

[ Save Item ]
```

---

# Categories

Initial examples:

- Coffee
- Snacks
- Chinese
- Rolls
- Drinks
- Burger
- Pizza

Owner should be able to add/edit categories later.

---

# Bills

Each completed sale should receive a unique bill number.

Suggested format:

`NC000001`

or a date-based format such as:

`NC-20260922-0001`

Bill number must be generated safely on the server/database.

Never rely only on browser timestamps for unique billing numbers.

---

# Bill Data

A bill should store:

```text
id
bill_number
customer_name
customer_mobile
subtotal
discount
total
payment_method
cashier_id
created_at
```

Bill items should store a snapshot of:

```text
product_name
quantity
unit_price
line_total
```

IMPORTANT:

Do not calculate old bills from the current product table.

If Chicken Roll was ₹120 when the bill was created and later becomes ₹140, the old bill must still show ₹120.

---

# Suggested Database Schema

Use Supabase PostgreSQL.

## profiles

```sql
id uuid primary key references auth.users(id)
full_name text
role text check (role in ('owner', 'cashier'))
is_active boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

## categories

```sql
id uuid primary key
name text not null
is_active boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

## products

```sql
id uuid primary key
name text not null
category_id uuid references categories(id)
price numeric(10,2) not null
image_url text
is_active boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

## bills

```sql
id uuid primary key
bill_number text unique not null
customer_name text
customer_mobile text
subtotal numeric(10,2) not null
discount numeric(10,2) default 0
total numeric(10,2) not null
payment_method text check (payment_method in ('cash', 'upi', 'card'))
cashier_id uuid references profiles(id)
created_at timestamptz default now()
```

## bill_items

```sql
id uuid primary key
bill_id uuid references bills(id) on delete cascade
product_id uuid references products(id)
product_name text not null
quantity integer not null
unit_price numeric(10,2) not null
line_total numeric(10,2) not null
created_at timestamptz default now()
```

## settings

Use a simple key/value or structured settings table.

Store:

```text
cafe_name
tagline
address
phone
upi_id
upi_name
upi_qr_url
receipt_footer
```

Do not put secret payment credentials in a public table.

---

# Security / RLS

Supabase Row Level Security is required.

Rules:

Owner:
- Full product/category/settings access
- Full bill/report access
- Cashier management

Cashier:
- Read active products/categories
- Create bills
- Read appropriate bills for reprint
- No product price modification
- No settings modification

Never trust client-side role checks.

Enforce authorization with Supabase RLS and/or secure server-side operations.

---

# 58mm Thermal Receipt

The receipt must be designed specifically for approximately 58mm paper.

Use a compact layout.

Example:

```text
       NATURE CAFFE
     Good Food · Good Mood
      Amta, Howrah, WB
         9876543210
------------------------------
Bill No : NC000123
Date    : 22-09-2026
Time    : 04:35 PM
Customer: Rahul Das
Mobile  : 9876543210
------------------------------
Item             Qty Rate Amt
Chicken Roll      2  120 240
Cold Coffee       1   80  80
French Fries      1   90  90
------------------------------
Subtotal               410
Discount                 0
TOTAL                 ₹410
------------------------------
Payment: UPI

       [ UPI QR CODE ]

      Scan & Pay
     naturecaffe@upi

        Thank You!
        Visit Again
     Good Food · Good Mood
```

The receipt must:
- Fit 58mm
- Use readable typography
- Avoid unnecessary graphics
- Keep QR large enough to scan
- Use high contrast
- Avoid excessive horizontal content

Provide a print preview before printing where appropriate.

---

# Printing Architecture

Design the printing layer so it can support:

1. Browser print for simple printers
2. Android/Bluetooth thermal printer integration later
3. USB thermal printer integration later

Do not tightly couple the billing UI to a specific printer brand.

Create an abstraction such as:

```ts
printReceipt(bill)
```

Then printer implementations can be added later.

For the first web version:
- Use a print-optimized receipt route/component
- CSS `@media print`
- 58mm width
- Hide application UI while printing

---

# Sales

Route:

`/owner/sales`

Show:
- Date filter
- Total sales
- Number of bills
- Cash total
- UPI total
- Card total

Table:

```text
Bill No | Date/Time | Customer | Payment | Amount | Action
```

Action:
- View
- Reprint

---

# Bill History

Route:

`/owner/bills`

Allow:
- Search bill number
- Search customer mobile
- Date filter
- View bill
- Reprint

---

# Cashier Management

Route:

`/owner/cashiers`

Owner can:
- Add cashier
- Activate/deactivate cashier
- View cashier name
- Reset access through proper authentication flow

Do not store plaintext passwords.

Prefer Supabase Auth.

---

# UX Requirements

The cashier must be able to create a normal bill with minimal taps.

Target flow:

```text
Tap product
→ Tap product
→ Adjust quantity
→ Enter customer mobile/name
→ Select payment
→ Generate & Print
```

Avoid unnecessary confirmation dialogs.

Use clear success/error states.

After successful bill:
- Show print option
- Save sale
- Clear cart
- Prepare for next customer

---

# Responsive Design

Must work on:

- Android phone
- Android tablet
- Desktop
- Laptop

Primary target:
**Tablet / desktop counter screen**

Use large touch targets.

Avoid tiny buttons.

---

# Important Business Rules

1. Product price is controlled by Owner.
2. Cashier cannot modify price.
3. Every completed sale gets a unique bill number.
4. Old bills preserve their original product names and prices.
5. No inventory/stock calculations.
6. UPI QR is configured by Owner.
7. UPI QR on a printed bill does not automatically confirm payment.
8. Payment method is saved with every bill.
9. Customer name/mobile are stored with the bill.
10. Receipt is optimized for 58mm thermal paper.
11. Owner can reprint old bills.
12. Cashier permissions must be enforced server-side/database-side.
13. Never expose Supabase service-role credentials to the browser.

---

# Development Order

Build in this order:

### Phase 1 — Foundation
- Next.js project
- Tailwind/shadcn
- Supabase connection
- Auth
- Database schema
- RLS

### Phase 2 — Owner
- Owner dashboard
- Categories
- Product CRUD
- Settings
- UPI configuration
- Cashier management

### Phase 3 — Cashier
- POS layout
- Search
- Category filter
- Product grid
- Cart
- Customer details
- Payment selection

### Phase 4 — Billing
- Server-side bill creation
- Unique bill number
- Bill item snapshots
- Bill history
- Reprint

### Phase 5 — Printing
- 58mm print CSS
- Receipt preview
- UPI QR
- Browser print
- Printer abstraction for future Bluetooth/USB support

### Phase 6 — Reports
- Daily sales
- Payment-method totals
- Bill history
- Basic owner reports

### Phase 7 — Testing
Test:
- Owner permissions
- Cashier permissions
- Price changes
- Duplicate billing
- Multiple quantities
- Empty cart
- Customer without mobile
- UPI
- Cash
- Card
- Receipt printing
- QR scanning
- Mobile layout
- Tablet layout
- Desktop layout

---

# UI Reference

The approved visual concept contains:

- Nature Caffe login
- Cashier billing POS
- Current order/cart
- Customer details
- 58mm printed bill
- Owner dashboard
- Product management
- Add/Edit Product
- Sales history

Use this visual direction as the baseline, but prioritize usability over copying decorative elements.

---

# Development Principles

- TypeScript strict mode
- Reusable components
- Server-side authorization
- Validate all monetary values
- Store money as numeric/decimal, not floating point JavaScript calculations where precision matters
- Never trust client-submitted prices
- Re-read authoritative product prices server-side when creating bills
- Use database transactions/RPC where necessary for bill creation
- Handle printer failures gracefully
- Handle network/database errors clearly
- Avoid unnecessary dependencies
- Keep POS interactions fast
- Do not add stock/inventory features unless explicitly requested

---

# Definition of Done for v1

The app is considered complete when:

1. Owner can log in.
2. Owner can add a food item and price.
3. Cashier can log in.
4. Cashier can see the item immediately.
5. Cashier can create a bill.
6. Customer name/mobile can be saved.
7. Cash/UPI/Card can be selected.
8. Bill is stored in Supabase.
9. Bill gets a unique bill number.
10. Bill can be reprinted.
11. Receipt prints in a 58mm layout.
12. UPI QR appears on the receipt.
13. Owner can see sales.
14. Cashier cannot change product prices.
15. No inventory/stock module exists.
16. App works well on Android/tablet/desktop.

---

# Instructions to Claude Code

Before implementing:
1. Inspect the existing repository.
2. Do not overwrite an existing application blindly.
3. If a project already exists, adapt it to this specification.
4. If no project exists, initialize a clean Next.js App Router project.
5. Ask only when a decision genuinely blocks implementation.
6. Prefer sensible defaults for non-critical UI decisions.
7. Build incrementally and test after each major phase.
8. Keep database migrations versioned.
9. Never commit secrets.
10. Use environment variables for Supabase configuration.
11. Provide clear setup instructions in `README.md`.
12. At the end, report:
   - What was built
   - Database tables/migrations
   - Environment variables required
   - How to run locally
   - How to deploy
   - Known limitations
   - Printer integration status

Start by inspecting the repository and then implement **Phase 1: Foundation**.
