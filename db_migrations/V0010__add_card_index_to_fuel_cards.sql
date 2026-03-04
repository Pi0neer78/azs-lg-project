ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS card_index INTEGER NOT NULL DEFAULT 0 CHECK (card_index >= 0 AND card_index <= 9);
ALTER TABLE fuel_cards DROP CONSTRAINT IF EXISTS fuel_cards_card_code_key;
ALTER TABLE fuel_cards DROP CONSTRAINT IF EXISTS fuel_cards_card_code_card_index_key;
ALTER TABLE fuel_cards ADD CONSTRAINT fuel_cards_card_code_card_index_key UNIQUE (card_code, card_index);