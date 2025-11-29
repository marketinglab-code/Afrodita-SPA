# 📂 Estructura del Proyecto - Afrodita SPA

## 🎯 ¿Qué es este proyecto?

**ANICA** es un sistema inteligente de agendamiento de citas para Afrodita Spa que funciona por WhatsApp. Los clientes pueden agendar citas con las modelos de forma automática 24/7 sin necesidad de un humano.

---

## 📁 Estructura de Carpetas

```
Afrodita-SPA/
│
├── 📄 README.md                    # Documentación principal del proyecto
├── 📄 package.json                 # Dependencias y scripts de Node.js
├── 📄 .env                         # Variables secretas (API keys, tokens)
├── 📄 .gitignore                   # Archivos que Git debe ignorar
│
├── 📁 src/                         # CÓDIGO PRINCIPAL DE LA APLICACIÓN
│   ├── 📄 server.js               # Punto de entrada - Inicia el servidor
│   │
│   ├── 📁 anica/                  # PERSONALIDAD Y COMPORTAMIENTO DEL BOT
│   │   └── prompt-sistema-anica.js    # Define cómo habla ANICA
│   │
│   ├── 📁 orquestador/            # COORDINADOR PRINCIPAL
│   │   └── anica-orchestrator.js      # Coordina todo el flujo de reservas
│   │
│   ├── 📁 servicios/              # SERVICIOS DE NEGOCIO
│   │   ├── google-calendar.js         # Crea eventos en Google Calendar
│   │   ├── handoff-modelo.js          # Notifica a las modelos
│   │   ├── partial-reservation-form.js # Maneja el formulario de reserva
│   │   ├── payments.js                 # Calcula precios con IVA
│   │   └── reservation-state.js       # Control de cooldown post-reserva
│   │
│   ├── 📁 database/               # BASE DE DATOS
│   │   ├── database.js                # Funciones para acceder a datos
│   │   └── postgres-adapter.js        # Conector de PostgreSQL
│   │
│   ├── 📁 webhook/                # ENTRADA DE MENSAJES
│   │   └── wassenger.js               # Recibe mensajes de WhatsApp
│   │
│   ├── 📁 utils/                  # UTILIDADES
│   │   ├── bot-switch.js              # Enciende/apaga el bot
│   │   └── cli.js                     # Comandos de terminal
│   │
│   └── 📁 tests/                  # PRUEBAS
│       ├── anica.test.js              # Tests del bot
│       └── test-calendar-flow.js      # Tests de Google Calendar
│
├── 📁 migrations/                 # MIGRACIONES DE BASE DE DATOS
│   ├── 001_initial_schema.sql        # Crea las tablas iniciales
│   ├── 002-setup-models.sql          # Configura las modelos
│   ├── 003-add-missing-columns.sql   # Agrega columnas faltantes
│   ├── 004-add-city-column.sql       # Agrega columna de ciudad
│   └── run-migrations.js             # Script para ejecutar migraciones
│
├── 📁 scripts/                    # SCRIPTS DE MANTENIMIENTO
│   ├── bot-control.sh                # Script para controlar el bot
│   ├── clean-user-history.js         # Limpia historial de usuarios
│   └── start.sh                      # Script de inicio rápido
│
├── 📁 configuracion/              # ARCHIVOS DE CONFIGURACIÓN
│   ├── ecosystem.config.json         # Config para PM2 (proceso)
│   └── jest.config.json              # Config para tests
│
└── 📁 documentacion/              # DOCUMENTACIÓN ADICIONAL
    ├── BOT-SWITCH-GUIDE.md           # Guía para encender/apagar bot
    ├── DEPLOYMENT.md                 # Guía de deploy a Heroku
    ├── EJEMPLOS.md                   # Ejemplos de conversaciones
    ├── PHONE-NUMBERS.md              # Configuración de números
    ├── QUICKSTART.md                 # Inicio rápido
    ├── RESUMEN.md                    # Resumen del sistema
    └── WASSENGER_SUPPORT_REQUEST.md  # Soporte de Wassenger
```

