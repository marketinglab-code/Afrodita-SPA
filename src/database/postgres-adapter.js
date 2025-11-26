import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL Adapter para Afrodita Spa / ANICA
 * Maneja conexiones con SSL, timeouts y conversión de placeholders ? → $n
 */
class PostgresAdapter {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Inicializa el pool de conexiones
   */
  async connect() {
    if (this.pool) {
      return this.pool;
    }

    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    };

    try {
      this.pool = new Pool(config);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      console.log('✅ PostgreSQL connected successfully');
      
      return this.pool;
    } catch (error) {
      console.error('❌ PostgreSQL connection error:', error);
      throw error;
    }
  }

  /**
   * Convierte placeholders ? a formato PostgreSQL $1, $2, etc.
   * @param {string} query - Query con placeholders ?
   * @returns {string} Query con placeholders $n
   */
  convertPlaceholders(query) {
    let index = 0;
    return query.replace(/\?/g, () => `$${++index}`);
  }

  /**
   * Ejecuta una query con conversión automática de placeholders
   * @param {string} query - Query SQL
   * @param {Array} params - Parámetros
   * @returns {Promise<Object>} Resultado de la query
   */
  async query(query, params = []) {
    if (!this.pool) {
      await this.connect();
    }

    try {
      const convertedQuery = this.convertPlaceholders(query);
      const result = await this.pool.query(convertedQuery, params);
      return result;
    } catch (error) {
      console.error('❌ Query error:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Obtiene un cliente del pool para transacciones
   * @returns {Promise<PoolClient>}
   */
  async getClient() {
    if (!this.pool) {
      await this.connect();
    }
    return await this.pool.connect();
  }

  /**
   * Ejecuta una transacción
   * @param {Function} callback - Función async que recibe el client
   * @returns {Promise<any>} Resultado del callback
   */
  async transaction(callback) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cierra el pool de conexiones
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('PostgreSQL pool closed');
    }
  }

  /**
   * Verifica si está conectado
   * @returns {boolean}
   */
  isHealthy() {
    return this.isConnected && this.pool !== null;
  }
}

// Singleton instance
const adapter = new PostgresAdapter();

export default adapter;
