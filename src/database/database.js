import db from './postgres-adapter.js';

/**
 * Database Service - Capa de acceso a datos para ANICA / Afrodita Spa
 * Métodos para todas las operaciones CRUD en las tablas
 */

// ============================================
// USERS
// ============================================

export const getUserByPhone = async (phoneNumber) => {
  const result = await db.query(
    'SELECT * FROM users WHERE phone_number = $1',
    [phoneNumber]
  );
  return result.rows[0] || null;
};

export const createUser = async (userData) => {
  const {
    phone_number,
    name = null,
    email = null,
    whatsapp_display_name = null,
  } = userData;

  const result = await db.query(
    `INSERT INTO users (phone_number, name, email, whatsapp_display_name, first_visit, last_message_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (phone_number) DO UPDATE 
     SET last_message_at = CURRENT_TIMESTAMP,
         conversation_count = users.conversation_count + 1
     RETURNING *`,
    [phone_number, name, email, whatsapp_display_name]
  );
  
  return result.rows[0];
};

export const updateUser = async (phoneNumber, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index}`);
    values.push(value);
    index++;
  }

  values.push(phoneNumber);

  const result = await db.query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE phone_number = $${index}
     RETURNING *`,
    values
  );

  return result.rows[0];
};

export const incrementConversationCount = async (phoneNumber) => {
  await db.query(
    `UPDATE users 
     SET conversation_count = conversation_count + 1,
         last_message_at = CURRENT_TIMESTAMP
     WHERE phone_number = $1`,
    [phoneNumber]
  );
};

// ============================================
// MODELS
// ============================================

export const getModelByCode = async (code) => {
  const result = await db.query(
    'SELECT * FROM models WHERE code = $1 AND is_active = TRUE',
    [code]
  );
  return result.rows[0] || null;
};

export const getAllActiveModels = async () => {
  const result = await db.query(
    'SELECT * FROM models WHERE is_active = TRUE ORDER BY display_name'
  );
  return result.rows;
};

export const createModel = async (modelData) => {
  const { code, display_name, phone_number, city } = modelData;
  
  const result = await db.query(
    `INSERT INTO models (code, display_name, phone_number, city)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [code, display_name, phone_number, city]
  );
  
  return result.rows[0];
};

// ============================================
// RESERVATIONS
// ============================================

export const createReservation = async (reservationData) => {
  const {
    user_phone,
    model_code,
    service_type,
    date,
    start_time,
    end_time,
    duration_hours,
    guest_count = 1,
    total_price,
    was_free = false,
    payment_method,
    payment_data = {},
    calendar_event_id = null
  } = reservationData;

  const result = await db.query(
    `INSERT INTO reservations 
     (user_phone, model_code, service_type, date, start_time, end_time, 
      duration_hours, guest_count, total_price, was_free, payment_method, 
      payment_data, calendar_event_id, status, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', 'pending')
     RETURNING *`,
    [user_phone, model_code, service_type, date, start_time, end_time,
     duration_hours, guest_count, total_price, was_free, payment_method,
     JSON.stringify(payment_data), calendar_event_id]
  );

  return result.rows[0];
};

export const updateReservation = async (reservationId, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'payment_data' && typeof value === 'object') {
      fields.push(`${key} = $${index}`);
      values.push(JSON.stringify(value));
    } else {
      fields.push(`${key} = $${index}`);
      values.push(value);
    }
    index++;
  }

  values.push(reservationId);

  const result = await db.query(
    `UPDATE reservations 
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING *`,
    values
  );

  return result.rows[0];
};

export const confirmReservation = async (reservationId) => {
  const result = await db.query(
    `UPDATE reservations 
     SET status = 'confirmed', 
         confirmed_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [reservationId]
  );
  return result.rows[0];
};

export const getReservationById = async (reservationId) => {
  const result = await db.query(
    'SELECT * FROM reservations WHERE id = $1',
    [reservationId]
  );
  return result.rows[0] || null;
};

export const getUserReservations = async (phoneNumber, status = null) => {
  let query = 'SELECT * FROM reservations WHERE user_phone = $1';
  const params = [phoneNumber];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY date DESC, start_time DESC';

  const result = await db.query(query, params);
  return result.rows;
};

export const getUpcomingReservations = async (phoneNumber) => {
  const result = await db.query(
    `SELECT * FROM reservations 
     WHERE user_phone = $1 
     AND status IN ('pending', 'confirmed')
     AND date >= CURRENT_DATE
     ORDER BY date ASC, start_time ASC`,
    [phoneNumber]
  );
  return result.rows;
};

// ============================================
// INTERACTIONS
// ============================================

export const saveInteraction = async (interactionData) => {
  const {
    user_phone,
    agent_name = 'ANICA',
    direction,
    type,
    payload = {},
    message_text = null
  } = interactionData;

  await db.query(
    `INSERT INTO interactions 
     (user_phone, agent_name, direction, type, payload, message_text)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user_phone, agent_name, direction, type, JSON.stringify(payload), message_text]
  );
};

// ============================================
// PENDING CONFIRMATIONS
// ============================================

export const getPendingConfirmation = async (phoneNumber) => {
  const result = await db.query(
    `SELECT * FROM pending_confirmations 
     WHERE user_phone = $1 
     AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC
     LIMIT 1`,
    [phoneNumber]
  );
  return result.rows[0] || null;
};

export const savePendingConfirmation = async (phoneNumber, formData, ttlMinutes = 120) => {
  // Delete existing pending confirmations for this user
  await db.query(
    'DELETE FROM pending_confirmations WHERE user_phone = $1',
    [phoneNumber]
  );

  const result = await db.query(
    `INSERT INTO pending_confirmations 
     (user_phone, form_json, expires_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '${ttlMinutes} minutes')
     RETURNING *`,
    [phoneNumber, JSON.stringify(formData)]
  );

  return result.rows[0];
};

export const updatePendingConfirmation = async (phoneNumber, formData) => {
  const result = await db.query(
    `UPDATE pending_confirmations 
     SET form_json = $1::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE user_phone = $2 AND expires_at > CURRENT_TIMESTAMP
     RETURNING *`,
    [JSON.stringify(formData), phoneNumber]
  );
  return result.rows[0] || null;
};

export const deletePendingConfirmation = async (phoneNumber) => {
  await db.query(
    'DELETE FROM pending_confirmations WHERE user_phone = $1',
    [phoneNumber]
  );
};

export const cleanExpiredPendingConfirmations = async () => {
  const result = await db.query(
    'DELETE FROM pending_confirmations WHERE expires_at < CURRENT_TIMESTAMP'
  );
  return result.rowCount;
};

// ============================================
// RESERVATION STATE (Cooldown)
// ============================================

export const getReservationState = async (phoneNumber) => {
  const result = await db.query(
    'SELECT * FROM reservation_state WHERE user_phone = $1',
    [phoneNumber]
  );
  return result.rows[0] || null;
};

export const setReservationCooldown = async (phoneNumber, reservationId, cooldownMinutes = 10) => {
  await db.query(
    `INSERT INTO reservation_state 
     (user_phone, just_confirmed_until, last_reservation_id)
     VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '$2 minutes', $3)
     ON CONFLICT (user_phone) 
     DO UPDATE SET 
       just_confirmed_until = CURRENT_TIMESTAMP + INTERVAL '? minutes',
       last_reservation_id = ?,
       updated_at = CURRENT_TIMESTAMP`,
    [phoneNumber, cooldownMinutes, reservationId, cooldownMinutes, reservationId]
  );
};

export const isInCooldown = async (phoneNumber) => {
  const state = await getReservationState(phoneNumber);
  if (!state || !state.just_confirmed_until) {
    return false;
  }
  return new Date(state.just_confirmed_until) > new Date();
};

// ============================================
// PARTIAL FORMS
// ============================================

export const getPartialForm = async (phoneNumber) => {
  const result = await db.query(
    `SELECT * FROM partial_forms 
     WHERE user_phone = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [phoneNumber]
  );
  return result.rows[0] || null;
};

