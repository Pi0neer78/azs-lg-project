CREATE TABLE IF NOT EXISTS t_p39946729_azs_lg_project.card_fuel_prices (
    id SERIAL PRIMARY KEY,
    fuel_card_id INTEGER NOT NULL REFERENCES t_p39946729_azs_lg_project.fuel_cards(id),
    fuel_type_id INTEGER NOT NULL REFERENCES t_p39946729_azs_lg_project.fuel_types(id),
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fuel_card_id, fuel_type_id)
);