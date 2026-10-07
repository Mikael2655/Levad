# -*- coding: utf-8 -*-
"""
Fabrique les icônes du programme (icone.ico pour Windows, icone.icns pour Mac) à partir du logo carré
intégré dans logos_levad.py. Utilisé uniquement au moment de la fabrication (nécessite Pillow).
"""
import base64
import io
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logos_levad import LOGO_CARRE_B64

logo = Image.open(io.BytesIO(base64.b64decode(LOGO_CARRE_B64))).convert("RGBA")   # 256 x 256
logo.save("icone.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
logo.save("icone.icns")
print("icone.ico et icone.icns créées")
