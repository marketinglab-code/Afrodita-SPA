/**
 * ANICA Orchestrator - Orquestador Principal
 * Coordina todo el flujo de agendamiento
 */

import OpenAI from 'openai';
import db from '../database/database.js';
import { buildSystemPrompt, formatReservationSummary, getDiscretionMessage } from '../anica/prompt-sistema-anica.js';
import partialForm from '../servicios/partial-reservation-form.js';
import reservationState from '../servicios/reservation-state.js';
import payments from '../servicios/payments.js';
import handoff from '../servicios/handoff-modelo.js';
import googleCalendar from '../servicios/google-calendar.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Normaliza texto: lowercase, quitar acentos, espacios duplicados
 */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/\s+/g, ' ') // Espacios duplicados
    .trim();
};

/**
 * Detecta el código de modelo en el mensaje inicial
 * Busca patrones como "quiero una cita con AN01" o "hola quiero ver a AN01"
 */
const detectModelCode = async (message) => {
  const normalized = normalizeText(message);
  
  // Obtener todos los modelos activos
  const models = await db.getAllActiveModels();
  
  // Buscar coincidencia de código
  for (const model of models) {
    const code = model.code.toLowerCase();
    if (normalized.includes(code)) {
      return model;
    }
    
    // También buscar por nombre
    const name = normalizeText(model.display_name);
    if (normalized.includes(name)) {
      return model;
    }
  }
  
  return null;
};

/**
 * Procesa un mensaje entrante de WhatsApp
 */
export const processIncomingMessage = async (messageData) => {
  const { phone, message, displayName, timestamp } = messageData;
  
  try {
    console.log(`📱 Mensaje recibido de ${phone}: ${message}`);
    
    // 1. Obtener o crear usuario
    let user = await db.getUserByPhone(phone);
    if (!user) {
      user = await db.createUser({
        phone_number: phone,
        whatsapp_display_name: displayName
      });
      console.log(`✨ Nuevo usuario creado: ${phone}`);
    } else {
      await db.incrementConversationCount(phone);
    }
    
    // 2. Guardar mensaje entrante
    await db.saveInteraction({
      user_phone: phone,
      agent_name: 'ANICA',
      direction: 'in',
      type: 'text',
      message_text: message
    });
    
    await db.saveConversationMessage(phone, 'user', message);
    
    // 3. Verificar cooldown (acaba de confirmar una reserva?)
    const cooldownCheck = await reservationState.canStartNewReservation(phone);
    const isInCooldown = !cooldownCheck.canStart;
    const recentReservation = cooldownCheck.recentReservation;
    
    // Si está en cooldown, analizar si es consulta o nueva reserva
    let allowNewReservation = true;
    if (isInCooldown) {
      const cooldownAnalysis = await reservationState.handleCooldownMessage(phone, message);
      
      if (cooldownAnalysis.isQuery && !cooldownAnalysis.isNewRequest) {
        // Es una consulta sobre la reserva existente
        allowNewReservation = false;
      } else if (cooldownAnalysis.isNewRequest) {
        // Explícitamente pide nueva reserva
        allowNewReservation = true;
      }
    }
    
    // 4. Obtener formulario parcial existente
    let currentForm = await partialForm.getPartialForm(phone);
    
    // 5. Detectar código de modelo (si no existe en el formulario)
    if (!currentForm || !currentForm.data.model_code) {
      const detectedModel = await detectModelCode(message);
      
      if (detectedModel) {
        console.log(`🎀 Modelo detectada: ${detectedModel.code}`);
        
        if (currentForm) {
          currentForm.data.model_code = detectedModel.code;
          await partialForm.savePartialForm(phone, currentForm.data);
        } else {
          await partialForm.savePartialForm(phone, { model_code: detectedModel.code });
          currentForm = await partialForm.getPartialForm(phone);
        }
      }
    }
    
    // 6. Extraer datos del mensaje actual
    const extractedData = partialForm.extractDataFromMessage(message);
    
    if (Object.keys(extractedData).length > 0 && allowNewReservation) {
      console.log(`📝 Datos extraídos:`, extractedData);
      
      if (currentForm) {
        Object.assign(currentForm.data, extractedData);
        await partialForm.savePartialForm(phone, currentForm.data);
      } else {
        await partialForm.savePartialForm(phone, extractedData);
        currentForm = await partialForm.getPartialForm(phone);
      }
    }
    
    // 7. Preparar contexto para ANICA
    const conversationHistory = await db.getConversationHistory(phone, 10);
    const upcomingReservations = await db.getUpcomingReservations(phone);
    const availableModels = await db.getAllActiveModels();
    
    const context = {
      user,
      pendingForm: currentForm,
      recentReservation: isInCooldown ? recentReservation : null,
      upcomingReservations,
      conversationHistory,
      isInCooldown: isInCooldown && !allowNewReservation,
      availableModels
    };
    
    // 8. Generar prompt de sistema
    const systemPrompt = buildSystemPrompt(context, message);
    
    // 9. Llamar a OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.8,
      max_tokens: 500
    });
    
    const anicaResponse = aiResponse.choices[0].message.content;
    
    console.log(`🤖 ANICA responde: ${anicaResponse}`);
    
    // 10. Guardar respuesta
    await db.saveConversationMessage(phone, 'assistant', anicaResponse, 'ANICA');
    
    await db.saveInteraction({
      user_phone: phone,
      agent_name: 'ANICA',
      direction: 'out',
      type: 'text',
      message_text: anicaResponse
    });
    
    // 11. Detectar confirmación explícita
    const isConfirmation = detectConfirmation(message);
    const formComplete = currentForm && partialForm.isFormComplete(currentForm.data);
    
    if (isConfirmation && formComplete && allowNewReservation) {
      console.log(`✅ Confirmación detectada - Procesando reserva...`);
      
      const confirmationResult = await confirmReservation(phone, currentForm.data, user);
      
      return {
        response: confirmationResult.message,
        reservationCreated: true,
        reservation: confirmationResult.reservation
      };
    }
    
    return {
      response: anicaResponse,
      reservationCreated: false
    };
    
  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
    
    return {
      response: 'Disculpa, tuve un problema técnico. ¿Podrías repetir tu mensaje? 🙏',
      error: error.message
    };
  }
};

