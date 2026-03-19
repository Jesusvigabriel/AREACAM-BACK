# AREACAM Backend

Backend de AREACAM - Sistema de CCTV y NVR construido con Node.js, TypeScript, Express y MySQL.

## 🚀 Características

- **API REST** completa para gestión de cámaras
- **Streaming** integrado con MediaMTX (RTSP, HLS, WebRTC)
- **Detección de movimiento** con OpenCV
- **Grabaciones** programadas y por eventos
- **Multi-usuario** con roles y permisos
- **Grupos de cámaras** para organización
- **Cluster** de MediaMTX para escalabilidad
- **Notificaciones** por email

## 📋 Prerrequisitos

- Ubuntu 20.04+ / Debian 11+
- Acceso root/sudo
- Conexión a internet

## 🛠️ Instalación Rápida (Automática)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Jesusvigabriel/AREACAM-BACK.git
cd AREACAM-BACK

# 2. Ejecutar instalación automática
sudo ./install.sh

# 3. Iniciar el backend
pm2 start dist/index.js --name areacam-backend
pm2 save
```

**¡Listo!** El backend estará corriendo en `http://localhost:4000`

---

## 📦 ¿Qué instala el script automático?

El script `install.sh` realiza las siguientes tareas:

1. ✅ Actualiza el sistema
2. ✅ Instala Node.js 18.x
3. ✅ Instala MySQL Server
4. ✅ Crea base de datos `ccio`
5. ✅ Crea usuario `majesticflame` con password `Flame2020`
6. ✅ Importa esquema de base de datos
7. ✅ Importa **todas las cámaras preconfiguradas**
8. ✅ Instala dependencias de Node.js
9. ✅ Compila TypeScript
10. ✅ Instala PM2 para gestión de procesos
11. ✅ Configura firewall (puertos necesarios)

---

## ⚙️ Configuración

### Variables de Entorno

El archivo `.env` ya está configurado con valores por defecto. Si necesitas ajustar:

```bash
nano .env
```

**Variables principales:**

```env
# Servidor
SERVER_IP=https://apicamaras.areagrupo.com
PORT=4000

# Base de datos
DB_HOST=127.0.0.1
DB_USER=majesticflame
DB_PASSWORD=Flame2020
DB_NAME=ccio

# Streaming
HLS_BASE_URL=https://streamcamaras.areagrupo.com
WEBRTC_BASE_URL=https://webrtccamaras.areagrupo.com
RTSP_BASE_URL=rtsp://rtspcamaras.areagrupo.com
```

Ver `.env.example` para todas las opciones disponibles.

---

## 🔌 Puertos Necesarios

El backend requiere los siguientes puertos abiertos:

| Puerto | Protocolo | Uso |
|--------|-----------|-----|
| 4000 | TCP | API Backend |
| 8554 | TCP | RTSP Streaming |
| 8888 | TCP | HLS Streaming |
| 8889 | TCP | WebRTC Streaming |
| 3306 | TCP | MySQL (solo localhost) |

**Configuración automática de firewall:**

```bash
sudo ufw allow 4000/tcp
sudo ufw allow 8554/tcp
sudo ufw allow 8888/tcp
sudo ufw allow 8889/tcp
```

Ver [FIREWALL.md](FIREWALL.md) para configuración detallada.

---

## 🗄️ Base de Datos

### Estructura

La base de datos `ccio` incluye las siguientes tablas principales:

- **Monitors** - Configuración de cámaras
- **Users** - Usuarios del sistema
- **API** - Claves de API
- **CameraGroups** - Grupos de cámaras
- **Events** - Eventos de detección
- **Videos** - Grabaciones
- **camera_instance_mapping** - Mapeo de cámaras a instancias MediaMTX

### Datos Iniciales

El script de instalación importa automáticamente:

- ✅ **Todas las cámaras** con sus configuraciones
- ✅ **Usuarios** del sistema
- ✅ **Grupos de cámaras**
- ✅ **Configuración de cluster** MediaMTX

### Acceso a MySQL

```bash
# Conectar a MySQL
mysql -u majesticflame -pFlame2020 ccio

# Ver cámaras configuradas
mysql -u majesticflame -pFlame2020 ccio -e "SELECT mid, name, host FROM Monitors;"

# Ver usuarios
mysql -u majesticflame -pFlame2020 ccio -e "SELECT uid, mail, details FROM Users;"
```

---

## 🚀 Uso

### Iniciar Backend

```bash
# Con PM2 (recomendado)
pm2 start dist/index.js --name areacam-backend
pm2 save

# Modo desarrollo
npm run dev

# Modo producción (directo)
npm start
```

### Gestión con PM2

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs areacam-backend

# Reiniciar
pm2 restart areacam-backend

# Detener
pm2 stop areacam-backend

# Eliminar
pm2 delete areacam-backend
```

### Verificar Funcionamiento

```bash
# Health check
curl http://localhost:4000/health

# Listar cámaras
curl http://localhost:4000/api/monitors

