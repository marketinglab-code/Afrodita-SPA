/**
 * Sistema de activación/desactivación temporal de ANICA
 * Permite alternar entre bots en el mismo número de WhatsApp
 */

class BotSwitch {
  constructor() {
    this.isActive = process.env.BOT_ACTIVE === 'true';
  }

  /**
   * Verifica si el bot está activo
   */
  isEnabled() {
    return this.isActive;
  }

  /**
   * Activa el bot
   */
  enable() {
    this.isActive = true;
    console.log('✅ ANICA activada');
  }

  /**
   * Desactiva el bot
   */
  disable() {
    this.isActive = false;
    console.log('⏸️ ANICA desactivada');
  }

  /**
   * Alterna el estado del bot
   */
  toggle() {
    this.isActive = !this.isActive;
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
