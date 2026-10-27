# OctoSupply API (TypeScript)

Express + TypeScript reference implementation of the OctoSupply API. The C#, Python, and Java variants are ports of this service.

## Run

```bash
npm install
npm run dev
```

Default API URL: `http://localhost:3000`

## Environment

- `PORT` (default: `3000`)
- `DB_FILE` (default: `./data/app.db`)
- `API_CORS_ORIGINS` (comma-separated override; optional)
- `DB_ENABLE_WAL` (enable WAL mode; default: `true`)
- `DB_FOREIGN_KEYS` (enforce foreign keys; default: `true`)
- `DB_TIMEOUT` (busy timeout in ms; default: `30000`)
- `PAYMENT_PROVIDER` (checkout payment provider; default: `mock`)
- `PAYMENT_CURRENCY` (ISO currency code for charges; default: `USD`)
- `PAYMENT_API_KEY` (provider secret; required for any provider other than `mock`. Set it in the environment, never in source)

### Mock payment test cards

With `PAYMENT_PROVIDER=mock`, any valid card number with a future expiry date succeeds, except:

| Card number | Result |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 9995` | Declined: insufficient funds |
| `4000 0000 0000 0069` | Declined: expired card |

## Database

On startup, the API applies SQL migrations from:

- `../database/migrations/*.sql`

and seeds from:

- `../database/seed/*.sql`

## OpenAPI

- OpenAPI JSON: `http://localhost:3000/api-docs.json`
- Swagger UI: `http://localhost:3000/api-docs`

## Tests

Run TypeScript tests from the `src/` directory:

```bash
make test-ts
```
