/**
 * Partial Reservation Form Service
 * Maneja el formulario progresivo con TTL de 120 minutos
 */

import db from '../database/database.js';

const TTL_MINUTES = parseInt(process.env.PENDING_FORM_TTL_MINUTES || '120');

/**
 * Campos requeridos para una reserva completa
 */
const REQUIRED_FIELDS = [
  'model_code',
  'service_type',
  'date',
  'start_time',
  'city',
  'payment_method'
];

/**
 * Servicios válidos con sus precios base
 */
export const SERVICES = {
  MOMENTO_15: { name: 'Momento 15 minutos', price: 30, duration: 0.25 },
  MEDIA_HORA: { name: 'Media hora', price: 35, duration: 0.5 },
  MIN45: { name: '45 minutos', price: 40, duration: 0.75 },
  HORA1: { name: '1 hora', price: 50, duration: 1 },
  SALIDA1: { name: 'Salidas 1 hora', price: 70, duration: 1 },
  SALIDA2: { name: 'Salidas 2 horas', price: 120, duration: 2 },
  SALIDA3: { name: 'Salidas 3 horas', price: 150, duration: 3 }
};

/**
 * Obtiene el formulario parcial actual del usuario
 */
export const getPartialForm = async (phoneNumber) => {
  const pending = await db.getPendingConfirmation(phoneNumber);
  
  if (!pending) {
    return null;
  }

  return {
    data: pending.form_json,
    expiresAt: pending.expires_at,
    isExpired: new Date(pending.expires_at) < new Date()
  };
};

/**
 * Guarda o actualiza el formulario parcial
 */
export const savePartialForm = async (phoneNumber, formData) => {
  // Validar que los campos sean del tipo correcto
  const sanitized = sanitizeFormData(formData);
  
  const existing = await db.getPendingConfirmation(phoneNumber);
  
  if (existing) {
    return await db.updatePendingConfirmation(phoneNumber, sanitized);
  } else {
    return await db.savePendingConfirmation(phoneNumber, sanitized, TTL_MINUTES);
  }
};

/**
 * Actualiza un campo específico del formulario
 */
export const updateFormField = async (phoneNumber, field, value) => {
  const current = await getPartialForm(phoneNumber);
  const formData = current ? current.data : {};
  
  formData[field] = value;
  
  return await savePartialForm(phoneNumber, formData);
};

/**
 * Actualiza múltiples campos del formulario
 */
export const updateFormFields = async (phoneNumber, updates) => {
  const current = await getPartialForm(phoneNumber);
  const formData = current ? current.data : {};
  
  Object.assign(formData, updates);
  
  return await savePartialForm(phoneNumber, formData);
};

/**
 * Verifica si el formulario está completo
 */
export const isFormComplete = (formData) => {
  if (!formData) return false;
  
  for (const field of REQUIRED_FIELDS) {
    if (!formData[field]) {
      return false;
    }
  }
  
  return true;
};

/**
 * Obtiene los campos que faltan
 */
export const getMissingFields = (formData) => {
  if (!formData) return REQUIRED_FIELDS;
  
  return REQUIRED_FIELDS.filter(field => !formData[field]);
};

/**
 * Obtiene el siguiente campo que falta
 */
export const getNextMissingField = (formData) => {
  const missing = getMissingFields(formData);
  return missing.length > 0 ? missing[0] : null;
};

/**
 * Limpia el formulario parcial del usuario
 */
export const clearPartialForm = async (phoneNumber) => {
  await db.deletePendingConfirmation(phoneNumber);
};

/**
 * Detecta información de un mensaje de texto del usuario
 * Usa patrones y NLP básico para extraer datos
 */
