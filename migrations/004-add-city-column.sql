-- Agregar columna 'city' a la tabla reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Crear índice para búsquedas por ciudad
CREATE INDEX IF NOT EXISTS idx_reservations_city ON reservations(city);
