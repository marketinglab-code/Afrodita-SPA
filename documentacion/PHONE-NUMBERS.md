# 📱 Configuración de Números de Teléfono - ANICA

## 🎯 Números del Sistema

### 📞 Números Principales

| Rol | Número | Descripción |
|-----|---------|-------------|
| **Bot ANICA** | `0983370228` | Número de WhatsApp donde opera el bot |
| **Administrador** | `0987770788` | Tu número (Diego) - Recibe notificaciones |

### 💃 Números de Modelos

| Código | Nombre | Número | Ciudad |
|--------|--------|---------|--------|
| **AN01** | Danica | `0992320262` | Quito |

---

## ⚙️ Variables de Entorno en Heroku

### Ya configuradas ✅

```bash
AFRODITA_WHATSAPP_NUMBER=0983370228  # Número del bot
ADMIN_PHONE_NUMBER=0987770788        # Tu número para notificaciones
```

Para verificar en Heroku:
```bash
heroku config:get AFRODITA_WHATSAPP_NUMBER -a anica-gpt
heroku config:get ADMIN_PHONE_NUMBER -a anica-gpt
```

---

## 💾 Base de Datos

### Tabla `models`

Los números de las modelos se guardan en la base de datos PostgreSQL.

**Para agregar/actualizar modelos:**

1. **Opción 1: SQL directo**
   ```bash
   heroku pg:psql -a anica-gpt
   
   -- Ejecutar el script de migración
   \i migrations/002-setup-models.sql
   ```

2. **Opción 2: Desde local**
   ```bash
   # Conectar a la base de datos de Heroku
   heroku pg:psql -a anica-gpt < migrations/002-setup-models.sql
   ```

3. **Opción 3: CLI de ANICA (cuando esté desplegado)**
   ```bash
   heroku run npm run cli -- add-model -a anica-gpt
   ```

---

## 🔔 Sistema de Notificaciones

### ¿Quién recibe qué?

#### Administrador (`0987770788` - Diego)
- ✅ Notificación de cada nueva reserva confirmada
- ✅ Detalles completos: cliente, modelo, fecha, hora, precio
- ✅ Link al evento en Google Calendar

#### Modelo (`0992320262` - Danica)
- ✅ Notificación cuando se le asigna una cita
- ✅ Datos del cliente y ubicación
- ✅ Recordatorios antes de la cita

#### Cliente (número variable)
- ✅ Confirmación de reserva
- ✅ Recordatorios automáticos
- ✅ Link de pago (si aplica)

---

## 🔧 Para Agregar Más Modelos

Edita `migrations/002-setup-models.sql` y agrega:

```sql
INSERT INTO models (code, display_name, phone_number, city, is_active, hourly_rate, image_url)
VALUES (
  'AN02',              -- Código único
  'Valentina',         -- Nombre
  '099XXXXXXX',        -- Teléfono
  'Guayaquil',         -- Ciudad
  true,                -- Activa
  65.00,               -- Tarifa por hora
  'url_imagen'         -- URL de foto
)
ON CONFLICT (code) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  display_name = EXCLUDED.display_name,
  city = EXCLUDED.city,
  is_active = EXCLUDED.is_active,
  hourly_rate = EXCLUDED.hourly_rate;
```

Luego ejecuta:
```bash
heroku pg:psql -a anica-gpt < migrations/002-setup-models.sql
```

---

## ✅ Checklist de Verificación

Antes de ir a producción, verifica:

- [ ] `AFRODITA_WHATSAPP_NUMBER` configurado en Heroku
- [ ] `ADMIN_PHONE_NUMBER` configurado en Heroku
- [ ] Wassenger conectado al número `0983370228`
- [ ] Modelo Danica agregada en la base de datos con número correcto
- [ ] Probado envío de notificaciones al admin
- [ ] Probado notificaciones a modelos

---

## 📝 Notas Importantes

1. **Formato de números**: Todos los números están en formato ecuatoriano sin el código de país (+593)
2. **WhatsApp Business**: El número del bot debe tener WhatsApp Business o WhatsApp normal
3. **Wassenger**: Solo puedes conectar UN número por cuenta (a menos que tengas plan premium)
4. **Notificaciones**: El bot necesita Wassenger configurado para enviar mensajes
