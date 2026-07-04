-- Horizon migration 013: heal category-ID references in stored categories.
--
-- A bug in the transaction and recurring-transaction create modals persisted
-- the *id* of the selected category into the `category` column, which the rest
-- of the app keys by category *name*. Affected rows surface a raw UUID wherever
-- the category is shown (e.g. the Month Overview Year-Comparison card). Rewrite
-- any such row back to the category's name. Rows that already store a name are
-- left untouched, since a name can never match a category id.

UPDATE transactions
SET category = (
  SELECT name FROM categories WHERE categories.id = transactions.category
)
WHERE category IN (SELECT id FROM categories);

UPDATE recurring_transactions
SET category = (
  SELECT name FROM categories
  WHERE categories.id = recurring_transactions.category
)
WHERE category IN (SELECT id FROM categories);
