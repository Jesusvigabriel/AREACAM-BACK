# 🪟 AREACAM Backend - Instalación en Windows

Guía completa para instalar AREACAM Backend en Windows 10/11.

## 📋 Prerrequisitos

- Windows 10 o Windows 11
- Privilegios de Administrador
- Conexión a internet

---

## 🚀 Método 1: Instalación Automática (Recomendado)

### Opción A: PowerShell (Recomendado)

1. **Abrir PowerShell como Administrador**
   - Click derecho en el botón de Windows
   - Seleccionar "Windows PowerShell (Administrador)"

2. **Navegar a la carpeta del proyecto**
   ```powershell
   cd C:\ruta\a\AREACAM-BACK
   ```

3. **Permitir ejecución de scripts (si es necesario)**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

4. **Ejecutar instalación**
   ```powershell
   .\install.ps1
   ```

### Opción B: CMD (Símbolo del sistema)

1. **Abrir CMD como Administrador**
   - Buscar "cmd" en el menú inicio
   - Click derecho → "Ejecutar como administrador"

2. **Navegar a la carpeta del proyecto**
   ```cmd
   cd C:\ruta\a\AREACAM-BACK
   ```

3. **Ejecutar instalación**
   ```cmd
   install.bat
   ```

---

## 🔧 Método 2: Instalación Manual

### 1. Instalar Node.js

**Descargar e instalar Node.js 18.x:**
- Ir a: https://nodejs.org/dist/v18.20.0/node-v18.20.0-x64.msi
- Ejecutar el instalador
- Seguir el asistente (dejar opciones por defecto)
- Reiniciar terminal después de instalar

**Verificar instalación:**
```cmd
node -v
npm -v
```

### 2. Instalar MySQL

**Opción A: MySQL Installer (Recomendado)**
1. Descargar: https://dev.mysql.com/downloads/installer/
2. Ejecutar `mysql-installer-community-8.0.xx.msi`
3. Seleccionar "Developer Default"
4. Configurar contraseña root (recordarla)
5. Completar instalación

**Opción B: Chocolatey**
```powershell
# Abrir PowerShell como Administrador
choco install mysql -y
```

**Verificar instalación:**
```cmd
mysql --version
```

### 3. Configurar Base de Datos

**Abrir MySQL:**
```cmd
mysql -u root -p
```

**Ejecutar comandos SQL:**
```sql
CREATE DATABASE IF NOT EXISTS ccio;
CREATE USER IF NOT EXISTS 'majesticflame'@'localhost' IDENTIFIED BY 'Flame2020';
GRANT ALL PRIVILEGES ON ccio.* TO 'majesticflame'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Importar esquema y datos:**
```cmd
cd C:\ruta\a\AREACAM-BACK

mysql -u root -p ccio < database\schema.sql
mysql -u root -p ccio < database\initial-data.sql
mysql -u root -p ccio < migration-cluster.sql
```

### 4. Instalar Dependencias del Proyecto

```cmd
cd C:\ruta\a\AREACAM-BACK
npm install
```

### 5. Compilar TypeScript

```cmd
npm run build
```

### 6. Instalar PM2 (Gestor de Procesos)

```cmd
npm install -g pm2
npm install -g pm2-windows-startup

# Configurar inicio automático
pm2-startup install
```

### 7. Configurar Firewall de Windows

**Abrir PowerShell como Administrador:**

```powershell
# Backend API
New-NetFirewallRule -DisplayName "AREACAM Backend API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow

# MediaMTX RTSP
New-NetFirewallRule -DisplayName "MediaMTX RTSP" -Direction Inbound -LocalPort 8554 -Protocol TCP -Action Allow

# MediaMTX HLS
New-NetFirewallRule -DisplayName "MediaMTX HLS" -Direction Inbound -LocalPort 8888 -Protocol TCP -Action Allow

# MediaMTX WebRTC
New-NetFirewallRule -DisplayName "MediaMTX WebRTC" -Direction Inbound -LocalPort 8889 -Protocol TCP -Action Allow
```

**O manualmente:**
1. Abrir "Firewall de Windows Defender"
2. Click en "Configuración avanzada"
3. Click en "Reglas de entrada" → "Nueva regla"
4. Tipo: Puerto
5. Protocolo: TCP
6. Puertos: 4000, 8554, 8888, 8889
7. Acción: Permitir la conexión
8. Nombre: AREACAM Backend

---

## 🚀 Iniciar el Backend

### Con PM2 (Recomendado)

```cmd
# Iniciar backend
pm2 start dist\index.js --name areacam-backend

# Guardar configuración para inicio automático
pm2 save

# Ver estado
pm2 status

# Ver logs
pm2 logs areacam-backend
```

### Sin PM2 (Desarrollo)

```cmd
# Modo desarrollo (con recarga automática)
npm run dev

# Modo producción
npm start
```

---

## ✅ Verificar Instalación

### Verificar Backend

```cmd
# Ver estado de PM2
pm2 status

