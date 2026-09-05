# SoleVault Full-Stack Shoe Store

A deployable ecommerce starter with:
- Premium responsive storefront
- SQLite database
- Express backend/API
- Admin dashboard at `/admin`
- Add/edit/delete products
- Stock and sizes
- Orders and order-status management
- Search, category filtering and sorting
- Cart and wishlist using browser localStorage
- Basic checkout that creates real orders in SQLite

## Requirements
Node.js 18+ recommended.

## Run locally
```bash
npm install
npm start
```
Then open `http://localhost:3000`.
Admin: `http://localhost:3000/admin`

The SQLite database (`solevault.db`) is created automatically.

## Deploy
This app needs a Node.js server. GitHub Pages is NOT suitable because it cannot run the Express backend.

Use a Node-compatible host such as Render, Railway, Fly.io, or a VPS. Set the start command to `npm start`.

## Database
SQLite is used for an easy zero-configuration demo. For production with multiple server instances, move the database to PostgreSQL (Supabase/Neon/etc.) and move product images to object storage.

## Security before real launch
The admin route currently has no authentication. Add admin authentication before putting the admin panel on the public internet. Payment processing should also be integrated server-side (e.g. Razorpay/Stripe) rather than treating the demo checkout as a payment gateway.

## Product image URLs
The admin form accepts image URLs. For production, add an upload endpoint backed by cloud object storage.