---

## 🔄 ¿Cómo Funciona el Sistema?

### 1️⃣ **Cliente envía mensaje por WhatsApp**
   - El mensaje llega a Wassenger (servicio de WhatsApp API)
   - Wassenger envía el mensaje a nuestro servidor

### 2️⃣ **Webhook recibe el mensaje**
   - `src/webhook/wassenger.js` captura el mensaje
   - Lo envía al orquestador

### 3️⃣ **Orquestador procesa el mensaje**
   - `src/orquestador/anica-orchestrator.js` coordina todo
   - Usa OpenAI GPT-4 para entender la intención del cliente
   - Consulta la base de datos para ver conversaciones previas

### 4️⃣ **ANICA responde con personalidad**
   - `src/anica/prompt-sistema-anica.js` define cómo habla
   - Es coqueta, profesional y ayuda a agendar

### 5️⃣ **Sistema recopila información**
   - `src/servicios/partial-reservation-form.js` guarda datos parciales
   - Va preguntando: modelo, servicio, fecha, hora, ciudad, pago

### 6️⃣ **Cliente confirma la reserva**
   - Sistema calcula precio con IVA (`src/servicios/payments.js`)
   - Crea registro en base de datos PostgreSQL
   - Crea evento en Google Calendar (`src/servicios/google-calendar.js`)
   - Notifica a la modelo por WhatsApp (`src/servicios/handoff-modelo.js`)
   - Envía link de pago al cliente

### 7️⃣ **Protección post-reserva**
   - `src/servicios/reservation-state.js` activa cooldown de 10 minutos
   - Durante ese tiempo, ANICA solo responde preguntas sobre la reserva actual
   - Evita confusión con múltiples reservas simultáneas

---

## 🗄️ Base de Datos (PostgreSQL en Heroku)

### Tablas Principales:

1. **`users`** - Información de clientes
   - phone_number (WhatsApp)
   - nombre, email
   - historial de conversaciones

2. **`models`** - Modelos del spa
   - código (ej: AN01)
   - nombre, teléfono, ciudad
   - tarifa por hora

3. **`reservations`** - Citas confirmadas
   - cliente, modelo, servicio
   - fecha, hora, ciudad
   - precio, método de pago

4. **`conversation_messages`** - Historial de chat
   - mensajes del cliente y respuestas de ANICA

5. **`pending_confirmations`** - Formularios en proceso
   - datos parciales que aún no se confirman

6. **`reservation_states`** - Control de cooldown
   - evita reservas duplicadas

---

## 🔑 Variables de Entorno Importantes

Están en el archivo `.env` (no se sube a Git por seguridad):

```bash
# OpenAI - Cerebro de ANICA
OPENAI_API_KEY=sk-...

# Base de Datos
DATABASE_URL=postgresql://...

# Wassenger - WhatsApp API
WASSENGER_API_KEY=...
WASSENGER_DEVICE_ID=...

# Google Calendar
GOOGLE_CALENDAR_ID=...
# (+ credenciales de servicio)

# Números de Teléfono
AFRODITA_WHATSAPP_NUMBER=0983370228  # Número del bot
ADMIN_PHONE_NUMBER=0987770788        # Número de Diego (admin)

# Configuración
IVA_RATE=0.15                        # 15% de IVA Ecuador
RESERVATION_COOLDOWN_MINUTES=10      # Cooldown post-reserva
```

---

## 🚀 Comandos Útiles

### Desarrollo Local
```bash
npm install              # Instalar dependencias
npm run dev             # Iniciar en modo desarrollo (con auto-reload)
npm start               # Iniciar en modo producción
npm test                # Ejecutar tests
```

### Migraciones de Base de Datos
```bash
npm run migrate         # Ejecutar migraciones pendientes
```

### Scripts de Mantenimiento
```bash
./scripts/start.sh              # Inicio rápido interactivo
./scripts/bot-control.sh        # Encender/apagar bot
node scripts/clean-user-history.js  # Limpiar historial
```

