# 🤖 Sistema de Activación/Desactivación de ANICA

Este sistema permite **alternar** entre ANICA y otro bot en el **mismo número de WhatsApp**.

## 🎯 Cómo Funciona

1. **Por defecto**: ANICA está **ACTIVA** (responde a todos los mensajes)
2. **Cuando desactivas ANICA**: Los mensajes se reciben pero **no se procesan**
3. **Activas el otro bot**: El otro sistema empieza a responder
4. **Vuelves a activar ANICA**: Desactivas el otro bot y ANICA vuelve a funcionar

## 📋 Configuración Inicial

### 1. Agregar variable de entorno en Heroku

```bash
heroku config:set BOT_ACTIVE=true ADMIN_SECRET="tu-secret-super-seguro-aqui" -a anica-gpt
```

**IMPORTANTE**: Cambia `"tu-secret-super-seguro-aqui"` por una contraseña fuerte y única.

### 2. Configurar el script de control

```bash
# En tu terminal local
export ADMIN_SECRET="tu-secret-super-seguro-aqui"
export ANICA_SERVER_URL="https://anica-gpt.herokuapp.com"

# Hacer el script ejecutable
chmod +x scripts/bot-control.sh
```

## 🚀 Uso

### Desde tu computadora (terminal)

```bash
# Ver estado actual
./scripts/bot-control.sh status

# Activar ANICA (desconecta el otro bot primero)
./scripts/bot-control.sh enable

# Desactivar ANICA (luego conecta el otro bot)
./scripts/bot-control.sh disable

# Alternar estado
./scripts/bot-control.sh toggle
```

### Desde cualquier lugar (API REST)

**Ver estado** (público):
```bash
curl https://anica-gpt.herokuapp.com/bot/status
```

**Activar ANICA**:
```bash
curl -X POST https://anica-gpt.herokuapp.com/bot/enable \
  -H "x-admin-secret: tu-secret-aqui"
```

**Desactivar ANICA**:
```bash
curl -X POST https://anica-gpt.herokuapp.com/bot/disable \
  -H "x-admin-secret: tu-secret-aqui"
```

**Alternar estado**:
```bash
curl -X POST https://anica-gpt.herokuapp.com/bot/toggle \
  -H "x-admin-secret: tu-secret-aqui"
```

## 📱 Workflow Recomendado

### Para cambiar de ANICA → Otro Bot

1. **Desactiva ANICA**:
   ```bash
   ./scripts/bot-control.sh disable
   ```
   
2. **Verifica que está desactivada**:
   ```bash
   ./scripts/bot-control.sh status
   # Debe decir: "⏸️ ANICA está DESACTIVADA"
   ```

3. **Activa el otro bot** en su plataforma

### Para cambiar de Otro Bot → ANICA

1. **Desactiva el otro bot** en su plataforma

2. **Activa ANICA**:
   ```bash
   ./scripts/bot-control.sh enable
   ```
   
3. **Verifica**:
   ```bash
   ./scripts/bot-control.sh status
   # Debe decir: "✅ ANICA está ACTIVA"
   ```

## 🔒 Seguridad

- Los endpoints de control están **protegidos** con `ADMIN_SECRET`
- Solo quien tenga el secret puede activar/desactivar
- El endpoint de status es **público** (solo lectura)
- **NUNCA** compartas tu `ADMIN_SECRET`

## ⚠️ Importante

- Cuando ANICA está desactivada:
  - Los webhooks de Wassenger se reciben pero **se ignoran**
  - No se envía ninguna respuesta automática
  - El servidor sigue funcionando normalmente
  
- Asegúrate de **desactivar un bot antes de activar el otro** para evitar respuestas duplicadas

## 🎨 Verificar desde el Navegador

Abre: `https://anica-gpt.herokuapp.com/`

Verás algo como:
```json
{
  "service": "ANICA - Afrodita Spa Scheduling System",
  "status": "active",
  "botEnabled": true,
  "version": "1.0.0",
  "timestamp": "2025-11-25T..."
}
```

El campo `"botEnabled"` te dice si está activa o no.
