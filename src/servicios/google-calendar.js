/**
 * Google Calendar Integration
 * Crea eventos en Google Calendar para las reservas
 */

import { google } from 'googleapis';

// Configurar credenciales de Google
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

/**
 * Crea un evento en Google Calendar
 */
export const createCalendarEvent = async (reservation, model, user, notifyAdminCallback) => {
  try {
    if (!process.env.GOOGLE_CALENDAR_ID) {
      console.warn('⚠️ Google Calendar no configurado, evento no creado');
      return null;
    }
    
    const startDateTime = `${reservation.date}T${reservation.start_time}`;
    const endTime = calculateEndTime(reservation.start_time, reservation.duration_hours);
    const endDateTime = `${reservation.date}T${endTime}`;
    
    const event = {
      summary: `Cita Afrodita Spa - ${model.display_name}`,
      description: `
Reserva ID: ${reservation.id}
Cliente: ${user.name || 'Sin nombre'} (${user.phone_number})
Modelo: ${model.display_name} (${model.code})
Servicio: ${reservation.service_type}
Duración: ${reservation.duration_hours}h
Ciudad: ${reservation.city}
Método de pago: ${reservation.payment_method}
Total: $${reservation.total_price}
Estado de pago: ${reservation.payment_status}
      `.trim(),
      location: reservation.city,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Guayaquil'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Guayaquil'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      },
      colorId: '10' // Verde
    };
    
    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event
    });
    
    console.log(`✅ Evento creado en Google Calendar: ${response.data.id}`);
    
    // 📢 Notificar al administrador sobre la nueva reserva
    if (notifyAdminCallback) {
      const adminMessage = `
🎉 *NUEVA RESERVA CONFIRMADA*

📅 *Fecha:* ${reservation.date}
⏰ *Hora:* ${reservation.start_time} (${reservation.duration_hours}h)
👤 *Cliente:* ${user.name || 'Sin nombre'}
📱 *Teléfono:* ${user.phone_number}
💃 *Modelo:* ${model.display_name} (${model.code})
🏙️ *Ciudad:* ${reservation.city}
💰 *Total:* $${reservation.total_price}
💳 *Pago:* ${reservation.payment_method}
📊 *Estado:* ${reservation.payment_status}

🆔 Reserva: ${reservation.id}
📆 Calendario: ${response.data.htmlLink || 'Ver en Google Calendar'}
      `.trim();
      
      try {
        await notifyAdminCallback(adminMessage);
      } catch (error) {
        console.error('❌ Error enviando notificación al admin:', error);
      }
    }
    
    return response.data.id;
    
  } catch (error) {
    console.error('❌ Error creando evento en Calendar:', error);
    return null;
  }
};

/**
 * Actualiza un evento existente
 */
export const updateCalendarEvent = async (eventId, updates) => {
  try {
    if (!eventId) return null;
    
    const response = await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId,
      resource: updates
    });
    
    console.log(`✅ Evento actualizado: ${eventId}`);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error actualizando evento:', error);
    return null;
  }
};

/**
 * Cancela un evento
 */
export const cancelCalendarEvent = async (eventId) => {
  try {
    if (!eventId) return;
    
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId
    });
    
    console.log(`✅ Evento cancelado: ${eventId}`);
    
  } catch (error) {
    console.error('❌ Error cancelando evento:', error);
  }
};

/**
 * Helper: Calcula hora de fin basado en hora de inicio y duración
 */
const calculateEndTime = (startTime, durationHours) => {
  const [hours, minutes, seconds] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, seconds || 0, 0);
  
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  
  const endHours = String(endDate.getHours()).padStart(2, '0');
  const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
  const endSeconds = String(endDate.getSeconds()).padStart(2, '0');
  
  return `${endHours}:${endMinutes}:${endSeconds}`;
};

export default {
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent
};