# Ver configuración
curl http://localhost:4000/api/config
```

---

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── routes/               # Rutas de API
│   │   ├── monitors.ts       # Gestión de cámaras
│   │   ├── auth.ts           # Autenticación
│   │   ├── recordings.ts     # Grabaciones
│   │   └── config.ts         # Configuración
│   ├── services/             # Lógica de negocio
│   ├── middleware/           # Middlewares
│   └── utils/                # Utilidades
├── database/
│   ├── schema.sql            # Esquema completo
│   └── initial-data.sql      # Datos iniciales (cámaras)
├── scripts/                  # Scripts de utilidad
├── config/
│   └── mediamtx.yml          # Configuración MediaMTX
├── .env                      # Variables de entorno
├── install.sh                # Script de instalación
├── package.json              # Dependencias
└── tsconfig.json             # Configuración TypeScript
```

---

## 🔗 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/logout` - Logout

### Cámaras (Monitors)
- `GET /api/monitors` - Listar todas las cámaras
- `GET /api/monitors/:id` - Obtener cámara específica
- `POST /api/monitors` - Crear nueva cámara
- `PUT /api/monitors/:id` - Actualizar cámara
- `DELETE /api/monitors/:id` - Eliminar cámara
- `GET /api/monitors/:id/status` - Estado de cámara

### Grupos de Cámaras
- `GET /api/camera-groups` - Listar grupos
- `POST /api/camera-groups` - Crear grupo
- `PUT /api/camera-groups/:id` - Actualizar grupo
- `DELETE /api/camera-groups/:id` - Eliminar grupo

### Grabaciones
- `GET /api/recordings` - Listar grabaciones
- `GET /api/recordings/:id` - Descargar grabación
- `DELETE /api/recordings/:id` - Eliminar grabación

### Configuración
- `GET /api/config` - Obtener configuración
- `PUT /api/config` - Actualizar configuración

---

## 🎥 MediaMTX (Streaming)

### Configuración

El archivo `config/mediamtx.yml` está preconfigurado para:

- **RTSP**: Puerto 8554
- **HLS**: Puerto 8888
- **WebRTC**: Puerto 8889

### Iniciar MediaMTX

```bash
# Descargar MediaMTX
wget https://github.com/bluenviron/mediamtx/releases/download/v1.0.0/mediamtx_v1.0.0_linux_amd64.tar.gz
tar -xzf mediamtx_v1.0.0_linux_amd64.tar.gz

# Copiar configuración
cp config/mediamtx.yml ./

# Iniciar
./mediamtx mediamtx.yml
```

### URLs de Streaming

```bash
# RTSP
rtsp://localhost:8554/nombre-camara

# HLS
http://localhost:8888/nombre-camara

# WebRTC
http://localhost:8889/nombre-camara
```

---

## 🐛 Troubleshooting

### Error de conexión a MySQL

```bash
# Verificar que MySQL está corriendo
sudo systemctl status mysql

# Reiniciar MySQL
sudo systemctl restart mysql

# Verificar credenciales
mysql -u majesticflame -pFlame2020 ccio -e "SELECT 1;"
```

### Puerto 4000 ya en uso

```bash
# Ver qué proceso usa el puerto
sudo lsof -i :4000

# Cambiar puerto en .env
nano .env
# PORT=4001
```

### Backend no inicia

```bash
# Ver logs de PM2
pm2 logs areacam-backend

# Ver logs del sistema
journalctl -u areacam-backend -f

# Verificar compilación
npm run build
```

### Cámaras no se ven

```bash
# Verificar que MediaMTX está corriendo
ps aux | grep mediamtx

# Verificar URLs en base de datos
mysql -u majesticflame -pFlame2020 ccio -e "SELECT mid, name, host FROM Monitors LIMIT 5;"

# Probar RTSP directamente
ffplay rtsp://localhost:8554/nombre-camara
```

---

## 📊 Monitoreo

### Logs

```bash
# Logs de PM2
pm2 logs areacam-backend

# Logs del sistema
tail -f /var/log/syslog | grep areacam

# Logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

### Métricas

```bash
# Uso de recursos
pm2 monit

# Estado de procesos
pm2 status

# Información del sistema
htop
```

---

## 🔄 Actualización

```bash
# Detener backend
pm2 stop areacam-backend

# Actualizar código
git pull origin main

# Reinstalar dependencias
npm install

# Recompilar
npm run build

# Reiniciar
pm2 restart areacam-backend
```

---

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

---

## 📄 Licencia

Este proyecto es parte de AREACAM - Sistema de CCTV Open Source.

---

## 📞 Soporte

- **Documentación**: Ver archivos `.md` en el repositorio
- **Issues**: https://github.com/Jesusvigabriel/AREACAM-BACK/issues
- **Email**: soporte@areacam.com

---

## 🔗 Enlaces Relacionados

- **Frontend**: https://github.com/Jesusvigabriel/AREACAM-FRONT
- **MediaMTX**: https://github.com/bluenviron/mediamtx
- **Documentación completa**: Ver archivos en `/docs`
