# api-multi-db-tables

Backend system (NestJS + MySQL) exposing full **GET / POST / PUT / DELETE** operations over a
four-table relational database, testable end to end in Postman.

- **Starting table:** `users`
- **Tables:** `users`, `categories`, `products`, `orders` (4 — the activity requires at least 3)
- **Auth:** JWT access token + refresh token, passwords hashed with bcrypt
- **Database:** MySQL (hosted on Aiven), accessed with `mysql2` connection pooling

---

## 1. Database design

```
  categories                users
  ----------                -----
  id (PK)                   id (PK)
  name (UNIQUE)             username (UNIQUE)
  description               password  (bcrypt hash)
      |                     role
      |                     refresh_token
      | 1                       |
      |                         | 1
      | M                       |
  products                      |
  --------                      |
  id (PK)                       |
  name                          |
  price                         |
  category_id (FK) -------------+
      |                         |
      | 1                       | M
      |                         |
      +------ M ---------> orders
                           ------
                           id (PK)
                           user_id    (FK -> users.id)
                           product_id (FK -> products.id)
                           quantity
```

| Relationship | Type | Delete rule |
| --- | --- | --- |
| `categories` → `products` | one-to-many | `ON DELETE SET NULL` — the product survives, uncategorised |
| `users` → `orders` | one-to-many | `ON DELETE RESTRICT` — a user with orders cannot be deleted |
| `products` → `orders` | one-to-many | `ON DELETE RESTRICT` — a product with orders cannot be deleted |

The SQL lives in version control:

| File | Purpose |
| --- | --- |
| `database/schema.sql` | Creates all four tables with their keys and foreign keys. Safe to re-run. |
| `database/seed.sql` | Inserts sample categories, products and orders. Safe to re-run. |

```bash
mysql -h <host> -P <port> -u <user> -p <database> < database/schema.sql
mysql -h <host> -P <port> -u <user> -p <database> < database/seed.sql
```

---

## 2. Setup

```bash
npm install
cp .env.example .env     # then fill in the real values
npm run start:dev        # http://localhost:3000
```

`.env` keys (see `.env.example`):

```
PORT=3000
DB_HOST=            DB_PORT=            DB_NAME=
DB_USER=            DB_PASSWORD=
JWT_ACCESS_TOKEN_SECRET=      ACCESS_TOKEN_EXPIRES_IN=900s
JWT_REFRESH_TOKEN_SECRET=     REFRESH_TOKEN_EXPIRES_IN=7d
```

`.env` is git-ignored — only `.env.example` is committed.

---

## 3. API reference

`GET /` is public and returns this list at runtime. **Every other route needs a header:**

```
Authorization: Bearer <accessToken>
```

### Auth — `src/auth/`

