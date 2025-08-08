# barcode_processor.py

import cv2
import numpy as np
from pyzbar.pyzbar import decode
import re
import base64
from io import BytesIO
from PIL import Image

PATIENT_ID_REGEX = r"[A-Z][0-9]{6,7}[A-Z0-9]"
ACCESSION_REGEX = r"PWH[0-9]{9}[A-Z]"

def decode_base64_image(base64_string):
    header, encoded = base64_string.split(',', 1)
    image_data = base64.b64decode(encoded)
    image = Image.open(BytesIO(image_data)).convert("RGB")
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

def extract_barcodes(image_bgr):
    decoded = decode(image_bgr)
    patient_id = None
    accession_number = None

    for obj in decoded:
        val = obj.data.decode('utf-8')
        if re.fullmatch(PATIENT_ID_REGEX, val):
            patient_id = val
        elif re.fullmatch(ACCESSION_REGEX, val):
            accession_number = val

    return patient_id, accession_number
