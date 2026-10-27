-- Migration 004: Track cart checkout state
-- checkout_started_at: set while a payment is in flight so a cart is only charged once at a time
-- checked_out_at: set once the cart became an order. Carts are closed rather than deleted so
--   their IDs are never reused by SQLite for a new cart
-- Rollback: SQLite can't drop columns before 3.35, the nullable columns are harmless to leave
-- (no semicolons in these comments: the migration runner splits statements on them)

ALTER TABLE carts ADD COLUMN checkout_started_at DATETIME;
ALTER TABLE carts ADD COLUMN checked_out_at DATETIME;