# Probar API (requiere curl o navegador)
curl http://localhost:4000/health
```

O abrir en navegador: http://localhost:4000/health

### Verificar Base de Datos

```cmd
mysql -u majesticflame -pFlame2020 ccio -e "SELECT COUNT(*) as total_cameras FROM Monitors;"
```

### Verificar Puertos

```cmd
netstat -an | findstr "4000"
netstat -an | findstr "8554"
netstat -an | findstr "8888"
```

---

## 🎥 Instalar MediaMTX (Streaming)

### 1. Descargar MediaMTX

Ir a: https://github.com/bluenviron/mediamtx/releases/latest

Descargar: `mediamtx_vX.X.X_windows_amd64.zip`

### 2. Extraer y Configurar

```cmd
# Extraer el ZIP a una carpeta (ej: C:\mediamtx)
# Copiar configuración
copy config\mediamtx.yml C:\mediamtx\mediamtx.yml
```

### 3. Iniciar MediaMTX

```cmd
cd C:\mediamtx
pm2 start mediamtx.exe --name mediamtx -- mediamtx.yml
pm2 save
```

---

## ⚙️ Configuración

### Editar Variables de Entorno

```cmd
notepad .env
```

**Variables principales:**
```env
SERVER_IP=http://localhost
PORT=4000
DB_HOST=127.0.0.1
DB_USER=majesticflame
DB_PASSWORD=Flame2020
DB_NAME=ccio
```

---

## 🔧 Comandos Útiles

### Gestión con PM2

```cmd
pm2 list                      # Listar procesos
pm2 logs areacam-backend      # Ver logs
pm2 restart areacam-backend   # Reiniciar
pm2 stop areacam-backend      # Detener
pm2 delete areacam-backend    # Eliminar
pm2 monit                     # Monitor en tiempo real
```

### Base de Datos

```cmd
# Conectar a MySQL
mysql -u majesticflame -pFlame2020 ccio

# Ver tablas
mysql -u majesticflame -pFlame2020 ccio -e "SHOW TABLES;"

# Ver cámaras
mysql -u majesticflame -pFlame2020 ccio -e "SELECT mid, name, host FROM Monitors LIMIT 10;"
```

### Servicios de Windows

```cmd
# Ver servicio MySQL
sc query MySQL80

# Iniciar MySQL
net start MySQL80

# Detener MySQL
net stop MySQL80
```

---

## 🐛 Solución de Problemas

### Error: "No se puede ejecutar scripts"

**Solución:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Error: "MySQL no encontrado"

**Solución:**
1. Verificar que MySQL está instalado
2. Agregar MySQL al PATH:
   - Variables de entorno → Path → Agregar: `C:\Program Files\MySQL\MySQL Server 8.0\bin`
3. Reiniciar terminal

### Error: "Puerto 4000 en uso"

**Solución:**
```cmd
# Ver qué proceso usa el puerto
netstat -ano | findstr :4000

# Matar proceso (reemplazar PID)
taskkill /PID [numero] /F

# O cambiar puerto en .env
notepad .env
```

### Error: "PM2 no encontrado"

**Solución:**
```cmd
# Reinstalar PM2
npm install -g pm2
npm install -g pm2-windows-startup

# Verificar instalación
pm2 -v
```

### Backend no inicia

**Solución:**
```cmd
# Ver logs detallados
pm2 logs areacam-backend --lines 100

# Verificar compilación
npm run build

# Iniciar en modo desarrollo para ver errores
npm run dev
```

### Error de conexión a MySQL

**Solución:**
```cmd
# Verificar que MySQL está corriendo
sc query MySQL80

# Iniciar MySQL
net start MySQL80

# Probar conexión
mysql -u majesticflame -pFlame2020 ccio -e "SELECT 1;"
```

---

## 🔄 Actualizar Backend

```cmd
# Detener backend
pm2 stop areacam-backend

# Actualizar código
git pull origin master

# Reinstalar dependencias
npm install

# Recompilar
npm run build

# Reiniciar
pm2 restart areacam-backend
```

---

## 🗑️ Desinstalar

```cmd
# Detener y eliminar procesos PM2
pm2 delete areacam-backend
pm2 delete mediamtx

# Eliminar base de datos
mysql -u root -p -e "DROP DATABASE ccio; DROP USER 'majesticflame'@'localhost';"

# Desinstalar Node.js (Panel de Control → Programas)
# Desinstalar MySQL (Panel de Control → Programas)

# Eliminar carpeta del proyecto
rmdir /s /q C:\ruta\a\AREACAM-BACK
```

---

## 📊 Inicio Automático con Windows

### Configurar PM2 para inicio automático

```cmd
# Instalar servicio de Windows
npm install -g pm2-windows-startup
pm2-startup install

# Iniciar backend
pm2 start dist\index.js --name areacam-backend

# Guardar configuración
pm2 save
```

Ahora el backend se iniciará automáticamente cuando Windows arranque.

---

## 🔗 Enlaces Útiles

- **Node.js**: https://nodejs.org/
- **MySQL**: https://dev.mysql.com/downloads/installer/
- **MediaMTX**: https://github.com/bluenviron/mediamtx
- **PM2**: https://pm2.keymetrics.io/
- **Chocolatey**: https://chocolatey.org/

---

## 📞 Soporte

- **Issues**: https://github.com/Jesusvigabriel/AREACAM-BACK/issues
- **Frontend**: https://github.com/Jesusvigabriel/AREACAM-FRONT
