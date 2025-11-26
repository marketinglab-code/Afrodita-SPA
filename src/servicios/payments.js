/**
 * Payments Service
 * Manejo de cálculo de impuestos, validación de comprobantes con OpenAI Vision
 */

import OpenAI from 'openai';
import { SERVICES } from './partial-reservation-form.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Tasas de impuestos
const IVA_RATE = parseFloat(process.env.IVA_RATE || '0.15');
const TARJETA_COMISION_RATE = parseFloat(process.env.TARJETA_COMISION_RATE || '0.05');

// Link único de Payphone
export const PAYPHONE_LINK = process.env.PAYPHONE_PAYMENT_LINK || 'https://ppls.me/0YOnSvhmrKrKG83BlsQYRQ';

/**
 * Calcula el precio total con impuestos según el método de pago
 */
export const calculateTotalPrice = (serviceType, paymentMethod) => {
  const service = SERVICES[serviceType];
  
  if (!service) {
    throw new Error(`Invalid service type: ${serviceType}`);
  }
  
  const basePrice = service.price;
  let subtotal = basePrice;
  let comision = 0;
  let iva = 0;
  let total = 0;
  
  switch (paymentMethod) {
    case 'transferencia':
      // Transferencia: base + IVA 15%
      iva = subtotal * IVA_RATE;
      total = subtotal + iva;
      break;
      
    case 'tarjeta':
      // Tarjeta: base + comisión 5% + IVA 15% sobre (base + comisión)
      comision = subtotal * TARJETA_COMISION_RATE;
      subtotal = basePrice + comision;
      iva = subtotal * IVA_RATE;
      total = subtotal + iva;
      break;
      
    case 'efectivo':
      // Efectivo: base + IVA 15%
      iva = subtotal * IVA_RATE;
      total = subtotal + iva;
      break;
      
    default:
      throw new Error(`Invalid payment method: ${paymentMethod}`);
  }
  
  return {
    basePrice: parseFloat(basePrice.toFixed(2)),
    comision: parseFloat(comision.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    iva: parseFloat(iva.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    serviceName: service.name,
    paymentMethod
  };
};

/**
 * Genera el mensaje de desglose de precio para el usuario
 */
export const generatePriceBreakdown = (priceCalculation) => {
  const { basePrice, comision, iva, total, serviceName, paymentMethod } = priceCalculation;
  
  let breakdown = `💰 *Desglose de precio*\n\n`;
  breakdown += `📌 Servicio: ${serviceName}\n`;
  breakdown += `💵 Precio base: $${basePrice}\n`;
  
  if (comision > 0) {
    breakdown += `💳 Comisión tarjeta (5%): $${comision}\n`;
  }
  
  breakdown += `📊 IVA (15%): $${iva}\n`;
  breakdown += `\n✨ *TOTAL A PAGAR: $${total}*\n`;
  
  return breakdown;
};

/**
 * Genera el mensaje de instrucciones de pago
 */
export const generatePaymentInstructions = (priceCalculation) => {
  const { total } = priceCalculation;
  
  let message = `\n🔗 *Link de pago:*\n${PAYPHONE_LINK}\n\n`;
  message += `📝 *Instrucciones:*\n`;
  message += `1. Haz clic en el link de pago\n`;
  message += `2. Ingresa el monto EXACTO: *$${total}*\n`;
  message += `3. Completa el pago\n`;
  message += `4. Envíame el comprobante (captura de pantalla o número de referencia)\n\n`;
  message += `Una vez validado tu pago, tu cita quedará 100% confirmada. 💖`;
  
  return message;
};

/**
 * Valida un comprobante de pago usando OpenAI Vision
 * Recibe la URL de la imagen del comprobante
 */
export const validatePaymentProof = async (imageUrl, expectedAmount) => {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente que valida comprobantes de pago. 
Tu tarea es extraer la siguiente información de la imagen:
- Monto pagado
- Fecha y hora de la transacción
- Número de referencia o ID de transacción
- Estado del pago (completado, pendiente, fallido)

Responde en formato JSON con esta estructura:
{
  "valid": true/false,
  "amount": número,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "reference": "string",
  "status": "completed/pending/failed",
  "confidence": 0-100,
  "notes": "string con observaciones"
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza este comprobante de pago. El monto esperado es $${expectedAmount}. 
¿Es válido? ¿Coincide el monto? ¿Está completo el pago?`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });
    
    const content = response.choices[0].message.content;
    
    // Intentar parsear JSON
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      // Si no es JSON válido, crear estructura básica
      result = {
        valid: false,
        confidence: 0,
        notes: 'No se pudo parsear la respuesta del análisis'
      };
    }
    
    // Validar monto con tolerancia de $0.50
    if (result.amount) {
      const difference = Math.abs(result.amount - expectedAmount);
      result.amountMatches = difference <= 0.50;
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error validando comprobante con Vision:', error);
    return {
      valid: false,
      confidence: 0,
      error: error.message,
      notes: 'Error al procesar la imagen'
    };
  }
};

/**
 * Valida un comprobante de texto (cuando el usuario envía solo el número de referencia)
 */
export const validatePaymentText = async (text, expectedAmount) => {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente que valida información de pagos. 
El usuario te enviará un texto con información de su pago.
Extrae lo que puedas y determina si parece un comprobante válido.

Responde en formato JSON:
{
  "seemsValid": true/false,
  "reference": "string o null",
  "confidence": 0-100,
  "notes": "observaciones"
}`
        },
        {
          role: 'user',
          content: `Analiza este texto de comprobante de pago. Monto esperado: $${expectedAmount}\n\nTexto: ${text}`
        }
      ],
      max_tokens: 300
    });
    
    const content = response.choices[0].message.content;
    return JSON.parse(content);
    
  } catch (error) {
    console.error('❌ Error validando texto de pago:', error);
    return {
      seemsValid: false,
      confidence: 0,
      notes: 'Error al analizar el texto'
    };
  }
};

