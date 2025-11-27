/**
 * Sistema de activación/desactivación temporal de ANICA
 * Permite alternar entre bots en el mismo número de WhatsApp
 * Estado persistido en memoria con fallback a process.env
 */

import db from '../db/conexion.js';

class BotSwitch {
  constructor() {
    // Inicializa con valor de variable de entorno (default: true)
    this.isActive = process.env.BOT_ACTIVE !== 'false';
    
    // Intenta cargar estado persistido de la DB al iniciar
    this.loadStateFromDB().catch(err => {
      console.log('⚠️ No se pudo cargar estado del bot desde DB, usando default');
    });
  }

  /**
   * Carga el estado del bot desde la base de datos
   */
  async loadStateFromDB() {
    try {
      const result = await db.query(
        `SELECT value FROM bot_config WHERE key = 'bot_active' LIMIT 1`
      );
      
      if (result.rows.length > 0) {
        this.isActive = result.rows[0].value === 'true';
        console.log(`🔄 Estado del bot cargado desde DB: ${this.isActive ? 'ACTIVO' : 'INACTIVO'}`);
      }
    } catch (error) {
      // Si la tabla no existe, créala
      if (error.code === '42P01') {
        await this.createConfigTable();
      }
    }
  }

  /**
   * Crea la tabla de configuración si no existe
   */
  async createConfigTable() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS bot_config (
          key VARCHAR(50) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Inserta valor inicial
      await db.query(`
        INSERT INTO bot_config (key, value) 
        VALUES ('bot_active', 'true')
        ON CONFLICT (key) DO NOTHING
      `);
      
      console.log('✅ Tabla bot_config creada');
    } catch (error) {
      console.error('❌ Error creando tabla bot_config:', error.message);
    }
  }

  /**
   * Persiste el estado en la base de datos
   */
  async persistState() {
    try {
      await db.query(`
        INSERT INTO bot_config (key, value, updated_at) 
        VALUES ('bot_active', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (key) 
        DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
      `, [this.isActive ? 'true' : 'false']);
      
      console.log(`💾 Estado persistido en DB: ${this.isActive}`);
    } catch (error) {
      console.error('❌ Error persistiendo estado:', error.message);
    }
  }

  /**
   * Verifica si el bot está activo
   */
  isEnabled() {
    return this.isActive;
  }

  /**
   * Activa el bot y persiste el cambio
   */
  async enable() {
    this.isActive = true;
    await this.persistState();
    console.log('✅ ANICA activada');
  }

  /**
   * Desactiva el bot y persiste el cambio
   */
  async disable() {
    this.isActive = false;
    await this.persistState();
    console.log('⏸️ ANICA desactivada');
  }

  /**
   * Alterna el estado del bot y persiste el cambio
   */
  async toggle() {
    this.isActive = !this.isActive;
    await this.persistState();
    console.log(this.isActive ? '✅ ANICA activada' : '⏸️ ANICA desactivada');
    return this.isActive;
  }

  /**
   * Mensaje de respuesta cuando el bot está desactivado
   */
  getInactiveMessage() {
    return 'Sistema temporalmente desactivado. Por favor, intenta más tarde.';
  }
}

// Singleton
const botSwitch = new BotSwitch();

export default botSwitch;
