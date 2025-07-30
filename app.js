window.addEventListener('load', () => {
    const patientIdRegex = /^[A-Z]\d{6,7}[A-Z0-9]?$/i;
    const accessionRegex = /^PWH\d{9}[A-Z]$/i;

    const video = document.getElementById('video');
    const canvas = document.getElementById('frame-canvas');
    const ctx = canvas.getContext('2d');
    const scanButton = document.getElementById('scan-button');
    const patientIdElem = document.getElementById('patient-id');
    const accessionElem = document.getElementById('accession-number');

    // Initialize ZXing code reader with desired barcode formats
    const hints = new Map();
    const formats = [ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39, ZXing.BarcodeFormat.QR_CODE];
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
    const codeReader = new ZXing.BrowserMultiFormatReader(hints);

    // Open camera and show video stream, NO scanning here
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            await video.play();

            updateUI('-- Ready to Scan --', '-- Ready to Scan --');

        } catch (err) {
            console.error('Camera error:', err);
            alert('Failed to access camera. Make sure to allow permissions.');
        }
    }

    // When user clicks "Scan" button, capture current frame and scan barcodes
    scanButton.addEventListener('click', async () => {
        if (!video.videoWidth || !video.videoHeight) {
            alert('Video not ready yet. Please wait.');
            return;
        }

        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas (freeze frame)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        resetUI();

        try {
            // Scan barcodes from the static canvas image
            const results = await codeReader.decodeFromCanvas(canvas);

            if (!results) {
                alert('No barcode found in the image. Please try again.');
                updateUI('Not Found', 'Not Found');
                return;
            }

            // Helper function to process single or multiple barcodes uniformly
            const barcodeTexts = Array.isArray(results) ? results.map(r => r.getText()) : [results.getText()];

            let patientId = null;
            let accession = null;

            // Validate barcodes and assign values accordingly
            for (const textRaw of barcodeTexts) {
                const text = textRaw.toUpperCase();
                if (patientIdRegex.test(text)) patientId = text;
                else if (accessionRegex.test(text)) accession = text;
            }

            if (patientId) updateElement(patientIdElem, patientId, true);
            else updateElement(patientIdElem, 'Not Found / Invalid Format', false);

            if (accession) updateElement(accessionElem, accession, true);
            else updateElement(accessionElem, 'Not Found / Invalid Format', false);

        } catch (err) {
            if (err instanceof ZXing.NotFoundException) {
                alert('No barcode detected. Please adjust and retry.');
                updateUI('Not Found', 'Not Found');
            } else {
                console.error('Scan error:', err);
                alert('Error during scanning. Check console for details.');
            }
        }
    });

    function resetUI() {
        updateElement(patientIdElem, '-- Scanning --', null);
        updateElement(accessionElem, '-- Scanning --', null);
    }

    function updateUI(patientText, accessionText) {
        updateElement(patientIdElem, patientText, null);
        updateElement(accessionElem, accessionText, null);
    }

    function updateElement(elem, text, isValid) {
        elem.textContent = text;
        elem.classList.remove('valid', 'invalid');
        if (isValid === true) elem.classList.add('valid');
        else if (isValid === false) elem.classList.add('invalid');
    }

    startCamera();
});
