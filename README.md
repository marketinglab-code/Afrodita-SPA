# ANICA - Sistema de Agendamiento Afrodita Spa 🎀

Sistema inteligente de agendamiento por WhatsApp para Afrodita Spa, utilizando IA conversacional (GPT-4) para coordinar citas con 20 modelos profesionales.

## 📋 Descripción

ANICA es un agente conversacional que gestiona el flujo completo de agendamiento de citas para Afrodita Spa:

- **Recepción de mensajes** vía WhatsApp (Wassenger)
- **Detección automática de modelo** desde códigos QR
- **Formulario progresivo inteligente** con TTL de 120 minutos
- **Validación de pagos** con OpenAI Vision
- **Notificaciones automáticas** a las modelos
- **Protección post-confirmación** (cooldown de 10 minutos)
- **Personalidad ecuatoriana** cálida y profesional

## 🏗️ Arquitectura

```
Afrodita-SPA/
├── migrations/
│   ├── 001_initial_schema.sql
│   └── run-migrations.js
├── src/
│   ├── anica/
│   │   └── prompt-sistema-anica.js
│   ├── database/
│   │   ├── postgres-adapter.js
│   │   └── database.js
│   ├── orquestador/
│   │   └── anica-orchestrator.js
│   ├── servicios/
│   │   ├── partial-reservation-form.js
│   │   ├── reservation-state.js
│   │   ├── payments.js
│   │   └── handoff-modelo.js
│   ├── webhook/
│   │   └── wassenger.js
│   ├── tests/
│   │   └── anica.test.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
├── jest.config.json
└── README.md
```

## 🚀 Instalación

### 1. Clonar y configurar

```bash
cd Afrodita-SPA
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y configura:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
# PostgreSQL (Heroku Postgres recomendado)
DATABASE_URL=postgres://usuario:password@host:5432/database

# OpenAI
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4
OPENAI_VISION_MODEL=gpt-4-vision-preview

# Wassenger
WASSENGER_API_KEY=xxxxx
WASSENGER_DEVICE_ID=xxxxx
WASSENGER_WEBHOOK_SECRET=xxxxx
AFRODITA_WHATSAPP_NUMBER=0983370228

# Google Calendar (opcional)
GOOGLE_CALENDAR_ID=primary
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxxxx@xxxxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"
```

### 3. Ejecutar migraciones

```bash
npm run migrate
```

Esto creará todas las tablas en PostgreSQL:
- users
- models
- reservations
- interactions
- pending_confirmations
- reservation_state
- partial_forms
- conversation_history

### 4. Iniciar servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 🎯 Endpoints

### Webhook Principal
```
POST /webhook/wassenger
```
Recibe mensajes de Wassenger y procesa con ANICA.

### Health Check
```
GET /health
```
Verifica estado del servidor y base de datos.

### Testing
```
POST /webhook/wassenger/test
Body: { "phone": "0987654321", "message": "hola" }
```
Endpoint para simular mensajes sin Wassenger.

## 📊 Base de Datos

### Modelo de Primera Prueba

El sistema viene con una modelo pre-registrada:

- **Código:** AN01
- **Teléfono:** 0987770788
- **Estado:** Activa

Para agregar más modelos:

```sql
INSERT INTO models (code, display_name, phone_number, city, is_active)
VALUES ('AN02', 'Nombre Modelo', '0987654321', 'Quito', TRUE);
```

## 💰 Servicios y Precios

| Servicio | Duración | Precio Base |
|----------|----------|-------------|
| Momento 15 min | 15 min | $30 |
| Media hora | 30 min | $35 |
| 45 minutos | 45 min | $40 |
| 1 hora | 1 hora | $50 |
| Salidas 1 hora | 1 hora | $70 |
| Salidas 2 horas | 2 horas | $120 |
| Salidas 3 horas | 3 horas | $150 |

### Impuestos

