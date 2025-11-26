/**
 * Handoff to Model Service
 * Envía notificación a la modelo cuando se confirma una reserva
 */

import axios from 'axios';

const WASSENGER_API_KEY = process.env.WASSENGER_API_KEY;
const WASSENGER_DEVICE_ID = process.env.WASSENGER_DEVICE_ID;
const WASSENGER_API_URL = 'https://api.wassenger.com/v1';

/**
 * Envía un mensaje de WhatsApp a través de Wassenger
 */
const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // Formatear número para WhatsApp (remover espacios, guiones, etc.)
    let formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Agregar código de país +593 si no lo tiene (Ecuador)
    if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('593')) {
      // Si empieza con 0, removerlo y agregar +593
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+593' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+593' + formattedPhone;
      }
    } else if (formattedPhone.startsWith('593')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    console.log(`📞 Enviando mensaje a: ${formattedPhone}`);
    
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
    
    return {
      success: true,
      messageId: response.data.id || response.data._id,
      data: response.data
    };
    
  } catch (error) {
    console.error('❌ Error enviando mensaje WhatsApp:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
};

/**
 * Genera el mensaje de notificación para la modelo
 */
const generateModelNotification = (reservation, user, conversationSummary = null) => {
  let message = `🔔 *Nueva Reserva - Afrodita Spa*\n\n`;
  
  message += `👤 *Cliente:*\n`;
  message += `- Nombre: ${user.name || 'No especificado'}\n`;
  message += `- Teléfono: ${reservation.user_phone}\n`;
  message += `- WhatsApp: ${user.whatsapp_display_name || 'N/A'}\n\n`;
  
  message += `📋 *Detalles de la Cita:*\n`;
  message += `- Servicio: ${getServiceName(reservation.service_type)}\n`;
  message += `- Duración: ${reservation.duration_hours}h\n`;
  message += `- Fecha: ${formatDate(reservation.date)}\n`;
  message += `- Hora: ${reservation.start_time}\n`;
  message += `- Ciudad: ${reservation.city}\n\n`;
  
  message += `💰 *Pago:*\n`;
  message += `- Método: ${getPaymentMethodName(reservation.payment_method)}\n`;
  message += `- Total: $${reservation.total_price}\n`;
  message += `- Estado: ${getPaymentStatusName(reservation.payment_status)}\n\n`;
  
  if (conversationSummary) {
    message += `💬 *Resumen de la conversación:*\n`;
    message += `${conversationSummary}\n\n`;
  }
  
  message += `🔗 *ID Reserva:* ${reservation.id}\n`;
  message += `📅 *Creada:* ${new Date(reservation.created_at).toLocaleString('es-EC')}\n\n`;
  
  message += `✨ *Afrodita Spa* - Sistema ANICA`;
  
  return message;
};

/**
 * Envía notificación a la modelo cuando se confirma una reserva
 */
export const notifyModel = async (reservation, user, model, conversationHistory = []) => {
  if (!model || !model.phone_number) {
    console.error('❌ No se puede notificar: modelo sin teléfono');
    return {
      success: false,
      error: 'Model phone number not found'
    };
  }
  
  // Generar resumen de la conversación (últimos 5 mensajes relevantes)
  const conversationSummary = generateConversationSummary(conversationHistory);
  
  // Generar mensaje
  const message = generateModelNotification(reservation, user, conversationSummary);
  
  // Enviar mensaje
  const result = await sendWhatsAppMessage(model.phone_number, message);
  
  if (result.success) {
    console.log(`✅ Notificación enviada a modelo ${model.code} (${model.phone_number})`);
  } else {
    console.error(`❌ Error notificando a modelo ${model.code}:`, result.error);
  }
  
  return result;
};

/**
 * Genera un resumen breve de la conversación
 */
const generateConversationSummary = (conversationHistory) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    return 'Sin conversación previa';
  }
  
  // Tomar últimos 5 mensajes del usuario
  const userMessages = conversationHistory
    .filter(msg => msg.role === 'user')
    .slice(-5)
    .map(msg => msg.content);
  
  if (userMessages.length === 0) {
    return 'Sin mensajes del cliente';
  }
  
  // Resumen simple
  let summary = '';
  userMessages.forEach((msg, index) => {
    summary += `${index + 1}. ${msg.substring(0, 80)}${msg.length > 80 ? '...' : ''}\n`;
  });
  
  return summary;
};

/**
 * Helper: Obtiene el nombre legible del servicio
 */
const getServiceName = (serviceType) => {
  const names = {
    MOMENTO_15: 'Momento 15 minutos',
    MEDIA_HORA: 'Media hora',
    MIN45: '45 minutos',
    HORA1: '1 hora',
    SALIDA1: 'Salidas 1 hora',
    SALIDA2: 'Salidas 2 horas',
    SALIDA3: 'Salidas 3 horas'
  };
  return names[serviceType] || serviceType;
};

/**
 * Helper: Obtiene el nombre legible del método de pago
 */
const getPaymentMethodName = (method) => {
  const names = {
    transferencia: 'Transferencia',
    tarjeta: 'Tarjeta',
    efectivo: 'Efectivo'
  };
  return names[method] || method;
};

/**
 * Helper: Obtiene el nombre legible del estado de pago
 */
const getPaymentStatusName = (status) => {
  const names = {
    pending: 'Pendiente ⏳',
    paid: 'Pagado ✅',
    failed: 'Fallido ❌'
  };
  return names[status] || status;
};

/**
 * Helper: Formatea una fecha
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Envía actualización de estado de pago a la modelo
 */
export const notifyPaymentUpdate = async (reservation, model, paymentStatus) => {
  if (!model || !model.phone_number) {
    return { success: false, error: 'Model phone number not found' };
  }
  
  let message = `💳 *Actualización de Pago*\n\n`;
  message += `🔗 Reserva #${reservation.id}\n`;
  message += `👤 Cliente: ${reservation.user_phone}\n`;
  message += `📅 Fecha: ${formatDate(reservation.date)} - ${reservation.start_time}\n\n`;
  
  if (paymentStatus === 'paid') {
    message += `✅ *PAGO CONFIRMADO*\n`;
    message += `Monto: $${reservation.total_price}\n\n`;
    message += `La cita está 100% confirmada. 🎉`;
  } else if (paymentStatus === 'failed') {
    message += `❌ *PAGO FALLIDO*\n`;
    message += `El cliente tendrá que intentar nuevamente.`;
  } else {
    message += `⏳ Estado: ${getPaymentStatusName(paymentStatus)}`;
  }
  
  return await sendWhatsAppMessage(model.phone_number, message);
};

/**
 * Notifica a la modelo sobre una cancelación
 */
export const notifyCancellation = async (reservation, model, reason = null) => {
  if (!model || !model.phone_number) {
    return { success: false, error: 'Model phone number not found' };
  }
  
  let message = `🚫 *Reserva Cancelada*\n\n`;
  message += `🔗 Reserva #${reservation.id}\n`;
  message += `👤 Cliente: ${reservation.user_phone}\n`;
  message += `📅 Fecha: ${formatDate(reservation.date)} - ${reservation.start_time}\n`;
  message += `⏱ Servicio: ${getServiceName(reservation.service_type)}\n\n`;
  
  if (reason) {
    message += `📝 Motivo: ${reason}\n\n`;
  }
  
  message += `La cita ha sido cancelada.`;
  
  return await sendWhatsAppMessage(model.phone_number, message);
};

export default {
  notifyModel,
  notifyPaymentUpdate,
  notifyCancellation,
  sendWhatsAppMessage
};
