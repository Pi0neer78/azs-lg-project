UPDATE card_operations SET fuel_card_id = 46 WHERE id IN (70,89,119,147,249,268,332);
UPDATE fuel_cards SET balance_liters = 0.00 WHERE id = 45;
UPDATE fuel_cards SET balance_liters = 312.25 WHERE id = 46;