/**
 * Procesa el pago de una reserva
 * Actualiza el estado de pago en la base de datos
 */
export const processPayment = async (reservationId, paymentData) => {
  const { validation, method, reference, imageUrl } = paymentData;
  
  const updateData = {
    payment_status: validation.valid ? 'paid' : 'failed',
    payment_data: {
      validation,
      method,
      reference,
      imageUrl,
      processedAt: new Date().toISOString()
    }
  };
  
  const db = await import('../database/database.js');
  return await db.default.updateReservation(reservationId, updateData);
};

/**
 * Genera mensaje de confirmación de pago exitoso
 */
export const generatePaymentSuccessMessage = (reservation) => {
  let message = `✅ *¡Pago confirmado!*\n\n`;
  message += `Tu cita está 100% reservada. 🎉\n\n`;
  message += `📋 *Detalles:*\n`;
  message += `📅 ${new Date(reservation.date).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}\n`;
  message += `🕐 ${reservation.start_time}\n`;
  message += `📍 ${reservation.city}\n\n`;
  message += `Te esperamos con toda la discreción y el cariño que mereces. 💖\n\n`;
  message += `Por tu máxima discreción, este chat se borrará automáticamente en 24 horas. Afrodita Spa cuida cada detalle por ti. 🔒`;
  
  return message;
};

/**
 * Genera mensaje cuando el pago no se puede validar
 */
export const generatePaymentFailureMessage = (reason = null) => {
  let message = `⚠️ No pude validar tu comprobante de pago.\n\n`;
  
  if (reason) {
    message += `Razón: ${reason}\n\n`;
  }
  
  message += `Por favor:\n`;
  message += `1. Verifica que el monto sea correcto\n`;
  message += `2. Asegúrate de que la imagen sea clara\n`;
  message += `3. Envía una captura de pantalla completa del comprobante\n\n`;
  message += `Si pagaste y tienes problemas, escríbeme "ayuda con mi pago" y te asisto personalmente. 💙`;
  
  return message;
};

export default {
  PAYPHONE_LINK,
  calculateTotalPrice,
  generatePriceBreakdown,
  generatePaymentInstructions,
  validatePaymentProof,
  validatePaymentText,
  processPayment,
  generatePaymentSuccessMessage,
  generatePaymentFailureMessage
};
