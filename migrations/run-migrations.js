/**
 * Migration Runner
 * Ejecuta las migraciones SQL en PostgreSQL
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

const runMigrations = async () => {
  try {
    console.log('🚀 Ejecutando migraciones...\n');
    
    // Leer todos los archivos .sql en el directorio de migraciones
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('⚠️ No se encontraron archivos de migración');
      return;
    }
    
    console.log(`📂 Encontrados ${files.length} archivo(s) de migración:\n`);
    
    for (const file of files) {
      console.log(`   📄 ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      try {
        await pool.query(sql);
        console.log(`   ✅ Ejecutado correctamente\n`);
      } catch (error) {
        console.error(`   ❌ Error ejecutando ${file}:`, error.message);
        throw error;
      }
    }
    
    console.log('🎉 Todas las migraciones se ejecutaron correctamente\n');
    
  } catch (error) {
    console.error('❌ Error durante las migraciones:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Ejecutar
runMigrations();