/**
 * Detecta si el mensaje es una confirmación explícita
 */
const detectConfirmation = (message) => {
  const normalized = normalizeText(message);
  
  const confirmationKeywords = [
    'si', 'sí', 'confirmo', 'confirma', 'dale', 'ok', 'okay',
    'perfecto', 'correcto', 'exacto', 'así es', 'eso es',
    'claro', 'seguro', 'va', 'sale', 'listo'
  ];
  
  // Debe ser un mensaje corto (confirmaciones suelen ser breves)
  if (message.length > 100) {
    return false;
  }
  
  return confirmationKeywords.some(kw => normalized === kw || normalized.startsWith(kw));
};

/**
 * Confirma y crea la reserva
 */
const confirmReservation = async (phoneNumber, formData, user) => {
  try {
    // 1. Calcular precio total
    const priceCalc = payments.calculateTotalPrice(formData.service_type, formData.payment_method);
    
    // 2. Obtener modelo
    const model = await db.getModelByCode(formData.model_code);
    
    if (!model) {
      throw new Error(`Modelo no encontrada: ${formData.model_code}`);
    }
    
    // 3. Crear reserva
    const reservationData = {
      ...partialForm.formToReservation(formData, phoneNumber),
      total_price: priceCalc.total,
      was_free: false
    };
    
    const reservation = await db.createReservation(reservationData);
    
    console.log(`🎉 Reserva creada: ID ${reservation.id}`);
    
    // 4. Crear evento en Google Calendar (async, no bloqueante)
    googleCalendar.createCalendarEvent(reservation, model, user, adminNotifyCallback)
      .then(eventId => {
        if (eventId) {
          db.updateReservation(reservation.id, { calendar_event_id: eventId })
            .catch(err => console.error('❌ Error actualizando calendar_event_id:', err));
        }
      })
      .catch(err => console.error('❌ Error creando evento Calendar:', err));
    
    // 5. Activar cooldown
    await reservationState.activateCooldown(phoneNumber, reservation.id);
    
    // 5. Limpiar formulario parcial
    await partialForm.clearPartialForm(phoneNumber);
    
    // 6. Obtener historial de conversación para handoff
    const conversationHistory = await db.getConversationHistory(phoneNumber, 10);
    
    // 7. Notificar a la modelo (async, no bloqueante)
    handoff.notifyModel(reservation, user, model, conversationHistory)
      .catch(err => console.error('❌ Error notificando a modelo:', err));
    
    // 8. Generar mensajes de confirmación
    let confirmationMessage = `🎉 *¡Reserva confirmada!*\n\n`;
    confirmationMessage += formatReservationSummary(reservation, false);
    confirmationMessage += `\n${payments.generatePriceBreakdown(priceCalc)}`;
    confirmationMessage += `\n${payments.generatePaymentInstructions(priceCalc)}`;
    confirmationMessage += `\n\n${getDiscretionMessage()}`;
    
    return {
      success: true,
      reservation,
      message: confirmationMessage
    };
    
  } catch (error) {
    console.error('❌ Error confirmando reserva:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Ups, hubo un problema al confirmar tu reserva. Por favor intenta de nuevo o escríbeme "ayuda". 💙'
    };
  }
};

