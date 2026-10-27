# Requirement brief: Discount codes at checkout

> Refined from the WorkIQ signal in [`assets/workiq/`](../workiq/) using the
> [Requirement Refiner](../../.github/agents/requirement-refiner.agent.md) process. Paste-ready as a GitHub issue.

## Signal synthesis

| Theme | Sources | Classification |
| --- | --- | --- |
| Can't pay / no checkout | Email #1, ticket #4822, Teams (Sofia) | Already planned: backlog #1, delivered in Challenge 3 |
| **No way to enter a discount code; invalid/expired codes fail silently** | Email #2, tickets #4821 #4826 #4833 #4841, Teams (Marcus, Dan, Sofia, Ivan, Priya) | **New, unmet need** |
| Past orders | Email #3, ticket #4830, Teams (Dan) | Already planned: backlog #2 |
| Product search | Email #4, ticket #4838 | Already planned: backlog #3 |
| Delivery status | Teams (Sofia) | Already planned: backlog #6 |
| "Exact offer wording should reach the team" | Teams (Priya, Marcus) | Process noise, not product work |

Discount codes are the only theme that appears in **all three** sources and is **not** on the backlog. Support's triage
note confirms it: "currently no such capability exists in the product".

## Problem statement

Customers arriving from the launch campaign, the newsletter and sales deals (including the Ferndale branch account)
have been promised they can "enter your code at checkout". Today the cart and checkout have no concept of a code: there
is nowhere to type one, and the total can only be the sum of line items. Support is already fielding tickets, and
customers who try a code see "nothing happen", which they read as the offer being broken or untrue. If this ships
without codes, the launch campaign can't be honoured on day one.

## Acceptance criteria

- [ ] Given a cart with items, when the customer opens checkout, then there is a clearly labelled field to enter a discount code and apply it.
- [ ] Given a valid, active code, when the customer applies it, then the order summary shows the code, the amount it takes off, and the reduced total before payment.
- [ ] Given a code that doesn't exist, when the customer applies it, then a visible error says the code isn't recognised and the total is unchanged.
- [ ] Given a code that has expired, when the customer applies it, then a visible error says the code has expired (distinct from "not recognised") and the total is unchanged.
- [ ] Given an applied code, when the customer pays, then the amount charged and the stored order both reflect the discounted total, and the order records which code was used.
- [ ] Given any request, codes are validated by the API: the client cannot submit its own discount amount, and codes can't be made up.
- [ ] Code matching is case-insensitive and ignores surrounding whitespace (customers will type `launch10` or paste ` LAUNCH10 `).
- [ ] Validation and discount-calculation rules have unit tests; the apply → pay path has an integration test.

## Scoped tasks

- **Database:** migration `004_add_discount_codes.sql` with a `discount_codes` table (`code` unique, `percent_off` with a CHECK of 1–100, `expires_at`, `active`) and a nullable `discount_code` column on `carts`. Seed one launch code.
- **API:**
  - `PUT /api/carts/:id/discount-code` applies a code: `{ code }` returns the cart with `discountCode` and `codeDiscount` fields, 404 for an unknown code, and 409 or 422 for an expired code, with distinct error codes.
  - `DELETE /api/carts/:id/discount-code` removes it.
  - Cart totals and checkout use the server-side discounted total.
  - Swagger docs.
- **Frontend:** a code input plus an **Apply** button in the checkout summary, an inline error with `role="alert"`, a discount line in `CartSummary`, and a way to remove the code.
- **Tests:** repository and validation unit tests (Vitest), checkout integration tests (supertest), and an e2e happy path (Playwright).

_Sized at about 60–90 minutes. The checkout from Challenge 3 is a prerequisite._

## Out of scope & assumptions

- **Out of scope:**
  - An admin UI for creating codes. Codes are seeded or inserted by ops for launch.
  - Per-customer usage limits.
  - Stacking more than one code.
  - Fixed-amount codes.
- **Assumption:** the launch offer is a **percentage off the order**. The real offer wording hasn't reached the team (Priya asked Marcus for it), so **confirm with Marketing before building**.
- **Assumption:** the code discount applies on top of existing product sale prices, not instead of them. Confirm with Marketing.
- **Assumption:** one code per order.
- **Open question for Sales:** is Ferndale's promised code a normal campaign code or a one-off? It may need a separate, single-use code.

## Priority & sizing

- Suggested priority: **High**. It's launch-blocking per Elena's email (#2 after checkout), and Sales has made a promise to a named account.
- Size: **M**. It spans the database, API and frontend, but each slice is small.
- Suggested labels: `backlog`, `priority:high`, `checkout`
