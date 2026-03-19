-- Migración para soporte de MediaMTX Cluster
-- Crea tablas para mapear cámaras a instancias

-- Tabla de instancias MediaMTX
CREATE TABLE IF NOT EXISTS mediamtx_instances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT NOT NULL UNIQUE,
  host VARCHAR(255) NOT NULL DEFAULT 'localhost',
  port INT NOT NULL,
  max_cameras INT DEFAULT 25,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_instance_id (instance_id),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla para mapear cámaras a instancias
CREATE TABLE IF NOT EXISTS camera_instance_mapping (
  camera_id VARCHAR(50) PRIMARY KEY,
  instance_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_instance_id (instance_id),
  FOREIGN KEY (instance_id) REFERENCES mediamtx_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar instancia por defecto (la actual)
INSERT INTO mediamtx_instances (instance_id, host, port, max_cameras) 
VALUES (1, 'localhost', 8888, 25)
ON DUPLICATE KEY UPDATE 
  host = VALUES(host),
  port = VALUES(port),
  max_cameras = VALUES(max_cameras);

-- Insertar instancias adicionales (comentadas por ahora)
-- Descomenta cuando necesites más instancias:
-- INSERT INTO mediamtx_instances (instance_id, host, port, max_cameras) VALUES
-- (2, 'localhost', 8889, 25),
-- (3, 'localhost', 8890, 25),
-- (4, 'localhost', 8891, 25);

-- Distribuir cámaras existentes a la instancia 1
INSERT INTO camera_instance_mapping (camera_id, instance_id)
SELECT mid, 1
FROM Monitors
WHERE mode = 'start'
ON DUPLICATE KEY UPDATE instance_id = 1;

-- Ver distribución actual
SELECT 
    i.instance_id,
    i.host,
    i.port,
    COUNT(c.camera_id) as cameras_assigned,
    i.max_cameras
FROM mediamtx_instances i
LEFT JOIN camera_instance_mapping c ON i.instance_id = c.instance_id
WHERE i.enabled = TRUE
GROUP BY i.instance_id, i.host, i.port, i.max_cameras;