### Heroku (Producción)
```bash
git push heroku main           # Deploy a producción
heroku logs --tail             # Ver logs en tiempo real
heroku ps                      # Ver estado del servidor
heroku config                  # Ver variables de entorno
```

---

## 🛠️ Tecnologías Utilizadas

- **Node.js 20** - Runtime de JavaScript
- **Express** - Framework web
- **PostgreSQL** - Base de datos relacional
- **OpenAI GPT-4** - Inteligencia artificial
- **Google Calendar API** - Gestión de eventos
- **Wassenger** - API de WhatsApp
- **Heroku** - Hosting en la nube
- **Jest** - Framework de testing

---

## 👥 Roles en el Sistema

| Rol | Descripción | Ejemplo |
|-----|-------------|---------|
| **Cliente** | Persona que agenda cita por WhatsApp | Usuario final |
| **ANICA** | Bot inteligente que atiende clientes | Sistema automatizado |
| **Modelo** | Profesional que ofrece servicios | AN01 (Danica) |
| **Admin** | Administrador del sistema | Diego |

---

## 📊 Flujo de Datos Simplificado

```
WhatsApp Cliente
     ↓
Wassenger (API)
     ↓
Webhook (wassenger.js)
     ↓
Orquestador (anica-orchestrator.js)
     ↓
OpenAI GPT-4 (procesa mensaje)
     ↓
Base de Datos PostgreSQL
     ↓
Servicios de Negocio
     ↓
Respuesta a Cliente + Notificaciones
```

---

## 🎨 Características de ANICA

- ✅ **Disponible 24/7** - Nunca duerme
- ✅ **Entiende lenguaje coloquial** - Groserías, jerga ecuatoriana
- ✅ **Coqueta pero profesional** - Tono amigable
- ✅ **Multimodelo** - Gestiona múltiples modelos
- ✅ **Cálculo automático de precios** - IVA + comisiones
- ✅ **Protección anti-Aurora** - Bloquea menciones del bot anterior
- ✅ **Cooldown inteligente** - Evita reservas duplicadas
- ✅ **Notificaciones automáticas** - A modelos y admin
- ✅ **Google Calendar integrado** - Calendario sincronizado

---

## 🔒 Seguridad

- ✅ Variables sensibles en `.env` (nunca en Git)
- ✅ PostgreSQL con SSL en Heroku
- ✅ API keys con permisos limitados
- ✅ Validación de datos de entrada
- ✅ Protección contra spam (cooldown)
- ✅ Bloqueo de identidad incorrecta (Aurora)

---

## 📝 Notas Importantes

1. **El archivo `.env` NUNCA se sube a Git** - Contiene secretos
2. **Heroku usa variables de entorno propias** - Se configuran con `heroku config:set`
3. **La base de datos está en Heroku PostgreSQL** - No local
4. **Wassenger debe estar conectado** - Si no, el bot no recibe mensajes
5. **Backup branch creado:** `backup-nov28-all-changes` - Por si necesitas código anterior

---

## 🆘 Solución de Problemas Comunes

### El bot no responde
1. Verificar que Heroku esté corriendo: `heroku ps`
2. Ver logs: `heroku logs --tail`
3. Verificar Wassenger webhook esté configurado
4. Verificar variables de entorno: `heroku config`

### Error de base de datos
1. Verificar DATABASE_URL en Heroku
2. Ejecutar migraciones: `npm run migrate`
3. Ver logs para el error específico

### Bot responde con error
1. Ver logs de Heroku para el stack trace
2. Verificar que OPENAI_API_KEY sea válida
3. Verificar que no haya alcanzado límite de tokens

---

## 📞 Contacto

**Desarrollado para:** Afrodita Spa  
**Administrador:** Diego  
**Teléfono Admin:** 0987770788  
**Bot WhatsApp:** 0983370228

---

*Última actualización: 29 de Noviembre, 2025*  
*Versión actual: v47 (estable)*
