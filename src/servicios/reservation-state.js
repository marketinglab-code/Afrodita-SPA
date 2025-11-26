/**
 * Reservation State Service
 * Maneja el cooldown de 10 minutos post-confirmación
 */

import db from '../database/database.js';

const COOLDOWN_MINUTES = parseInt(process.env.RESERVATION_COOLDOWN_MINUTES || '10');

/**
 * Verifica si el usuario está en período de cooldown
 * (ha confirmado una reserva en los últimos N minutos)
 */
export const isInCooldown = async (phoneNumber) => {
  const state = await db.getReservationState(phoneNumber);
  
  if (!state || !state.just_confirmed_until) {
    return false;
  }
  
  const now = new Date();
  const cooldownEnd = new Date(state.just_confirmed_until);
  
  return now < cooldownEnd;
};

/**
 * Obtiene el estado de reserva del usuario
 */
export const getReservationState = async (phoneNumber) => {
  const state = await db.getReservationState(phoneNumber);
  
  if (!state) {
    return null;
  }
  
  const now = new Date();
  const cooldownEnd = state.just_confirmed_until ? new Date(state.just_confirmed_until) : null;
  const isActive = cooldownEnd && now < cooldownEnd;
  
  return {
    isInCooldown: isActive,
    cooldownEndsAt: cooldownEnd,
    lastReservationId: state.last_reservation_id,
    minutesRemaining: isActive ? Math.ceil((cooldownEnd - now) / 1000 / 60) : 0
  };
};

/**
 * Activa el cooldown después de confirmar una reserva
 */
export const activateCooldown = async (phoneNumber, reservationId) => {
  await db.setReservationCooldown(phoneNumber, reservationId, COOLDOWN_MINUTES);
  
  console.log(`✅ Cooldown activado para ${phoneNumber} - ${COOLDOWN_MINUTES} minutos`);
};

/**
 * Obtiene la última reserva del usuario si está en cooldown
 */
export const getRecentReservation = async (phoneNumber) => {
  const state = await getReservationState(phoneNumber);
  
  if (!state || !state.isInCooldown || !state.lastReservationId) {
    return null;
  }
  
  return await db.getReservationById(state.lastReservationId);
};

/**
 * Limpia el cooldown manualmente (útil para testing o casos especiales)
 */
export const clearCooldown = async (phoneNumber) => {
  const state = await db.getReservationState(phoneNumber);
  
  if (state) {
    await db.query(
      `UPDATE reservation_state 
       SET just_confirmed_until = NULL
       WHERE user_phone = ?`,
      [phoneNumber]
    );
    
    console.log(`🧹 Cooldown limpiado para ${phoneNumber}`);
  }
};

/**
 * Verifica si el usuario puede iniciar un nuevo proceso de agendamiento
 * Retorna un objeto con el resultado y contexto
 */
export const canStartNewReservation = async (phoneNumber) => {
  const inCooldown = await isInCooldown(phoneNumber);
  
  if (!inCooldown) {
    return {
      canStart: true,
      reason: null,
      recentReservation: null
    };
  }
  
  const state = await getReservationState(phoneNumber);
  const recentReservation = await getRecentReservation(phoneNumber);
  
  return {
    canStart: false,
    reason: 'in_cooldown',
    recentReservation,
    minutesRemaining: state.minutesRemaining,
    message: `Acabas de confirmar una reserva hace unos minutos. Si necesitas modificarla o tienes dudas, cuéntame. Para una nueva cita, espera ${state.minutesRemaining} minuto(s) más.`
  };
};

/**
 * Maneja la lógica de decisión cuando el usuario envía un mensaje durante cooldown
 * Determina si es una consulta sobre la reserva existente o intento de nueva reserva
 */
export const handleCooldownMessage = async (phoneNumber, message) => {
  const lowerMessage = message.toLowerCase();
  
  // Palabras clave que indican consulta sobre reserva existente
  const queryKeywords = [
    'dónde', 'donde', 'cuándo', 'cuando', 'hora', 'dirección', 'direccion',
    'ubicación', 'ubicacion', 'confirmación', 'confirmacion', 'comprobante',
    'pago', 'precio', 'costo', 'cambiar', 'modificar', 'cancelar'
  ];
  
  // Palabras clave que indican nueva reserva
  const newReservationKeywords = [
    'nueva cita', 'otra cita', 'nuevo', 'nueva', 'otra', 'más', 'mas',
    'adicional', 'también', 'tambien'
  ];
  
  const isQuery = queryKeywords.some(kw => lowerMessage.includes(kw));
  const isNewRequest = newReservationKeywords.some(kw => lowerMessage.includes(kw));
  
  const state = await getReservationState(phoneNumber);
  const recentReservation = await getRecentReservation(phoneNumber);
  
  return {
    isQuery,
    isNewRequest,
    shouldAllowNewReservation: isNewRequest, // Permite explícitamente si pide nueva
    recentReservation,
    state
  };
};

/**
 * Extiende el cooldown (útil si el usuario está haciendo cambios)
 */
export const extendCooldown = async (phoneNumber, additionalMinutes = 5) => {
  const state = await db.getReservationState(phoneNumber);
  
  if (state && state.last_reservation_id) {
    const newCooldownMinutes = COOLDOWN_MINUTES + additionalMinutes;
    await db.setReservationCooldown(phoneNumber, state.last_reservation_id, newCooldownMinutes);
    
    console.log(`⏰ Cooldown extendido para ${phoneNumber} - +${additionalMinutes} minutos`);
  }
};

export default {
  COOLDOWN_MINUTES,
  isInCooldown,
  getReservationState,
  activateCooldown,
  getRecentReservation,
  clearCooldown,
  canStartNewReservation,
  handleCooldownMessage,
  extendCooldown
};
