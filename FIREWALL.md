# 🔥 Configuración de Firewall y Puertos

## 📋 Puertos Requeridos

### **Backend API**
- **Puerto**: `4000/tcp`
- **Protocolo**: HTTP/HTTPS
- **Uso**: API REST del backend
- **Acceso**: Público (desde frontend)

### **Base de Datos MySQL**
- **Puerto**: `3306/tcp`
- **Protocolo**: MySQL
- **Uso**: Base de datos
- **Acceso**: Solo localhost (NO abrir públicamente)

### **MediaMTX - Streaming**
- **Puerto**: `8554/tcp`
- **Protocolo**: RTSP
- **Uso**: Streaming RTSP de cámaras
- **Acceso**: Público

- **Puerto**: `8888/tcp`
- **Protocolo**: HTTP
- **Uso**: Streaming HLS
- **Acceso**: Público

- **Puerto**: `8889/tcp`
- **Protocolo**: WebRTC
- **Uso**: Streaming WebRTC
- **Acceso**: Público

### **Nginx (Opcional - si se usa reverse proxy)**
- **Puerto**: `80/tcp`
- **Protocolo**: HTTP
- **Uso**: Redirección a HTTPS
- **Acceso**: Público

- **Puerto**: `443/tcp`
- **Protocolo**: HTTPS
- **Uso**: Acceso seguro
- **Acceso**: Público

---

## 🛡️ Configuración de UFW (Ubuntu/Debian)

### Instalación de UFW
```bash
sudo apt-get install ufw
```

### Configuración Básica
```bash
# Permitir SSH (importante para no perder acceso)
sudo ufw allow 22/tcp

# Backend API
sudo ufw allow 4000/tcp comment 'AREACAM Backend API'

# MediaMTX Streaming
sudo ufw allow 8554/tcp comment 'MediaMTX RTSP'
sudo ufw allow 8888/tcp comment 'MediaMTX HLS'
sudo ufw allow 8889/tcp comment 'MediaMTX WebRTC'

# Si usas Nginx
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Activar firewall
sudo ufw enable

# Ver estado
sudo ufw status numbered
```

### Verificar Puertos Abiertos
```bash
sudo ufw status verbose
```

---

## 🔧 Configuración de iptables (Alternativa)

```bash
# Backend API
sudo iptables -A INPUT -p tcp --dport 4000 -j ACCEPT

# MediaMTX
sudo iptables -A INPUT -p tcp --dport 8554 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8888 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8889 -j ACCEPT

# Guardar reglas
sudo iptables-save > /etc/iptables/rules.v4
```

---

## ☁️ Configuración en Cloud Providers

### **AWS EC2**
1. Ve a **Security Groups**
2. Edita **Inbound Rules**
3. Agrega reglas:
   - Type: Custom TCP, Port: 4000, Source: 0.0.0.0/0
   - Type: Custom TCP, Port: 8554, Source: 0.0.0.0/0
   - Type: Custom TCP, Port: 8888, Source: 0.0.0.0/0
   - Type: Custom TCP, Port: 8889, Source: 0.0.0.0/0

### **Google Cloud Platform**
```bash
# Backend API
gcloud compute firewall-rules create areacam-api \
  --allow tcp:4000 \
  --source-ranges 0.0.0.0/0

# MediaMTX
gcloud compute firewall-rules create areacam-streaming \
  --allow tcp:8554,tcp:8888,tcp:8889 \
  --source-ranges 0.0.0.0/0
```

### **Azure**
1. Ve a **Network Security Groups**
2. Agrega **Inbound security rules**
3. Configura puertos: 4000, 8554, 8888, 8889

### **DigitalOcean**
1. Ve a **Networking** → **Firewalls**
2. Crea nuevo firewall
3. Agrega **Inbound Rules**:
   - TCP 4000
   - TCP 8554
   - TCP 8888
   - TCP 8889

---

## ✅ Verificación de Puertos

### Verificar que los puertos están escuchando
```bash
# Ver todos los puertos en uso
sudo netstat -tulpn | grep LISTEN

# Verificar puerto específico
sudo lsof -i :4000
sudo lsof -i :8888
```

### Probar conectividad desde otra máquina
```bash
# Probar API
curl http://TU_IP:4000/health

# Probar HLS
curl http://TU_IP:8888/

# Probar RTSP (con ffmpeg)
ffplay rtsp://TU_IP:8554/nombre-camara
```

### Escanear puertos abiertos
```bash
# Instalar nmap
sudo apt-get install nmap

# Escanear puertos
nmap -p 4000,8554,8888,8889 localhost
```

---

## 🚨 Seguridad Recomendada

### ⚠️ NO Exponer MySQL
```bash
# MySQL debe estar solo en localhost
# Verificar que MySQL NO esté en 0.0.0.0
sudo netstat -tulpn | grep 3306

# Debe mostrar: 127.0.0.1:3306 (NO 0.0.0.0:3306)
```

### 🔒 Usar HTTPS en Producción
```bash
# Instalar Certbot para SSL gratuito
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d apicamaras.areagrupo.com
```

### 🛡️ Limitar Acceso por IP (Opcional)
```bash
# Solo permitir acceso desde IPs específicas
sudo ufw allow from 192.168.1.0/24 to any port 4000
```

---

## 📊 Monitoreo de Conexiones

```bash
# Ver conexiones activas
sudo netstat -an | grep :4000

# Ver intentos de conexión
sudo tail -f /var/log/ufw.log

# Monitorear tráfico en tiempo real
sudo tcpdump -i any port 4000
```

---

## 🔧 Troubleshooting

### Puerto ya en uso
```bash
# Ver qué proceso usa el puerto
sudo lsof -i :4000

# Matar proceso si es necesario
sudo kill -9 PID
```

### Firewall bloqueando conexiones
```bash
# Desactivar temporalmente para probar
sudo ufw disable

# Reactivar después
sudo ufw enable
```

### Verificar logs de firewall
```bash
sudo tail -f /var/log/ufw.log
sudo journalctl -u ufw -f
```
