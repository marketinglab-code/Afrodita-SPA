/**
 * CLI Utils - Herramientas de línea de comandos
 * Para mantenimiento y debugging
 */

import dbService from '../database/database.js';
import dbAdapter from '../database/postgres-adapter.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = {
  /**
   * Lista todos los usuarios registrados
   */
  async listUsers() {
    await dbService.initDatabase();
    
    const result = await dbAdapter.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 20');
    
    console.log('\n📋 Usuarios registrados (últimos 20):\n');
    console.table(result.rows.map(u => ({
      Teléfono: u.phone_number,
      Nombre: u.name || 'Sin nombre',
      'Primera Visita': new Date(u.first_visit).toLocaleDateString('es-EC'),
      Conversaciones: u.conversation_count,
      'Último Mensaje': new Date(u.last_message_at).toLocaleString('es-EC')
    })));
  },
  
  /**
   * Lista todas las modelos
   */
  async listModels() {
    await dbService.initDatabase();
    
    const result = await dbAdapter.query('SELECT * FROM models ORDER BY code');
    
    console.log('\n🎀 Modelos registradas:\n');
    console.table(result.rows.map(m => ({
      Código: m.code,
      Nombre: m.display_name,
      Teléfono: m.phone_number,
      Ciudad: m.city,
      Activa: m.is_active ? '✅' : '❌'
    })));
  },
  
  /**
   * Lista reservas recientes
   */
  async listReservations(limit = 20) {
    await dbService.initDatabase();
    
    const result = await dbAdapter.query(
      'SELECT * FROM reservations ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    
    console.log(`\n📅 Reservas recientes (últimas ${limit}):\n`);
    console.table(result.rows.map(r => ({
      ID: r.id,
      Usuario: r.user_phone,
      Modelo: r.model_code,
      Fecha: new Date(r.date).toLocaleDateString('es-EC'),
      Hora: r.start_time,
      Servicio: r.service_type,
      Total: `$${r.total_price}`,
      Estado: r.status,
      Pago: r.payment_status
    })));
  },
  
  /**
   * Muestra estadísticas generales
   */
  async stats() {
    await dbService.initDatabase();
    
    const users = await dbAdapter.query('SELECT COUNT(*) as count FROM users');
    const models = await dbAdapter.query('SELECT COUNT(*) as count FROM models WHERE is_active = TRUE');
    const reservations = await dbAdapter.query('SELECT COUNT(*) as count FROM reservations');
    const pending = await dbAdapter.query('SELECT COUNT(*) as count FROM reservations WHERE status = \'pending\'');
    const confirmed = await dbAdapter.query('SELECT COUNT(*) as count FROM reservations WHERE status = \'confirmed\'');
    const totalRevenue = await dbAdapter.query('SELECT SUM(total_price) as total FROM reservations WHERE payment_status = \'paid\'');
    
    console.log('\n📊 Estadísticas del Sistema:\n');
    console.log(`👥 Usuarios registrados: ${users.rows[0].count}`);
    console.log(`🎀 Modelos activas: ${models.rows[0].count}`);
    console.log(`📅 Total reservas: ${reservations.rows[0].count}`);
    console.log(`⏳ Reservas pendientes: ${pending.rows[0].count}`);
    console.log(`✅ Reservas confirmadas: ${confirmed.rows[0].count}`);
    console.log(`💰 Ingresos totales: $${totalRevenue.rows[0].total || 0}`);
    console.log('');
  },
  
  /**
   * Limpia formularios expirados
   */
  async cleanExpired() {
    await dbService.initDatabase();
    
    const result = await dbAdapter.query('DELETE FROM pending_confirmations WHERE expires_at < CURRENT_TIMESTAMP');
    
    console.log(`\n🧹 Limpieza completada: ${result.rowCount} formularios expirados eliminados\n`);
  },
  
  /**
   * Agrega una nueva modelo
   */
  async addModel(code, displayName, phone, city = 'Quito') {
    await dbService.initDatabase();
    
    const result = await dbAdapter.query(
      `INSERT INTO models (code, display_name, phone_number, city, is_active)
       VALUES (?, ?, ?, ?, TRUE)
       RETURNING *`,
      [code, displayName, phone, city]
    );
    
    console.log('\n✨ Modelo agregada exitosamente:\n');
    console.table([{
      Código: result.rows[0].code,
      Nombre: result.rows[0].display_name,
      Teléfono: result.rows[0].phone_number,
      Ciudad: result.rows[0].city
    }]);
  },
  
  /**
   * Muestra ayuda
   */
  help() {
    console.log(`
🎀 ANICA CLI - Herramientas de línea de comandos

Uso: node src/utils/cli.js <comando> [argumentos]

Comandos disponibles:

  list-users              Lista todos los usuarios registrados
  list-models             Lista todas las modelos
  list-reservations [n]   Lista las últimas n reservas (default: 20)
  stats                   Muestra estadísticas generales del sistema
  clean-expired           Limpia formularios expirados
  add-model <code> <nombre> <teléfono> [ciudad]
                          Agrega una nueva modelo
  help                    Muestra esta ayuda

Ejemplos:

  node src/utils/cli.js list-users
  node src/utils/cli.js stats
  node src/utils/cli.js add-model AN02 "María" "0987654321" "Guayaquil"
  node src/utils/cli.js list-reservations 50

    `);
  }
};

// Ejecutar comando
const [,, command, ...args] = process.argv;

if (!command || command === 'help') {
  commands.help();
  process.exit(0);
}

const commandName = command.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

if (commands[commandName]) {
  commands[commandName](...args)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
} else {
  console.error(`❌ Comando desconocido: ${command}`);
  commands.help();
  process.exit(1);
}
