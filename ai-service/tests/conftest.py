"""Configura sys.path para que los tests importen desde ai-service/."""
import sys
import os

# Agrega el directorio raíz de ai-service al path para que `from models.risk import ...` funcione
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