export const extractDataFromMessage = (message) => {
  const extracted = {};
  const lowerMessage = message.toLowerCase();
  
  // Detectar servicio (mejorado para reconocer más variaciones)
  if (lowerMessage.includes('momento') || lowerMessage.includes('15 min')) {
    extracted.service_type = 'MOMENTO_15';
  } else if (lowerMessage.includes('media hora') || lowerMessage.includes('30 min')) {
    extracted.service_type = 'MEDIA_HORA';
  } else if (lowerMessage.includes('45 min') || lowerMessage.includes('45min')) {
    extracted.service_type = 'MIN45';
  } else if (lowerMessage.includes('1 hora') || lowerMessage.includes('una hora') || lowerMessage.includes('1hora')) {
    extracted.service_type = 'HORA1';
  } else if (lowerMessage.match(/salida\s*(de)?\s*3\s*horas?/i) || lowerMessage.includes('salida 3') || lowerMessage.includes('salida tres')) {
    extracted.service_type = 'SALIDA3';
  } else if (lowerMessage.match(/salida\s*(de)?\s*2\s*horas?/i) || lowerMessage.includes('salida 2') || lowerMessage.includes('salida dos')) {
    extracted.service_type = 'SALIDA2';
  } else if (lowerMessage.match(/salida\s*(de)?\s*1\s*hora?/i) || lowerMessage.includes('salida 1') || lowerMessage.includes('salida una')) {
    extracted.service_type = 'SALIDA1';
  }
  
  // Detectar método de pago
  if (lowerMessage.includes('transferencia') || lowerMessage.includes('transfe')) {
    extracted.payment_method = 'transferencia';
  } else if (lowerMessage.includes('tarjeta') || lowerMessage.includes('card')) {
    extracted.payment_method = 'tarjeta';
  } else if (lowerMessage.includes('efectivo') || lowerMessage.includes('cash')) {
    extracted.payment_method = 'efectivo';
  }
  
  // Detectar ciudad (ciudades principales de Ecuador)
  const cities = ['quito', 'guayaquil', 'cuenca', 'ambato', 'manta', 'santo domingo', 'machala', 'riobamba'];
  for (const city of cities) {
    if (lowerMessage.includes(city)) {
      extracted.city = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }
  
  // Detectar fecha relativa
  if (lowerMessage.includes('hoy')) {
    extracted.date = new Date().toISOString().split('T')[0];
  } else if (lowerMessage.includes('mañana')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    extracted.date = tomorrow.toISOString().split('T')[0];
  }
  
  // Detectar hora (formatos: 8pm, 20:00, 8:00pm, 3:30pm, etc.)
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(pm|p\.m\.|PM|am|a\.m\.|AM)?/i,  // 3:30pm, 15:30
    /(\d{1,2})\s*(pm|p\.m\.|PM)/i,                         // 3pm
    /(\d{1,2})\s*(am|a\.m\.|AM)/i,                         // 8am
  ];
  
  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match) {
      let hour = parseInt(match[1]);
      let minute = 0;
      let isPM = false;
      
      // Determinar minutos y AM/PM según el patrón
      if (match[2] && !isNaN(parseInt(match[2]))) {
        // Tiene minutos (formato HH:MM)
        minute = parseInt(match[2]);
        isPM = match[3] && match[3].toLowerCase().includes('p');
      } else {
        // Sin minutos (formato HH am/pm)
        minute = 0;
        isPM = match[2] && match[2].toLowerCase().includes('p');
      }
      
      // Convertir a formato 24 horas
      if (isPM && hour < 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      
      extracted.start_time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      break;
    }
  }
  
  return extracted;
};

/**
 * Sanitiza los datos del formulario
 */
const sanitizeFormData = (formData) => {
  const sanitized = { ...formData };
  
  // Validar servicio
  if (sanitized.service_type && !SERVICES[sanitized.service_type]) {
    delete sanitized.service_type;
  }
  
  // Validar método de pago
  if (sanitized.payment_method && !['transferencia', 'tarjeta', 'efectivo'].includes(sanitized.payment_method)) {
    delete sanitized.payment_method;
  }
  
  // Validar fecha (debe ser futura o hoy)
  if (sanitized.date) {
    const date = new Date(sanitized.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      delete sanitized.date;
    }
  }
  
  return sanitized;
};

/**
 * Limpia formularios expirados (ejecutar periódicamente)
 */
export const cleanExpiredForms = async () => {
  return await db.cleanExpiredPendingConfirmations();
};

/**
 * Convierte los datos del formulario en un objeto de reserva
 */
export const formToReservation = (formData, userPhone) => {
  const service = SERVICES[formData.service_type];
  
  if (!service) {
    throw new Error(`Invalid service type: ${formData.service_type}`);
  }
  
  // Calcular end_time basado en start_time y duración
  let end_time = null;
  if (formData.start_time && service.duration) {
    const [hours, minutes, seconds] = formData.start_time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (service.duration * 60);
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;
  }
  
  return {
    user_phone: userPhone,
    model_code: formData.model_code,
    service_type: formData.service_type,
    date: formData.date,
    start_time: formData.start_time,
    end_time: end_time,
    duration_hours: service.duration,
    city: formData.city,
    payment_method: formData.payment_method,
    guest_count: formData.guest_count || 1
  };
};

export default {
  SERVICES,
  REQUIRED_FIELDS,
  getPartialForm,
  savePartialForm,
  updateFormField,
  updateFormFields,
  isFormComplete,
  getMissingFields,
  getNextMissingField,
  clearPartialForm,
  extractDataFromMessage,
  cleanExpiredForms,
  formToReservation
};
