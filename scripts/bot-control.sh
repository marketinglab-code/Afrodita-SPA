#!/bin/bash

# Script de control de ANICA
# Permite activar/desactivar el bot remotamente

# URL de tu servidor Heroku
SERVER_URL="${ANICA_SERVER_URL:-https://anica-gpt.herokuapp.com}"
ADMIN_SECRET="${ADMIN_SECRET}"

if [ -z "$ADMIN_SECRET" ]; then
  echo "❌ Error: ADMIN_SECRET no está definido"
  echo "Usa: export ADMIN_SECRET='tu-secret-aqui'"
  exit 1
fi

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para activar el bot
enable_bot() {
  echo -e "${YELLOW}Activando ANICA...${NC}"
  response=$(curl -s -X POST "$SERVER_URL/bot/enable" \
    -H "x-admin-secret: $ADMIN_SECRET")
  
  if echo "$response" | grep -q "enabled"; then
    echo -e "${GREEN}✅ ANICA activada exitosamente${NC}"
  else
    echo -e "${RED}❌ Error al activar: $response${NC}"
  fi
}

# Función para desactivar el bot
disable_bot() {
  echo -e "${YELLOW}Desactivando ANICA...${NC}"
  response=$(curl -s -X POST "$SERVER_URL/bot/disable" \
    -H "x-admin-secret: $ADMIN_SECRET")
  
  if echo "$response" | grep -q "disabled"; then
    echo -e "${GREEN}⏸️ ANICA desactivada exitosamente${NC}"
  else
    echo -e "${RED}❌ Error al desactivar: $response${NC}"
  fi
}

# Función para alternar el estado
toggle_bot() {
  echo -e "${YELLOW}Alternando estado de ANICA...${NC}"
  response=$(curl -s -X POST "$SERVER_URL/bot/toggle" \
    -H "x-admin-secret: $ADMIN_SECRET")
  
  if echo "$response" | grep -q "enabled"; then
    echo -e "${GREEN}✅ ANICA activada${NC}"
  elif echo "$response" | grep -q "disabled"; then
    echo -e "${GREEN}⏸️ ANICA desactivada${NC}"
  else
    echo -e "${RED}❌ Error: $response${NC}"
  fi
}

# Función para ver el estado
status_bot() {
  echo -e "${YELLOW}Consultando estado...${NC}"
  response=$(curl -s "$SERVER_URL/bot/status")
  
  if echo "$response" | grep -q '"enabled":true'; then
    echo -e "${GREEN}✅ ANICA está ACTIVA${NC}"
  elif echo "$response" | grep -q '"enabled":false'; then
    echo -e "${RED}⏸️ ANICA está DESACTIVADA${NC}"
  else
    echo -e "${RED}❌ No se pudo obtener el estado: $response${NC}"
  fi
}

# Menu principal
case "$1" in
  enable|on|activar)
    enable_bot
    ;;
  disable|off|desactivar)
    disable_bot
    ;;
  toggle|cambiar)
    toggle_bot
    ;;
  status|estado)
    status_bot
    ;;
  *)
    echo "🤖 Control de ANICA"
    echo ""
    echo "Uso: $0 {enable|disable|toggle|status}"
    echo ""
    echo "Comandos:"
    echo "  enable    - Activa ANICA (empieza a responder)"
    echo "  disable   - Desactiva ANICA (deja de responder)"
    echo "  toggle    - Alterna entre activo/inactivo"
    echo "  status    - Muestra el estado actual"
    echo ""
    echo "Ejemplos:"
    echo "  $0 enable"
    echo "  $0 disable"
    echo "  $0 status"
    exit 1
    ;;
esac