| Method | Route | Body | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ username, password, role? }` | Public. Hashes the password, inserts into `users`. `409` if the username is taken. |
| POST | `/auth/login` | `{ username, password }` | Public. Returns `accessToken`, `refreshToken`, `user`. |
| POST | `/auth/refresh` | `{ refreshToken }` | New token pair. The token must still match the one stored on the user row. |
| POST | `/auth/logout` | `{ userId }` | Clears `users.refresh_token`. |

### Users — the starting table

| Method | Route | Body |
| --- | --- | --- |
| GET | `/users` | — (each row includes `order_count`) |
| GET | `/users/:id` | — |
| POST | `/users` | `{ username, password, role? }` |
| PUT | `/users/:id` | any of `{ username, password, role }` |
| DELETE | `/users/:id` | — |

Passwords and refresh tokens are never included in a response.

### Categories

| Method | Route | Body |
| --- | --- | --- |
| GET | `/categories` | — (each row includes `product_count`) |
| GET | `/categories/:id` | — |
| POST | `/categories` | `{ name, description? }` |
| PUT | `/categories/:id` | any of `{ name, description }` |
| DELETE | `/categories/:id` | — |

### Products

| Method | Route | Body |
| --- | --- | --- |
| GET | `/products` | — (joined with `categories` → `category_name`) |
| GET | `/products/:id` | — |
| POST | `/products` | `{ name, price, categoryId? }` |
| PUT | `/products/:id` | any of `{ name, price, categoryId }` |
| DELETE | `/products/:id` | — |

### Orders

| Method | Route | Body |
| --- | --- | --- |
| GET | `/orders` | — |
| GET | `/orders/:id` | — |
| POST | `/orders` | `{ productId, quantity, userId? }` — `userId` defaults to the logged-in user |
| PUT | `/orders/:id` | any of `{ userId, productId, quantity }` |
| DELETE | `/orders/:id` | — |

`GET /orders` joins all four tables in a single query:

```json
{
  "id": 1,
  "user_id": 1,
  "username": "vannydeleonFirst@test.com",
  "product_id": 1,
  "product_name": "Wireless Mouse",
  "price": 549,
  "category_name": "Electronics",
  "quantity": 2,
  "total_price": 1098,
  "created_at": "2026-10-11T02:26:49.000Z",
  "updated_at": "2026-10-11T02:26:49.000Z"
}
```

### Status codes

| Code | When |
| --- | --- |
| `200` | Successful GET / PUT / DELETE |
| `201` | Successful POST |
| `400` | Bad input: non-numeric id, empty update body, negative price, `quantity <= 0`, a foreign key that does not exist, or deleting a row another table still references |
| `401` | Missing, expired or invalid token; wrong login credentials |
| `404` | The requested id does not exist |
| `409` | Duplicate `username` or duplicate category `name` |

---

## 4. Testing in Postman

1. Start the API: `npm run start:dev`
2. In Postman: **Import → File →** `postman/api-multi-db-tables.postman_collection.json`
3. Run **`Auth → 2. Login`** first. Its test script saves `accessToken`, `refreshToken` and
   `userId` as collection variables, so every other request is authorised automatically.
4. Run each folder top to bottom. Each `POST` saves the new id (`categoryId`, `productId`,
   `orderId`), so the `GET /:id`, `PUT` and `DELETE` requests below it need no editing.

Collection layout (36 requests):

| Folder | Contents |
| --- | --- |
| `0. API index` | Public `GET /` |
| `Auth` | register, login, refresh, logout |
| `Users (starting table)` | GET all, POST, GET one, PUT, DELETE |
| `Categories` | GET all, POST, GET one, PUT, DELETE |
| `Products` | GET all, POST, GET one, PUT, DELETE |
| `Orders` | GET all, POST, GET one, PUT, DELETE |
| `Error responses` | 401 / 400 / 404 / 409 cases, each one deliberate |

The default login is `postman_user` / `secret123` (collection variables `username` / `password`).

Whole collection via CLI, no Postman GUI needed:

```bash
npx newman run postman/api-multi-db-tables.postman_collection.json
```

---

## 5. Project layout

```
database/
  schema.sql              4 tables, keys and foreign keys
  seed.sql                sample rows
postman/
  api-multi-db-tables.postman_collection.json
src/
  main.ts                 bootstrap, CORS, port
  app.module.ts           registers every feature module
  app.controller.ts       GET / -> API index
  config/env.ts           loads .env before any module reads process.env
  common/parse-id.util.ts turns :id into a positive integer, else 400
  database/               global MySQL connection pool (mysql2)
  auth/                   register, login, refresh, logout, JWT strategy + guard
  users/                  CRUD for users      (starting table)
  categories/             CRUD for categories
  products/               CRUD for products
  orders/                 CRUD for orders
test/
  app.e2e-spec.ts         API index + "protected route returns 401"
```

Each feature folder follows the same shape: `*.module.ts` wires it up, `*.controller.ts` maps
the HTTP routes, `*.service.ts` holds the parameterised SQL.

All queries use `?` placeholders (`pool.execute`), so values are never concatenated into SQL.

---

## 6. Scripts

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Watch-mode server on `http://localhost:3000` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run without watch mode |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests (needs a reachable database) |
| `npm run lint` | oxlint, type-aware |
| `npm run format` | Prettier |
