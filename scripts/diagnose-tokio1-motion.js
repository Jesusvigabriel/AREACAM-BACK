#!/usr/bin/env node

/**
 * Script de diagnóstico en tiempo real para Tokio 1
 * Verifica configuración y prueba detección de movimiento
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');

// Crear conexión directa
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ccio',
  waitForConnections: true,
  connectionLimit: 10,
});

async function diagnoseMotion() {
  try {
    console.log('🔍 DIAGNÓSTICO DE DETECCIÓN DE MOVIMIENTO - TOKIO 1\n');
    console.log('=' .repeat(60));
    
    // 1. Buscar cámara Tokio 1
    const [monitors] = await db.query(
      `SELECT mid, name, ke, details, mode, type 
       FROM Monitors 
       WHERE name LIKE '%TOKIO-01%' OR name LIKE '%TOKIO%1%'
       LIMIT 1`
    );
    
    if (monitors.length === 0) {
      console.log('❌ No se encontró cámara Tokio 1');
      process.exit(1);
    }
    
    const monitor = monitors[0];
    console.log('\n📹 CÁMARA ENCONTRADA:');
    console.log(`   ID: ${monitor.mid}`);
    console.log(`   Nombre: ${monitor.name}`);
    console.log(`   Modo: ${monitor.mode}`);
    console.log(`   Tipo: ${monitor.type}`);
    
    // 2. Parsear configuración
    let details = {};
    try {
      details = JSON.parse(monitor.details || '{}');
    } catch (e) {
      console.log('⚠️  Error parseando detalles');
    }
    
    const motionEnabled = details.areacam_motion_enabled;
    const notifyEmail = details.areacam_notify_email;
    const sensitivity = details.areacam_motion_sensitivity || 60;
    const schedule = details.areacam_schedule || {};
    
    console.log('\n⚙️  CONFIGURACIÓN DE MOVIMIENTO:');
    console.log(`   Detección habilitada: ${motionEnabled ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Notificaciones email: ${notifyEmail ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Sensibilidad: ${sensitivity}%`);
    
    // 3. Verificar horarios
    console.log('\n📅 HORARIOS DE GRABACIÓN:');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    days.forEach((day, idx) => {
      const daySchedule = schedule[day];
      if (daySchedule && daySchedule.recordStart && daySchedule.recordEnd) {
        console.log(`   ${dayNames[idx]}: ${daySchedule.recordStart} - ${daySchedule.recordEnd}`);
      } else {
        console.log(`   ${dayNames[idx]}: Sin grabación programada`);
      }
    });
    
    // 4. Verificar hora actual
    const now = new Date();
    const currentDay = days[now.getDay() === 0 ? 6 : now.getDay() - 1]; // Ajustar domingo
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const todaySchedule = schedule[currentDay];
    
    console.log(`\n🕐 HORA ACTUAL: ${currentTime} (${dayNames[days.indexOf(currentDay)]})`);
    
    let isWithinSchedule = false;
    if (todaySchedule && todaySchedule.recordStart && todaySchedule.recordEnd) {
      isWithinSchedule = currentTime >= todaySchedule.recordStart && currentTime < todaySchedule.recordEnd;
      console.log(`   Horario hoy: ${todaySchedule.recordStart} - ${todaySchedule.recordEnd}`);
      console.log(`   Estado: ${isWithinSchedule ? '🔴 DENTRO del horario (grabando)' : '✅ FUERA del horario (detectando)'}`);
    } else {
      console.log(`   Horario hoy: Sin grabación programada`);
      console.log(`   Estado: ✅ FUERA del horario (detectando)`);
    }
    
    // 5. Verificar URLs de stream
    console.log('\n🎥 STREAMS DISPONIBLES:');
    const groupKey = monitor.ke;
    const cameraId = monitor.mid;
    
    const hlsUrl = `http://localhost:8888/${groupKey}_${cameraId}/index.m3u8`;
    const rtspUrl = `rtsp://localhost:8554/${groupKey}_${cameraId}`;
    
    console.log(`   HLS: ${hlsUrl}`);
    console.log(`   RTSP: ${rtspUrl}`);
    
    // 6. Verificar logs recientes
    console.log('\n📋 EVENTOS RECIENTES (últimos 5 minutos):');
    const { execSync } = require('child_process');
    try {
      const logs = execSync(
        `tail -n 500 /home/camaras-area54/AREACAM/areacam/backend/logs/backend-out.log | grep -i "tokio-01\\|${cameraId}" | tail -n 10`,
        { encoding: 'utf-8' }
      );
      if (logs.trim()) {
        console.log(logs);
      } else {
        console.log('   (Sin eventos recientes)');
      }
    } catch (e) {
      console.log('   (No se pudieron leer logs)');
    }
    
    // 7. Recomendaciones
    console.log('\n💡 DIAGNÓSTICO:');
    
    if (!motionEnabled) {
      console.log('   ❌ La detección de movimiento está DESHABILITADA');
      console.log('   → Habilitar con: areacam_motion_enabled = true');
    }
    
    if (!notifyEmail) {
      console.log('   ❌ Las notificaciones por email están DESHABILITADAS');
      console.log('   → Habilitar con: areacam_notify_email = true');
    }
    
    if (isWithinSchedule) {
      console.log('   ⚠️  La cámara está DENTRO del horario de grabación');
      console.log('   → Durante este horario graba continuamente y NO envía alertas');
      console.log('   → Las alertas solo se envían FUERA del horario de grabación');
    }
    
    if (sensitivity < 70) {
      console.log(`   ⚠️  Sensibilidad baja (${sensitivity}%)`);
      console.log('   → Considerar aumentar a 80-90% para movimientos sutiles');
    }
    
    if (motionEnabled && notifyEmail && !isWithinSchedule) {
      console.log('   ✅ Configuración correcta para detección de movimiento');
      console.log('   ✅ Debería enviar alertas cuando detecte movimiento');
      console.log('\n   🔍 Si no llegó la alerta, posibles causas:');
      console.log('      1. OpenCV no confirmó movimiento real (falso positivo inicial)');
      console.log('      2. Configuración SMTP incorrecta');
      console.log('      3. Sensibilidad muy baja para el tipo de movimiento');
    }
    
    console.log('\n' + '='.repeat(60));
    
    // 8. Comando para prueba manual
    console.log('\n🧪 PRUEBA MANUAL:');
    console.log(`   Para probar detección en tiempo real, ejecuta:`);
    console.log(`   cd /home/camaras-area54/AREACAM/areacam/backend`);
    console.log(`   python3 scripts/motion_detector_opencv.py "${rtspUrl}" ${sensitivity}`);
    
    console.log('\n✅ Diagnóstico completado\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

diagnoseMotion();