/**
 * Procesa un comprobante de pago (imagen)
 */
export const processPaymentProof = async (phoneNumber, imageUrl) => {
  try {
    console.log(`💳 Procesando comprobante de pago de ${phoneNumber}`);
    
    // 1. Obtener reserva más reciente pendiente de pago
    const reservations = await db.getUserReservations(phoneNumber, 'pending');
    
    if (reservations.length === 0) {
      return {
        response: 'No encontré ninguna reserva pendiente de pago. ¿Necesitas ayuda? 🤔'
      };
    }
    
    const reservation = reservations[0];
    
    // 2. Validar comprobante con OpenAI Vision
    const validation = await payments.validatePaymentProof(imageUrl, reservation.total_price);
    
    console.log(`🔍 Validación de comprobante:`, validation);
    
    // 3. Procesar resultado
    if (validation.valid && validation.amountMatches) {
      // Pago válido
      await payments.processPayment(reservation.id, {
        validation,
        method: reservation.payment_method,
        imageUrl
      });
      
      // Confirmar reserva
      await db.confirmReservation(reservation.id);
      
      // Notificar a modelo
      const model = await db.getModelByCode(reservation.model_code);
      if (model) {
        handoff.notifyPaymentUpdate(reservation, model, 'paid')
          .catch(err => console.error('❌ Error notificando pago:', err));
      }
      
      return {
        response: payments.generatePaymentSuccessMessage(reservation),
        paymentConfirmed: true
      };
      
    } else {
      // Pago no válido
      return {
        response: payments.generatePaymentFailureMessage(validation.notes),
        paymentConfirmed: false
      };
    }
    
  } catch (error) {
    console.error('❌ Error procesando comprobante:', error);
    
    return {
      response: 'Tuve un problema al validar tu comprobante. Por favor intenta de nuevo o escríbeme "ayuda con mi pago". 💙',
      error: error.message
    };
  }
};

/**
 * Maneja imágenes entrantes
 */
export const processIncomingImage = async (messageData) => {
  const { phone, imageUrl, caption } = messageData;
  
  try {
    // Guardar interacción
    await db.saveInteraction({
      user_phone: phone,
      agent_name: 'ANICA',
      direction: 'in',
      type: 'image',
      payload: { imageUrl, caption }
    });
    
    // Asumir que es un comprobante de pago
    return await processPaymentProof(phone, imageUrl);
    
  } catch (error) {
    console.error('❌ Error procesando imagen:', error);
    
    return {
      response: 'Recibí tu imagen pero tuve un problema al procesarla. ¿Podrías reenviarla? 📸'
    };
  }
};

// Variable para guardar el callback de notificación al admin
let adminNotifyCallback = null;

/**
 * Registra el callback de notificación al administrador
 */
export const setAdminNotifyCallback = (callback) => {
  adminNotifyCallback = callback;
};

export default {
  processIncomingMessage,
  processPaymentProof,
  processIncomingImage,
  normalizeText,
  detectModelCode,
  setAdminNotifyCallback
};
