import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const userPhone = '+593987770788';

async function cleanHistory() {
  try {
    await client.connect();
    console.log('🔌 Conectado a la BD');
    
    await client.query('DELETE FROM conversation_history WHERE user_phone = $1', [userPhone]);
    console.log('✅ Historial de conversación eliminado');
    
    await client.query('DELETE FROM interactions WHERE user_phone = $1', [userPhone]);
    console.log('✅ Interacciones eliminadas');
    
    await client.query('DELETE FROM users WHERE phone_number = $1', [userPhone]);
    console.log('✅ Usuario eliminado');
    
    console.log('\n🎉 Historial completamente limpiado para:', userPhone);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

cleanHistory();
