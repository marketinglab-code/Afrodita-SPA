#!/bin/bash

# Script de inicio rápido para ANICA
# Afrodita Spa - Sistema de Agendamiento

echo "🎀 ANICA - Sistema de Agendamiento Afrodita Spa"
echo "================================================"
echo ""

# Verificar que existe .env
if [ ! -f .env ]; then
    echo "❌ No se encontró el archivo .env"
    echo "   Copia .env.example a .env y configura las variables"
    echo "   cp .env.example .env"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "   Instala Node.js 20 o superior"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Node.js versión $NODE_VERSION detectada"
    echo "   Se requiere Node.js 20 o superior"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"
echo ""

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo ""
fi

# Preguntar si ejecutar migraciones
read -p "¿Ejecutar migraciones de base de datos? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🔄 Ejecutando migraciones..."
    npm run migrate
    echo ""
fi

# Preguntar modo de ejecución
echo "Selecciona modo de ejecución:"
echo "1) Desarrollo (con nodemon)"
echo "2) Producción"
read -p "Opción (1 o 2): " -n 1 -r
echo ""

if [[ $REPLY == "1" ]]; then
    echo "🚀 Iniciando en modo DESARROLLO..."
    npm run dev
elif [[ $REPLY == "2" ]]; then
    echo "🚀 Iniciando en modo PRODUCCIÓN..."
    npm start
else
    echo "❌ Opción inválida"
    exit 1
fi