export const savePartialForm = async (phoneNumber, formData) => {
  const existing = await getPartialForm(phoneNumber);

  if (existing) {
    const result = await db.query(
      `UPDATE partial_forms 
       SET form_data = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_phone = $1
       RETURNING *`,
      [JSON.stringify(formData), phoneNumber]
    );
    return result.rows[0];
  } else {
    const result = await db.query(
      `INSERT INTO partial_forms (user_phone, form_data)
       VALUES ($1, $2)
       RETURNING *`,
      [phoneNumber, JSON.stringify(formData)]
    );
    return result.rows[0];
  }
};

export const deletePartialForm = async (phoneNumber) => {
  await db.query(
    'DELETE FROM partial_forms WHERE user_phone = $1',
    [phoneNumber]
  );
};

// ============================================
// CONVERSATION HISTORY
// ============================================

export const saveConversationMessage = async (phoneNumber, role, content, agentName = 'ANICA') => {
  await db.query(
    `INSERT INTO conversation_history 
     (user_phone, role, content, agent_name)
     VALUES ($1, $2, $3, $4)`,
    [phoneNumber, role, content, agentName]
  );
};

export const getConversationHistory = async (phoneNumber, limit = 10) => {
  const result = await db.query(
    `SELECT * FROM conversation_history 
     WHERE user_phone = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [phoneNumber, limit]
  );
  return result.rows.reverse(); // Más antiguo primero
};

export const clearConversationHistory = async (phoneNumber) => {
  await db.query(
    'DELETE FROM conversation_history WHERE user_phone = $1',
    [phoneNumber]
  );
};

// ============================================
// UTILITY
// ============================================

export const initDatabase = async () => {
  try {
    await db.connect();
    console.log('✅ Database service initialized');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

export default {
  // Users
  getUserByPhone,
  createUser,
  updateUser,
  incrementConversationCount,
  
  // Models
  getModelByCode,
  getAllActiveModels,
  createModel,
  
  // Reservations
  createReservation,
  updateReservation,
  confirmReservation,
  getReservationById,
  getUserReservations,
  getUpcomingReservations,
  
  // Interactions
  saveInteraction,
  
  // Pending Confirmations
  getPendingConfirmation,
  savePendingConfirmation,
  updatePendingConfirmation,
  deletePendingConfirmation,
  cleanExpiredPendingConfirmations,
  
  // Reservation State
  getReservationState,
  setReservationCooldown,
  isInCooldown,
  
  // Partial Forms
  getPartialForm,
  savePartialForm,
  deletePartialForm,
  
  // Conversation History
  saveConversationMessage,
  getConversationHistory,
  clearConversationHistory,
  
  // Init
  initDatabase
};