- **Transferencia:** Base + 15% IVA
- **Tarjeta:** Base + 5% comisión + 15% IVA
- **Efectivo:** Base + 15% IVA

## 🔐 Flujo de Agendamiento

1. **Usuario envía mensaje** (desde QR): "hola, quiero una cita con AN01"
2. **ANICA detecta modelo** y asocia la conversación
3. **Recopilación progresiva:**
   - Servicio
   - Fecha
   - Hora
   - Ciudad
   - Método de pago
4. **Confirmación:** Muestra resumen y pide confirmación explícita
5. **Creación de reserva** con cálculo de impuestos
6. **Envío de link de pago** (Payphone)
7. **Validación de comprobante** con OpenAI Vision
8. **Notificación a la modelo** vía WhatsApp

### Cooldown Post-Confirmación

Después de confirmar una reserva, el usuario tiene un período de **10 minutos** donde:
- No se reinicia el flujo automáticamente
- ANICA responde dudas sobre la reserva existente
- Solo se permite nueva reserva si es explícitamente solicitada

## 🧪 Testing

Ejecutar tests:

```bash
npm test
```

Tests incluidos:
- ✅ Cálculo de impuestos (IVA, comisiones)
- ✅ Detección de código de modelo
- ✅ Validación 24/7 (horarios)
- ✅ Expiración de formularios (TTL 120 min)
- ✅ Detección de confirmación
- ✅ Extracción de datos del mensaje

## 🌟 Características Especiales

### Personalidad de ANICA

- **Tono:** Cálido, dulce, profesional
- **Lenguaje:** Ecuatoriano natural
- **Manejo de groserías:** Sin romper la conversación
- **Límites elegantes:** Marca respeto cuando es necesario
- **Mensaje de discreción:**
  > "Por tu máxima discreción, este chat se borrará automáticamente en 24 horas. Afrodita Spa cuida cada detalle por ti."

### Horario 24/7

⚠️ **No hay restricciones de horario.** El sistema permite agendar citas a cualquier hora, cualquier día del año.

### Validación de Pagos

El sistema usa **OpenAI Vision** para validar comprobantes:
- Extrae monto, fecha, referencia
- Compara con el total esperado (tolerancia $0.50)
- Confirma automáticamente si todo coincide

## 🛠️ Mantenimiento

### Limpieza Automática

El servidor ejecuta limpieza automática cada 30 minutos:
- Elimina formularios expirados (>120 minutos)

### Logs

Todos los mensajes se registran en:
- `interactions` (entrada/salida)
- `conversation_history` (contexto OpenAI)

### Monitoreo

```bash
# Health check
curl http://localhost:3000/health

# Respuesta esperada:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-25T..."
}
```

## 📱 Configuración Wassenger

1. Crear cuenta en [Wassenger](https://wassenger.com)
2. Conectar tu número de WhatsApp
3. Obtener API Key y Device ID
4. Configurar webhook: `https://tu-dominio.com/webhook/wassenger`
5. Agregar `WASSENGER_WEBHOOK_SECRET` en headers

## 🚨 Solución de Problemas

### Error: "Database connection failed"
- Verifica `DATABASE_URL` en `.env`
- Asegúrate que PostgreSQL esté accesible
- Revisa que SSL esté configurado correctamente

### Error: "OpenAI API error"
- Verifica `OPENAI_API_KEY`
- Revisa límites de uso de tu cuenta OpenAI
- Confirma que el modelo `gpt-4` esté disponible

### No llegan mensajes de WhatsApp
- Verifica configuración del webhook en Wassenger
- Revisa logs del servidor
- Confirma que el servidor sea accesible públicamente

## 📞 Contacto y Soporte

Para soporte técnico o consultas:
- **WhatsApp Afrodita Spa:** 0983370228
- **Modelo Test (AN01):** 0987770788

## 📄 Licencia

Privado - Afrodita Spa © 2025

---

**🎀 ANICA - Cuidando cada detalle por ti**
