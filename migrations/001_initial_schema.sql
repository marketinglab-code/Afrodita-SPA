-- ====================================================
-- ANICA / AFRODITA SPA - DATABASE SCHEMA
-- PostgreSQL Migration
-- ====================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    phone_number VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    whatsapp_display_name VARCHAR(255),
    first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    free_trial_used BOOLEAN DEFAULT FALSE,
    free_trial_date TIMESTAMP,
    conversation_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active_agent VARCHAR(50) DEFAULT 'ANICA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_last_message ON users(last_message_at);

-- 2. MODELS TABLE
CREATE TABLE IF NOT EXISTS models (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    city VARCHAR(100),
    hourly_rate DECIMAL(10, 2) DEFAULT 60.00,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_models_code ON models(code);
CREATE INDEX idx_models_is_active ON models(is_active);

-- Insert first model (AN01 - 0987770788)
INSERT INTO models (code, display_name, phone_number, city, is_active)
VALUES ('AN01', 'Modelo AN01', '0987770788', 'Quito', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3. RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number) ON DELETE CASCADE,
    model_code VARCHAR(10) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    duration_hours DECIMAL(4,2),
    guest_count INTEGER DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    was_free BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('transferencia', 'tarjeta', 'efectivo')),
    payment_data JSONB DEFAULT '{}',
    calendar_event_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

CREATE INDEX idx_reservations_user_phone ON reservations(user_phone);
CREATE INDEX idx_reservations_model_code ON reservations(model_code);
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_payment_status ON reservations(payment_status);

-- 4. INTERACTIONS TABLE
CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(20) NOT NULL,
    agent_name VARCHAR(50) DEFAULT 'ANICA',
    direction VARCHAR(10) CHECK (direction IN ('in', 'out')),
    type VARCHAR(20) CHECK (type IN ('text', 'image', 'meta')),
    payload JSONB DEFAULT '{}',
    message_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactions_user_phone ON interactions(user_phone);
CREATE INDEX idx_interactions_created_at ON interactions(created_at);

-- 5. PENDING_CONFIRMATIONS TABLE
CREATE TABLE IF NOT EXISTS pending_confirmations (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(20) NOT NULL,
    form_json JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pending_confirmations_user_phone ON pending_confirmations(user_phone);
CREATE INDEX idx_pending_confirmations_expires_at ON pending_confirmations(expires_at);

-- 6. RESERVATION_STATE TABLE
CREATE TABLE IF NOT EXISTS reservation_state (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(20) UNIQUE NOT NULL,
    just_confirmed_until TIMESTAMP,
    last_reservation_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservation_state_user_phone ON reservation_state(user_phone);
CREATE INDEX idx_reservation_state_confirmed_until ON reservation_state(just_confirmed_until);

-- 7. PARTIAL_FORMS TABLE
CREATE TABLE IF NOT EXISTS partial_forms (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(20) NOT NULL,
    form_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_partial_forms_user_phone ON partial_forms(user_phone);

-- 8. CONVERSATION_HISTORY TABLE
CREATE TABLE IF NOT EXISTS conversation_history (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    agent_name VARCHAR(50) DEFAULT 'ANICA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_history_user_phone ON conversation_history(user_phone);
CREATE INDEX idx_conversation_history_created_at ON conversation_history(created_at);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_confirmations_updated_at BEFORE UPDATE ON pending_confirmations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservation_state_updated_at BEFORE UPDATE ON reservation_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partial_forms_updated_at BEFORE UPDATE ON partial_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
