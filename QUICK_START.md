# 🚀 AREACAM Backend - Inicio Rápido

## ⚡ Instalación en 3 Pasos

### 1️⃣ Clonar Repositorio
```bash
git clone https://github.com/Jesusvigabriel/AREACAM-BACK.git
cd AREACAM-BACK
```

### 2️⃣ Ejecutar Instalación Automática
```bash
sudo ./install.sh
```

**Esto instalará automáticamente:**
- ✅ Node.js 18.x
- ✅ MySQL Server
- ✅ Base de datos `ccio` con todas las tablas
- ✅ Todas las cámaras preconfiguradas
- ✅ Dependencias de Node.js
- ✅ PM2 para gestión de procesos
- ✅ Configuración de firewall

### 3️⃣ Iniciar Backend
```bash
pm2 start dist/index.js --name areacam-backend
pm2 save
```

**¡Listo!** El backend está corriendo en `http://localhost:4000`

---

## ✅ Verificar Instalación

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs areacam-backend

# Probar API
curl http://localhost:4000/health

# Ver cámaras configuradas
curl http://localhost:4000/api/monitors
```

---

## 🔧 Configuración Rápida

### Cambiar Puerto (opcional)
```bash
nano .env
# Cambiar: PORT=4000 a PORT=8080
pm2 restart areacam-backend
```

### Ver Cámaras en Base de Datos
```bash
mysql -u majesticflame -pFlame2020 ccio -e "SELECT mid, name, host FROM Monitors LIMIT 10;"
```

---

## 🔌 Puertos a Abrir en Firewall

```bash
# Backend API
sudo ufw allow 4000/tcp

# MediaMTX Streaming
sudo ufw allow 8554/tcp  # RTSP
sudo ufw allow 8888/tcp  # HLS
sudo ufw allow 8889/tcp  # WebRTC
```

---

## 🎥 Iniciar MediaMTX (Streaming)

```bash
# Descargar MediaMTX
wget https://github.com/bluenviron/mediamtx/releases/download/v1.0.0/mediamtx_v1.0.0_linux_amd64.tar.gz
tar -xzf mediamtx_v1.0.0_linux_amd64.tar.gz

# Usar configuración incluida
cp config/mediamtx.yml ./

# Iniciar con PM2
pm2 start ./mediamtx --name mediamtx -- mediamtx.yml
pm2 save
```

---

## 📊 Comandos Útiles

### Gestión con PM2
```bash
pm2 status              # Ver estado
pm2 logs areacam-backend  # Ver logs
pm2 restart areacam-backend  # Reiniciar
pm2 stop areacam-backend     # Detener
```

### Base de Datos
```bash
# Conectar a MySQL
mysql -u majesticflame -pFlame2020 ccio

# Ver todas las tablas
mysql -u majesticflame -pFlame2020 ccio -e "SHOW TABLES;"

# Contar cámaras
mysql -u majesticflame -pFlame2020 ccio -e "SELECT COUNT(*) FROM Monitors;"
```

### Logs del Sistema
```bash
# Logs de PM2
pm2 logs

# Logs del sistema
tail -f /var/log/syslog | grep areacam

# Logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

---

## 🐛 Solución de Problemas

### Backend no inicia
```bash
# Ver logs detallados
pm2 logs areacam-backend --lines 100

# Verificar compilación
npm run build

# Verificar puerto
sudo lsof -i :4000
```

### Error de MySQL
```bash
# Verificar que MySQL está corriendo
sudo systemctl status mysql

# Reiniciar MySQL
sudo systemctl restart mysql

# Probar conexión
mysql -u majesticflame -pFlame2020 ccio -e "SELECT 1;"
```

### Puerto ya en uso
```bash
# Ver qué proceso usa el puerto
sudo lsof -i :4000

# Matar proceso
sudo kill -9 PID

# O cambiar puerto en .env
nano .env
```

---

## 🔗 Conectar con Frontend

El frontend debe apuntar a:
```env
VITE_API_URL=http://TU_IP
VITE_API_PORT=4000
```

---

## 📚 Documentación Completa

- **README.md** - Documentación completa
- **FIREWALL.md** - Configuración de puertos y firewall
- **.env.example** - Variables de entorno disponibles

---

## 🆘 Soporte

- **Issues**: https://github.com/Jesusvigabriel/AREACAM-BACK/issues
- **Frontend**: https://github.com/Jesusvigabriel/AREACAM-FRONT
