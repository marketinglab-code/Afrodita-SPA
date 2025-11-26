/**
 * Wassenger Webhook Handler
 * Recibe mensajes de WhatsApp y los procesa con ANICA
 */

import express from 'express';
import axios from 'axios';
import orchestrator from '../orquestador/anica-orchestrator.js';
import botSwitch from '../utils/bot-switch.js';

const router = express.Router();

const WASSENGER_API_KEY = process.env.WASSENGER_API_KEY;
const WASSENGER_DEVICE_ID = process.env.WASSENGER_DEVICE_ID;
const WASSENGER_API_URL = 'https://api.wassenger.com/v1';
const WEBHOOK_SECRET = process.env.WASSENGER_WEBHOOK_SECRET;

/**
 * Envía un mensaje de respuesta a través de Wassenger
 */
const sendReply = async (phoneNumber, message) => {
  try {
    // 🛡️ PROTECCIÓN: Bloquear cualquier mensaje que mencione "Aurora" (bot anterior)
    if (message && message.toLowerCase().includes('aurora')) {
      console.error('🚫 BLOQUEADO: Intento de enviar mensaje con "Aurora"');
      console.error(`   Contenido: ${message.substring(0, 100)}...`);
      throw new Error('Mensaje bloqueado: contiene referencia a identidad incorrecta');
    }
    
    const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    const response = await axios.post(
      `${WASSENGER_API_URL}/messages`,
      {
        phone: formattedPhone,
        message: message,
        device: WASSENGER_DEVICE_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${WASSENGER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Mensaje enviado a ${phoneNumber}`);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Envía notificación al administrador
 */
const notifyAdmin = async (message) => {
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;
  
  if (!adminPhone) {
    console.warn('⚠️ ADMIN_PHONE_NUMBER no configurado, notificación no enviada');
    return;
  }
  
  try {
    await sendReply(adminPhone, message);
    console.log('✅ Notificación enviada al administrador');
  } catch (error) {
    console.error('❌ Error notificando al administrador:', error.message);
  }
};

/**
 * Verifica el webhook secret (si está configurado)
 */
const verifyWebhookSecret = (req) => {
  if (!WEBHOOK_SECRET) {
    return true; // No hay secret configurado, permitir
  }
  
  const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;
  return providedSecret === WEBHOOK_SECRET;
};

/**
 * POST /webhook/wassenger
 * Recibe mensajes entrantes de Wassenger
 */
router.post('/', async (req, res) => {
  try {
    // Verificar secret
    if (!verifyWebhookSecret(req)) {
      console.warn('⚠️ Webhook secret inválido');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const payload = req.body;
    
    console.log('📨 Webhook recibido:', JSON.stringify(payload, null, 2));
    
    // Extraer datos del mensaje según formato de Wassenger
    const {
      event,
      data
    } = payload;
    
    // Solo procesar mensajes entrantes (acepta message:in, message:in:new, etc.)
    if (!event || (!event.startsWith('message:in') && event !== 'message')) {
      console.log(`ℹ️ Evento ignorado: ${event}`);
      return res.status(200).json({ status: 'ignored', event });
    }
    
    // Extraer información del mensaje
    const phone = data.fromNumber || data.from || data.phone;
    const messageText = data.body || data.message || data.text;
    const displayName = data.fromName || data.displayName || data.name;
    const messageType = data.type || 'text';
    const timestamp = data.timestamp || Date.now();
    
    if (!phone) {
      console.error('❌ No se pudo extraer el número de teléfono');
      return res.status(400).json({ error: 'Phone number not found' });
    }
    
    // ⚡ Verificar si el bot está activo
    if (!botSwitch.isEnabled()) {
      console.log('⏸️ Bot desactivado - Mensaje ignorado');
      return res.status(200).json({ 
        status: 'inactive',
        message: 'Bot temporalmente desactivado'
      });
    }
    
    // Responder inmediatamente al webhook
    res.status(200).json({ 
      status: 'received',
      phone,
      timestamp: new Date().toISOString()
    });
    
    // Procesar mensaje de forma asíncrona
    processMessageAsync(phone, messageText, displayName, messageType, data);
    
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cache de mensajes procesados (evitar duplicados de Wassenger)
const processedMessages = new Set();
const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutos

// Limpiar cache periódicamente
setInterval(() => {
  processedMessages.clear();
}, CACHE_EXPIRATION);

/**
 * Procesa el mensaje de forma asíncrona
 */
const processMessageAsync = async (phone, message, displayName, messageType, rawData) => {
  try {
    // Crear identificador único del mensaje
    const messageId = rawData.id || `${phone}_${message}_${Date.now()}`;
    
    // Verificar si ya procesamos este mensaje
    if (processedMessages.has(messageId)) {
      console.log(`⏭️ Mensaje duplicado ignorado: ${messageId}`);
      return;
    }
    
    // Marcar mensaje como procesado
    processedMessages.add(messageId);
    
    // Registrar el callback de notificación al admin antes de procesar
    orchestrator.setAdminNotifyCallback(notifyAdmin);
    
    let result;
    
    if (messageType === 'image' || rawData.mediaUrl) {
      // Procesar imagen (comprobante de pago)
      const imageUrl = rawData.mediaUrl || rawData.image || rawData.url;
      const caption = rawData.caption || message;
      
      result = await orchestrator.processIncomingImage({
        phone,
        imageUrl,
        caption,
        displayName
      });
      
    } else {
      // Procesar mensaje de texto
      result = await orchestrator.processIncomingMessage({
        phone,
        message,
        displayName,
        timestamp: Date.now()
      });
    }
    
    // Enviar respuesta
    if (result.response) {
      await sendReply(phone, result.response);
    }
    
  } catch (error) {
    console.error('❌ Error procesando mensaje async:', error);
    
    // Intentar enviar mensaje de error al usuario
    try {
      await sendReply(
        phone,
        'Disculpa, tuve un problema técnico. Por favor intenta de nuevo en un momento. 🙏'
      );
    } catch (sendError) {
      console.error('❌ Error enviando mensaje de error:', sendError);
    }
  }
};

/**
 * GET /webhook/wassenger
 * Verificación del webhook (si Wassenger lo requiere)
 */
router.get('/', (req, res) => {
  const challenge = req.query.challenge || req.query.hub_challenge;
  
  if (challenge) {
    return res.status(200).send(challenge);
  }
  
  res.status(200).json({
    status: 'active',
    service: 'ANICA Wassenger Webhook',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /webhook/wassenger/test
 * Endpoint de prueba para simular mensajes
 */
router.post('/test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message are required' });
    }
    
    const result = await orchestrator.processIncomingMessage({
      phone,
      message,
      displayName: 'Test User',
      timestamp: Date.now()
    });
    
    res.status(200).json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exportar funciones útiles
export { sendReply, notifyAdmin };

export default router;
