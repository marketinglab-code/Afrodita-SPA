-- Agregar columnas faltantes a la tabla models
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 60.00,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Actualizar modelo existente si ya está creado
UPDATE models 
SET phone_number = '0992320262', 
    display_name = 'Danica',
    hourly_rate = 60.00
WHERE code = 'AN01';

-- Insertar o actualizar modelo Danica
INSERT INTO models (code, display_name, phone_number, city, is_active, hourly_rate)
VALUES ('AN01', 'Danica', '0992320262', 'Quito', true, 60.00)
ON CONFLICT (code) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  display_name = EXCLUDED.display_name,
  hourly_rate = EXCLUDED.hourly_rate;
