window.addEventListener('load', () => {
    // Regex for Patient ID and Accession Number
    const patientIdRegex = /^[A-Z]\d{6,7}[A-Z0-9]?$/i;
    const accessionRegex = /^PWH\d{9}[A-Z]$/i;

    // DOM elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('frame-canvas');
    const ctx = canvas.getContext('2d');
    const scanButton = document.getElementById('scan-button');
    const patientIdElem = document.getElementById('patient-id');
    const accessionElem = document.getElementById('accession-number');

    // ZXing code reader setup (Code 128, Code 39, QR)
    const hints = new Map();
    const formats = [
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.QR_CODE
    ];
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
    const codeReader = new ZXing.BrowserMultiFormatReader(hints);

    // Start camera and show video stream
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

    // Scan multiple regions
    async function scanMultipleBarcodesFromCanvas(mainCanvas, codeReader, cropW = 250, cropH = 250, offset = 150) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const detectedBarcodes = [];

        for (let x = 0; x <= mainCanvas.width - cropW; x += offset) {
            for (let y = 0; y <= mainCanvas.height - cropH; y += offset) {
                tempCanvas.width = cropW;
                tempCanvas.height = cropH;
                tempCtx.clearRect(0, 0, cropW, cropH);
                tempCtx.drawImage(mainCanvas, x, y, cropW, cropH, 0, 0, cropW, cropH);

                try {
                    const result = await codeReader.decodeFromCanvas(tempCanvas);
                    const text = result.getText();
                    if (text && !detectedBarcodes.includes(text)) {
                        detectedBarcodes.push(text);
                    }
                } catch (err) {
                    // Ignore if barcode not found in this tile
                }
            }
        }
        return detectedBarcodes;
    }

    // UI helpers
    function resetUI() {
        updateElement(patientIdElem, '-- Scanning... --', null);
        updateElement(accessionElem, '-- Scanning... --', null);
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

    // Event handler: freeze frame and scan
    scanButton.addEventListener('click', async () => {
        if (!video.videoWidth || !video.videoHeight) {
            alert('Video not ready yet. Please wait.');
            return;
        }

        // Draw current video frame to hidden canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        resetUI();

        // Scan using tile-based workaround
        let barcodeTexts = [];
        try {
            barcodeTexts = await scanMultipleBarcodesFromCanvas(canvas, codeReader);
        } catch (err) {
            console.error('Scan error:', err);
            alert('Error during scanning. Check console for details.');
        }

        // Validate and assign
        let patientId = null;
        let accession = null;
        for (const textRaw of barcodeTexts) {
            const text = textRaw.toUpperCase();
            if (!patientId && patientIdRegex.test(text)) patientId = text;
            else if (!accession && accessionRegex.test(text)) accession = text;
        }

        // UI update
        if (patientId) updateElement(patientIdElem, patientId, true);
        else updateElement(patientIdElem, 'Not Found / Invalid Format', false);

        if (accession) updateElement(accessionElem, accession, true);
        else updateElement(accessionElem, 'Not Found / Invalid Format', false);

        // If no barcodes found at all
        if (barcodeTexts.length === 0) {
            alert('No barcode found in the image. Please try again.');
            updateUI('Not Found', 'Not Found');
        }
    });

    startCamera();
});
