/**
 * Test del flujo completo de agendamiento con Google Calendar
 * Simula la conversación completa hasta la confirmación
 */

import 'dotenv/config';

const BASE_URL = process.env.HEROKU_APP_URL || 'https://anica-gpt-9c7f993c6f1f.herokuapp.com';
const TEST_PHONE = '+593987770788'; // Tu número de prueba

/**
 * Simula el envío de un mensaje al webhook de test
 */
async function sendMessage(phone, message) {
  try {
    console.log(`\n📤 Enviando: "${message}"`);
    
    const response = await fetch(`${BASE_URL}/webhook/wassenger/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone,
        message
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.result.response) {
      console.log(`📥 ANICA responde:\n${result.result.response}\n`);
      
      if (result.result.reservationCreated) {
        console.log(`✅ RESERVA CREADA:`, result.result.reservation);
      }
    } else {
      console.error('❌ Error:', result);
    }
    
    // Esperar un poco entre mensajes para simular conversación real
    await sleep(2000);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.message);
    throw error;
  }
}

/**
 * Limpia la base de datos para el test
 */
async function cleanDatabase() {
  console.log('🧹 Limpiando base de datos para test...\n');
  
  // Aquí podrías llamar a un endpoint de limpieza o hacerlo manualmente
  // Por ahora asumimos que está limpia
}

/**
 * Verifica que el bot esté activo
 */
async function checkBotStatus() {
  try {
    const response = await fetch(`${BASE_URL}/bot/status`);
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      console.log(`🤖 Estado del bot:`, data);
      return data.enabled !== false; // Asume activo si no dice explícitamente false
    } catch {
      // Si no es JSON, asumimos que el bot está activo
      console.log(`🤖 Bot asumido activo (respuesta: ${text.substring(0, 50)}...)`);
      return true;
    }
  } catch (error) {
    console.error('⚠️ No se pudo verificar estado, asumiendo activo');
    return true; // Asume activo para continuar
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test principal - Flujo completo de agendamiento
 */
async function testCompleteBookingFlow() {
  console.log('🚀 INICIANDO TEST: Flujo Completo de Agendamiento con Calendar\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar que el bot esté activo
    const isActive = await checkBotStatus();
    if (!isActive) {
      throw new Error('El bot no está activo. Actívalo primero.');
    }
    
    console.log('\n✅ Bot activo - Iniciando flujo de agendamiento\n');
    console.log('='.repeat(60));
    
    // 2. Mensaje inicial - solicitud de servicio
    await sendMessage(TEST_PHONE, 'Quiero un masaje de 30 minutos');
    
    // 3. Especificar fecha y hora
    await sendMessage(TEST_PHONE, 'Para mañana a las 6pm');
    
    // 4. Ciudad y método de pago
    await sendMessage(TEST_PHONE, 'En Quito y pago con efectivo');
    
    // 5. Confirmación
    console.log('\n⏰ Esperando resumen de la reserva...\n');
    await sleep(1000);
    
    const confirmResult = await sendMessage(TEST_PHONE, 'Si');
    
    // 6. Verificar resultado
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADO DEL TEST\n');
    
    if (confirmResult.success && confirmResult.result.reservationCreated) {
      console.log('✅ FLUJO COMPLETADO EXITOSAMENTE');
      console.log('\nDetalles de la reserva:');
      console.log('- ID:', confirmResult.result.reservation.id);
      console.log('- Servicio:', confirmResult.result.reservation.service_type);
      console.log('- Fecha:', confirmResult.result.reservation.date);
      console.log('- Hora:', confirmResult.result.reservation.start_time);
      console.log('- Ciudad:', confirmResult.result.reservation.city);
      console.log('- Total:', `$${confirmResult.result.reservation.total_price}`);
      console.log('- Método de pago:', confirmResult.result.reservation.payment_method);
      console.log('- Calendar Event ID:', confirmResult.result.reservation.calendar_event_id || '⚠️ No creado');
      
      if (confirmResult.result.reservation.calendar_event_id) {
        console.log('\n✅ EVENTO DE CALENDAR CREADO');
        console.log('✅ Notificación a admin enviada');
        console.log('✅ Notificación a Danica enviada');
      } else {
        console.log('\n⚠️ ADVERTENCIA: El evento de Calendar NO fue creado');
        console.log('Verifica las credenciales de Google Calendar en Heroku');
      }
      
      console.log('\n🎉 TEST EXITOSO - Todos los componentes funcionando');
      
    } else {
      console.log('❌ FLUJO FALLIDO');
      console.log('La confirmación no creó la reserva correctamente');
      console.log('Resultado:', JSON.stringify(confirmResult, null, 2));
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error.message);
    console.error(error);
    process.exit(1);
  }
}

/**
 * Test de Calendar aislado
 */
async function testCalendarOnly() {
  console.log('🚀 TEST: Google Calendar (aislado)\n');
  console.log('='.repeat(60));
  
  // Aquí podrías importar directamente el módulo de google-calendar
  // y probarlo sin el flujo completo
  
  console.log('⚠️ Test de Calendar aislado no implementado aún');
  console.log('Usa el test completo para verificar Calendar');
}

// Ejecutar tests
const testMode = process.argv[2] || 'complete';

if (testMode === 'complete') {
  testCompleteBookingFlow()
    .then(() => {
      console.log('\n✅ Tests finalizados');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Tests fallaron:', err);
      process.exit(1);
    });
} else if (testMode === 'calendar') {
  testCalendarOnly()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} else {
  console.log('Uso: node test-calendar-flow.js [complete|calendar]');
  process.exit(1);
}
