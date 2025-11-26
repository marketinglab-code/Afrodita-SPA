/**
 * Tests - ANICA System
 * Tests para funciones críticas
 */

import { describe, test, expect } from '@jest/globals';

// ============================================
// TESTS: Payments Service
// ============================================

describe('Payments Service - Cálculo de Impuestos', () => {
  
  // Mock del servicio
  const calculateTotalPrice = (serviceType, paymentMethod) => {
    const services = {
      MOMENTO_15: 30,
      MEDIA_HORA: 35,
      MIN45: 40,
      HORA1: 50,
      SALIDA1: 70,
      SALIDA2: 120,
      SALIDA3: 150
    };
    
    const basePrice = services[serviceType];
    const IVA_RATE = 0.15;
    const TARJETA_COMISION_RATE = 0.05;
    
    let subtotal = basePrice;
    let comision = 0;
    let iva = 0;
    let total = 0;
    
    switch (paymentMethod) {
      case 'transferencia':
        iva = subtotal * IVA_RATE;
        total = subtotal + iva;
        break;
        
      case 'tarjeta':
        comision = subtotal * TARJETA_COMISION_RATE;
        subtotal = basePrice + comision;
        iva = subtotal * IVA_RATE;
        total = subtotal + iva;
        break;
        
      case 'efectivo':
        iva = subtotal * IVA_RATE;
        total = subtotal + iva;
        break;
    }
    
    return {
      basePrice: parseFloat(basePrice.toFixed(2)),
      comision: parseFloat(comision.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva: parseFloat(iva.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  };
  
  test('Transferencia: $50 servicio = $57.50 total (15% IVA)', () => {
    const result = calculateTotalPrice('HORA1', 'transferencia');
    
    expect(result.basePrice).toBe(50);
    expect(result.comision).toBe(0);
    expect(result.iva).toBe(7.50);
    expect(result.total).toBe(57.50);
  });
  
  test('Tarjeta: $50 servicio = $60.38 total (5% comisión + 15% IVA)', () => {
    const result = calculateTotalPrice('HORA1', 'tarjeta');
    
    expect(result.basePrice).toBe(50);
    expect(result.comision).toBe(2.50);
    expect(result.subtotal).toBe(52.50);
    expect(result.iva).toBe(7.88);
    expect(result.total).toBe(60.38);
  });
  
  test('Efectivo: $35 servicio = $40.25 total (15% IVA)', () => {
    const result = calculateTotalPrice('MEDIA_HORA', 'efectivo');
    
    expect(result.basePrice).toBe(35);
    expect(result.comision).toBe(0);
    expect(result.iva).toBe(5.25);
    expect(result.total).toBe(40.25);
  });
  
  test('SALIDA2 con transferencia: $120 = $138 total', () => {
    const result = calculateTotalPrice('SALIDA2', 'transferencia');
    
    expect(result.basePrice).toBe(120);
    expect(result.iva).toBe(18);
    expect(result.total).toBe(138);
  });
});

// ============================================
// TESTS: Model Code Detection
// ============================================

describe('Model Code Detection', () => {
  
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const detectModelCodeInMessage = (message, modelCodes) => {
    const normalized = normalizeText(message);
    
    for (const code of modelCodes) {
      if (normalized.includes(code.toLowerCase())) {
        return code;
      }
    }
    
    return null;
  };
  
  test('Detecta código AN01 en mensaje inicial', () => {
    const message = 'hola, quiero una cita con AN01';
    const models = ['AN01', 'AN02', 'AN03'];
    
    const detected = detectModelCodeInMessage(message, models);
    expect(detected).toBe('AN01');
  });
  
  test('Detecta código con mayúsculas y minúsculas', () => {
    const message = 'Hola quiero ver a an01';
    const models = ['AN01', 'AN02'];
    
    const detected = detectModelCodeInMessage(message, models);
    expect(detected).toBe('AN01');
  });
  
  test('Detecta código con acentos', () => {
    const message = 'Holá, quiero cita con án01';
    const models = ['AN01', 'AN02'];
    
    const detected = detectModelCodeInMessage(message, models);
    expect(detected).toBe('AN01');
  });
  
  test('No detecta código inexistente', () => {
    const message = 'hola quiero una cita';
    const models = ['AN01', 'AN02'];
    
    const detected = detectModelCodeInMessage(message, models);
    expect(detected).toBeNull();
  });
});

// ============================================
// TESTS: Horario 24/7
// ============================================

describe('Validación de Horario 24/7', () => {
  
  const isValidTime = (hour) => {
    // SIEMPRE válido (24/7)
    return hour >= 0 && hour <= 23;
  };
  
  const isValidDay = (dayOfWeek) => {
    // Todos los días válidos
    return dayOfWeek >= 0 && dayOfWeek <= 6;
  };
  
  test('Hora 00:00 es válida (medianoche)', () => {
    expect(isValidTime(0)).toBe(true);
  });
  
  test('Hora 03:00 AM es válida (madrugada)', () => {
    expect(isValidTime(3)).toBe(true);
  });
  
  test('Hora 14:00 es válida (tarde)', () => {
    expect(isValidTime(14)).toBe(true);
  });
  
  test('Hora 23:00 es válida (noche)', () => {
    expect(isValidTime(23)).toBe(true);
  });
  
  test('Domingo (0) es válido', () => {
    expect(isValidDay(0)).toBe(true);
  });
  
  test('Lunes (1) es válido', () => {
    expect(isValidDay(1)).toBe(true);
  });
  
  test('Sábado (6) es válido', () => {
    expect(isValidDay(6)).toBe(true);
  });
});

// ============================================
// TESTS: TTL de Formularios
// ============================================

describe('Expiración de Formularios (TTL)', () => {
  
  const TTL_MINUTES = 120;
  
  const isFormExpired = (createdAt, ttlMinutes = TTL_MINUTES) => {
    const now = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
    
    return now > expiresAt;
  };
  
  test('Formulario creado hace 30 minutos NO está expirado', () => {
    const createdAt = new Date();
    createdAt.setMinutes(createdAt.getMinutes() - 30);
    
    expect(isFormExpired(createdAt)).toBe(false);
  });
  
  test('Formulario creado hace 119 minutos NO está expirado', () => {
    const createdAt = new Date();
    createdAt.setMinutes(createdAt.getMinutes() - 119);
    
    expect(isFormExpired(createdAt)).toBe(false);
  });
  
  test('Formulario creado hace 121 minutos SÍ está expirado', () => {
    const createdAt = new Date();
    createdAt.setMinutes(createdAt.getMinutes() - 121);
    
    expect(isFormExpired(createdAt)).toBe(true);
  });
  
  test('Formulario creado hace 3 horas está expirado', () => {
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - 3);
    
    expect(isFormExpired(createdAt)).toBe(true);
  });
});

// ============================================
// TESTS: Confirmación Detection
// ============================================

describe('Detección de Confirmación', () => {
  
  const detectConfirmation = (message) => {
    const normalized = message.toLowerCase().trim();
    
    const confirmationKeywords = [
      'si', 'sí', 'confirmo', 'confirma', 'dale', 'ok', 'okay',
      'perfecto', 'correcto', 'exacto', 'así es', 'eso es',
      'claro', 'seguro', 'va', 'sale', 'listo'
    ];
    
    if (message.length > 100) {
      return false;
    }
    
    return confirmationKeywords.some(kw => normalized === kw || normalized.startsWith(kw));
  };
  
  test('Detecta "sí" como confirmación', () => {
    expect(detectConfirmation('sí')).toBe(true);
    expect(detectConfirmation('si')).toBe(true);
  });
  
  test('Detecta "confirmo" como confirmación', () => {
    expect(detectConfirmation('confirmo')).toBe(true);
  });
  
  test('Detecta "dale" como confirmación', () => {
    expect(detectConfirmation('dale')).toBe(true);
  });
  
  test('Detecta "ok" como confirmación', () => {
    expect(detectConfirmation('ok')).toBe(true);
  });
  
  test('NO detecta mensaje largo como confirmación', () => {
    const longMessage = 'sí pero quiero cambiar la fecha porque tengo un compromiso y necesito reagendar para otro día más conveniente';
    expect(detectConfirmation(longMessage)).toBe(false);
  });
  
  test('NO detecta pregunta como confirmación', () => {
    expect(detectConfirmation('¿cuánto cuesta?')).toBe(false);
  });
});

// ============================================
// TESTS: Extracción de Datos
// ============================================

describe('Extracción de Datos del Mensaje', () => {
  
  const extractPaymentMethod = (message) => {
    const lower = message.toLowerCase();
    
    if (lower.includes('transferencia') || lower.includes('transfe')) {
      return 'transferencia';
    } else if (lower.includes('tarjeta') || lower.includes('card')) {
      return 'tarjeta';
    } else if (lower.includes('efectivo') || lower.includes('cash')) {
      return 'efectivo';
    }
    
    return null;
  };
  
  test('Extrae método de pago: transferencia', () => {
    expect(extractPaymentMethod('pago con transferencia')).toBe('transferencia');
    expect(extractPaymentMethod('transfe')).toBe('transferencia');
  });
  
  test('Extrae método de pago: tarjeta', () => {
    expect(extractPaymentMethod('pago con tarjeta')).toBe('tarjeta');
    expect(extractPaymentMethod('card')).toBe('tarjeta');
  });
  
  test('Extrae método de pago: efectivo', () => {
    expect(extractPaymentMethod('en efectivo')).toBe('efectivo');
  });
  
  test('No extrae método si no se menciona', () => {
    expect(extractPaymentMethod('quiero una cita')).toBeNull();
  });
});

console.log('✅ Tests configurados correctamente');
