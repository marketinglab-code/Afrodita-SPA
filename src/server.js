/**
 * Server Principal - Afrodita Spa / ANICA
 * Sistema de agendamiento por WhatsApp
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import db from './database/database.js';
import wassengerWebhook from './webhook/wassenger.js';
import partialForm from './servicios/partial-reservation-form.js';
import botSwitch from './utils/bot-switch.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet()); // Seguridad
app.use(cors()); // CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded

// Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'ANICA - Afrodita Spa Scheduling System',
    status: 'active',
    botEnabled: botSwitch.isEnabled(),
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    const dbHealthy = db.isHealthy ? db.isHealthy() : true;
    
    res.json({
      status: 'healthy',
      database: dbHealthy ? 'connected' : 'disconnected',
      botEnabled: botSwitch.isEnabled(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Bot Control Endpoints (protegidos con secret)
app.post('/bot/enable', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  await botSwitch.enable();
  res.json({ 
    status: 'enabled',
    message: 'ANICA activada exitosamente (persistido en DB)'
  });
});

app.post('/bot/disable', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  await botSwitch.disable();
  res.json({ 
    status: 'disabled',
    message: 'ANICA desactivada exitosamente (persistido en DB)'
  });
});

app.post('/bot/toggle', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const newState = await botSwitch.toggle();
  res.json({ 
    status: newState ? 'enabled' : 'disabled',
    message: newState ? 'ANICA activada (persistido)' : 'ANICA desactivada (persistido)'
  });
});

app.get('/bot/status', (req, res) => {
  res.json({
    enabled: botSwitch.isEnabled(),
    status: botSwitch.isEnabled() ? 'active' : 'inactive'
  });
});

// Wassenger webhook (múltiples rutas para compatibilidad)
app.use('/webhook/wassenger', wassengerWebhook);
app.use('/webhook', wassengerWebhook); // Redirección para compatibilidad

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// STARTUP
// ============================================

const startServer = async () => {
  try {
    console.log('\n🚀 Iniciando ANICA - Sistema de Agendamiento Afrodita Spa...\n');
    
    // Inicializar base de datos
    console.log('📊 Conectando a PostgreSQL...');
    await db.initDatabase();
    
    // Limpiar formularios expirados al inicio
    console.log('🧹 Limpiando formularios expirados...');
    const cleaned = await partialForm.cleanExpiredForms();
    console.log(`   Eliminados: ${cleaned} formularios expirados`);
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\n✅ Servidor ANICA activo en puerto ${PORT}`);
      console.log(`📱 Webhook: http://localhost:${PORT}/webhook/wassenger`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`\n🎀 Sistema listo para recibir mensajes\n`);
    });
    
    // Tarea periódica: limpiar formularios expirados cada 30 minutos
    setInterval(async () => {
      try {
        const cleaned = await partialForm.cleanExpiredForms();
        if (cleaned > 0) {
          console.log(`🧹 Limpieza automática: ${cleaned} formularios expirados eliminados`);
        }
      } catch (error) {
        console.error('❌ Error en limpieza automática:', error);
      }
    }, 30 * 60 * 1000); // 30 minutos
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const shutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} recibido. Cerrando servidor...`);
  
  try {
    // Cerrar conexión a base de datos
    if (db.close) {
      await db.close();
    }
    
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el cierre:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// ============================================
// START
// ============================================

startServer();
