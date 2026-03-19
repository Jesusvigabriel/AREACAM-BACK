#!/bin/bash

# Script para probar el endpoint de guardado de grupos de cámaras

# Obtener credenciales válidas
echo "Obteniendo credenciales..."
CREDS=$(curl -s http://localhost:4000/debug/credentials)
echo "Credenciales: $CREDS"

# Extraer ke y uid del primer usuario
KE=$(echo $CREDS | jq -r '.credentials[0].ke')
USER_ID=$(echo $CREDS | jq -r '.credentials[0].uid')

echo ""
echo "Usando credenciales:"
echo "  ke: $KE"
echo "  uid: $USER_ID"
echo ""

# Probar crear un grupo de cámaras
echo "Probando POST /camera-groups..."
echo ""

# Test 1: Grupo válido
echo "Test 1: Grupo válido con todos los campos"
curl -X POST http://localhost:4000/camera-groups \
  -H "Content-Type: application/json" \
  -H "x-group-key: $KE" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "name": "Grupo Test 1",
    "cameraIds": ["cam1", "cam2"],
    "gridSize": 4,
    "isDefault": false
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 2: Grupo sin campos opcionales
echo "Test 2: Grupo sin campos opcionales"
curl -X POST http://localhost:4000/camera-groups \
  -H "Content-Type: application/json" \
  -H "x-group-key: $KE" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "name": "Grupo Test 2",
    "cameraIds": ["cam3", "cam4", "cam5"]
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 3: Grupo con más de 6 cámaras (debería fallar)
echo "Test 3: Grupo con más de 6 cámaras (debería fallar)"
curl -X POST http://localhost:4000/camera-groups \
  -H "Content-Type: application/json" \
  -H "x-group-key: $KE" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "name": "Grupo Test 3",
    "cameraIds": ["cam1", "cam2", "cam3", "cam4", "cam5", "cam6", "cam7"]
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 4: Grupo sin nombre (debería fallar)
echo "Test 4: Grupo sin nombre (debería fallar)"
curl -X POST http://localhost:4000/camera-groups \
  -H "Content-Type: application/json" \
  -H "x-group-key: $KE" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "cameraIds": ["cam1", "cam2"]
  }' | jq '.'

echo ""
echo "---"
echo ""

# Listar todos los grupos
echo "Listando todos los grupos..."
curl -s http://localhost:4000/camera-groups \
  -H "x-group-key: $KE" \
  -H "x-user-id: $USER_ID" | jq '.'
