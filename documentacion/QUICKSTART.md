# 🚀 Quick Start - ANICA

Guía rápida para poner en marcha el sistema ANICA en 5 minutos.

## ⚡ Setup Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env  # o usa tu editor favorito
```

**Mínimo requerido para empezar:**

```env
DATABASE_URL=postgres://usuario:password@localhost:5432/afrodita
OPENAI_API_KEY=sk-tu-key-aqui
WASSENGER_API_KEY=tu-key-aqui
WASSENGER_DEVICE_ID=tu-device-id
AFRODITA_WHATSAPP_NUMBER=0983370228
```

### 3. Crear base de datos

```bash
# PostgreSQL local
createdb afrodita

# O usa Heroku Postgres (ver DEPLOYMENT.md)
```

### 4. Ejecutar migraciones

```bash
npm run migrate
```

Verás:
```
🚀 Ejecutando migraciones...
📂 Encontrados 1 archivo(s) de migración:
   📄 001_initial_schema.sql
   ✅ Ejecutado correctamente
🎉 Todas las migraciones se ejecutaron correctamente
```

### 5. Iniciar servidor

**Desarrollo (con auto-reload):**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

Verás:
```
🚀 Iniciando ANICA - Sistema de Agendamiento Afrodita Spa...
📊 Conectando a PostgreSQL...
✅ PostgreSQL connected successfully
✅ Database service initialized
🧹 Limpiando formularios expirados...
   Eliminados: 0 formularios expirados
✅ Servidor ANICA activo en puerto 3000
📱 Webhook: http://localhost:3000/webhook/wassenger
🏥 Health: http://localhost:3000/health
🎀 Sistema listo para recibir mensajes
```

### 6. Verificar que funciona

```bash
# En otra terminal
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-25T..."
}
```

## 🧪 Probar el sistema

### Test 1: Simular mensaje de WhatsApp

```bash
curl -X POST http://localhost:3000/webhook/wassenger/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0987654321",
    "message": "hola, quiero una cita con AN01"
  }'
```

### Test 2: Ver estadísticas

```bash
npm run stats
```

### Test 3: Listar modelos

```bash
npm run cli list-models
```

Deberías ver la modelo AN01 pre-registrada.

## 📋 Comandos Útiles

```bash
# Ver estadísticas
npm run stats

# Limpiar formularios expirados
npm run clean

# Listar usuarios
npm run cli list-users

# Listar reservas
npm run cli list-reservations

# Agregar nueva modelo
npm run cli add-model AN02 "María Pérez" "0987654321" "Guayaquil"

# Ejecutar tests
npm test

# Ver ayuda CLI
npm run cli help
```

## 🔗 Siguiente: Configurar Wassenger

1. Ve a https://wassenger.com
2. Conecta tu número de WhatsApp
3. Copia API Key y Device ID
4. Configura el webhook: `http://tu-servidor.com/webhook/wassenger`
5. Prueba enviando un mensaje al número conectado

## 🎯 Flujo de Prueba Completo

1. **Usuario envía:** "hola, quiero una cita con AN01"
2. **ANICA responde:** Saludo y pregunta por el servicio
3. **Usuario:** "quiero la media hora"
4. **ANICA:** Pregunta por la fecha
5. **Usuario:** "para mañana"
6. **ANICA:** Pregunta por la hora
7. **Usuario:** "a las 8pm"
8. **ANICA:** Pregunta por la ciudad
9. **Usuario:** "Quito"
10. **ANICA:** Pregunta método de pago
11. **Usuario:** "transferencia"
12. **ANICA:** Muestra resumen completo
13. **Usuario:** "confirmo"
14. **ANICA:** Crea reserva, envía link de pago y desglose

## 🐛 Problemas Comunes

### Error: "Database connection failed"
```bash
# Verifica que PostgreSQL esté corriendo
pg_isready

# Verifica DATABASE_URL en .env
```

### Error: "OpenAI API error"
```bash
# Verifica tu API key
echo $OPENAI_API_KEY

# Verifica límites en platform.openai.com
```

### Puerto 3000 ya en uso
```bash
# Cambiar puerto en .env
PORT=3001
```

## 📚 Más Información

- **README.md** - Documentación completa
- **DEPLOYMENT.md** - Guía de deployment a producción
- **src/tests/** - Tests del sistema

## 💡 Tips

- Usa **nodemon** para desarrollo (incluido con `npm run dev`)
- Revisa logs en tiempo real: `tail -f logs/out.log`
- Para producción, usa **PM2**: `pm2 start ecosystem.config.json`

---

**¿Listo para producción?** Lee `DEPLOYMENT.md`

**🎀 ANICA - Sistema listo en minutos**
