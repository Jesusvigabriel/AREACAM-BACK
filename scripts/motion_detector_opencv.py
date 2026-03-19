#!/usr/bin/env python3
"""
Detector de movimiento profesional usando OpenCV MOG2
Background Subtraction para videovigilancia
"""

import cv2
import numpy as np
import sys
import json
import argparse
from datetime import datetime
import os

class MotionDetectorMOG2:
    def __init__(self, sensitivity=70, min_area=500, capture_duration=5):
        """
        Args:
            sensitivity: 0-100, donde 100 es más sensible
            min_area: Área mínima en píxeles para considerar movimiento
            capture_duration: Segundos de video a analizar
        """
        self.sensitivity = sensitivity
        self.min_area = min_area
        self.capture_duration = capture_duration
        
        # Mapear sensibilidad (0-100) a varThreshold de MOG2
        # Valores más bajos = más sensible
        # Rango típico: 4-40
        self.var_threshold = 40 - (sensitivity / 100) * 36  # 40 a 4
        
        # Crear el background subtractor MOG2
        self.back_sub = cv2.createBackgroundSubtractorMOG2(
            history=500,  # Número de frames para el modelo de background
            varThreshold=self.var_threshold,  # Umbral de varianza
            detectShadows=True  # Detectar y marcar sombras
        )
        
        # Kernel para operaciones morfológicas (reducir ruido)
        self.kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        
    def detect_motion(self, rtsp_url, output_path):
        """
        Detecta movimiento en el stream RTSP
        
        Returns:
            dict: {
                'motion_detected': bool,
                'snapshot_path': str or None,
                'motion_frames': int,
                'total_frames': int,
                'max_contour_area': int,
                'error': str or None
            }
        """
        result = {
            'motion_detected': False,
            'snapshot_path': None,
            'motion_frames': 0,
            'total_frames': 0,
            'max_contour_area': 0,
            'error': None
        }
        
        cap = None
        try:
            # Abrir stream RTSP
            cap = cv2.VideoCapture(rtsp_url)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reducir buffer para menor latencia
            
            if not cap.isOpened():
                result['error'] = 'No se pudo abrir el stream RTSP'
                return result
            
            # Obtener FPS del stream (o usar 15 por defecto)
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0 or fps > 60:
                fps = 15
            
            max_frames = int(fps * self.capture_duration)
            frame_count = 0
            motion_frames = 0
            max_area = 0
            best_frame = None
            best_frame_motion_area = 0
            
            print(f"[opencv-detector] Analizando {max_frames} frames (~{self.capture_duration}s) con sensibilidad {self.sensitivity}%", file=sys.stderr)
            
            while frame_count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Redimensionar para procesamiento más rápido
                small_frame = cv2.resize(frame, (640, 360))
                
                # Aplicar background subtraction
                fg_mask = self.back_sub.apply(small_frame)
                
                # Eliminar sombras (valor 127 en MOG2)
                _, fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
                
                # Operaciones morfológicas para reducir ruido
                fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, self.kernel)
                fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, self.kernel)
                
                # Encontrar contornos de objetos en movimiento
                contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                # Analizar contornos
                frame_has_motion = False
                for contour in contours:
                    area = cv2.contourArea(contour)
                    if area > self.min_area:
                        frame_has_motion = True
                        max_area = max(max_area, area)
                        
                        # Guardar el frame con mayor área de movimiento
                        if area > best_frame_motion_area:
                            best_frame_motion_area = area
                            best_frame = frame.copy()
                
                if frame_has_motion:
                    motion_frames += 1
            
            result['total_frames'] = frame_count
            result['motion_frames'] = motion_frames
            result['max_contour_area'] = int(max_area)
            
            # Considerar movimiento detectado si al menos 10% de frames tienen movimiento
            motion_threshold = max(1, frame_count * 0.1)
            result['motion_detected'] = motion_frames >= motion_threshold
            
            # Guardar snapshot si se detectó movimiento
            if result['motion_detected'] and best_frame is not None:
                cv2.imwrite(output_path, best_frame)
                result['snapshot_path'] = output_path
                print(f"[opencv-detector] ✅ MOVIMIENTO DETECTADO: {motion_frames}/{frame_count} frames, área máxima: {max_area}px", file=sys.stderr)
            else:
                print(f"[opencv-detector] ❌ Sin movimiento: {motion_frames}/{frame_count} frames, área máxima: {max_area}px", file=sys.stderr)
            
        except Exception as e:
            result['error'] = str(e)
            print(f"[opencv-detector] Error: {e}", file=sys.stderr)
        finally:
            if cap is not None:
                cap.release()
        
        return result


def main():
    parser = argparse.ArgumentParser(description='Detector de movimiento con OpenCV MOG2')
    parser.add_argument('--rtsp-url', required=True, help='URL RTSP de la cámara')
    parser.add_argument('--output', required=True, help='Ruta para guardar snapshot')
    parser.add_argument('--sensitivity', type=int, default=70, help='Sensibilidad 0-100 (default: 70)')
    parser.add_argument('--min-area', type=int, default=500, help='Área mínima en píxeles (default: 500)')
    parser.add_argument('--duration', type=int, default=5, help='Duración de captura en segundos (default: 5)')
    
    args = parser.parse_args()
    
    # Crear directorio de salida si no existe
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    # Crear detector y ejecutar
    detector = MotionDetectorMOG2(
        sensitivity=args.sensitivity,
        min_area=args.min_area,
        capture_duration=args.duration
    )
    
    result = detector.detect_motion(args.rtsp_url, args.output)
    
    # Imprimir resultado como JSON
    print(json.dumps(result))
    
    # Exit code: 0 si detectó movimiento, 1 si no
    sys.exit(0 if result['motion_detected'] else 1)


if __name__ == '__main__':
    main()
