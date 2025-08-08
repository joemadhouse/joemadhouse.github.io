# backend/app.py
from flask import Flask, request, jsonify
from barcode_processor import decode_base64_image, extract_barcodes
from flask_cors import CORS



app = Flask(__name__)
CORS(app)  # For local frontend testing, allow CORS

@app.route('/upload', methods=['POST'])
def upload():
    data = request.get_json()
    image_base64 = data.get('image')
    if not image_base64:
        return jsonify({'error': 'No image provided'}), 400

    try:
        image_bgr = decode_base64_image(image_base64)
        patient_id, accession_number = extract_barcodes(image_bgr)
        return jsonify({
            'patient_id': patient_id,
            'accession_number': accession_number
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

from flask import send_from_directory

# Serve the index page
@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')

# Serve JS and CSS assets
@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('../frontend/js', path)

@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('../frontend/css', path)
