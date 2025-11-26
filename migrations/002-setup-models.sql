-- Script de configuración inicial de modelos
-- Actualiza los números de teléfono y datos de las modelos

-- Modelo 1: Danica (AN01)
INSERT INTO models (code, display_name, phone_number, city, is_active, hourly_rate, image_url)
VALUES (
  'AN01',
  'Danica',
  '0992320262',
  'Quito',
  true,
  60.00,
  'https://example.com/danica.jpg'
)
ON CONFLICT (code) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  display_name = EXCLUDED.display_name,
  city = EXCLUDED.city,
  is_active = EXCLUDED.is_active,
  hourly_rate = EXCLUDED.hourly_rate;

-- Puedes agregar más modelos aquí siguiendo el mismo patrón:
-- INSERT INTO models (code, display_name, phone_number, city, is_active, hourly_rate, image_url)
-- VALUES ('AN02', 'Valentina', '099XXXXXXX', 'Guayaquil', true, 65.00, 'url')
-- ON CONFLICT (code) DO UPDATE SET ...

-- Verificar los datos
SELECT code, display_name, phone_number, city, is_active, hourly_rate 
FROM models 
ORDER BY code;
