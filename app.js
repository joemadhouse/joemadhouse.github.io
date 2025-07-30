window.addEventListener('load', function () {
    // --- Configuration ---
    // Regular Expressions for validating the barcode formats
    const patientIdRegex = /^[A-Z]\d{6,7}[A-Z0-9]?$/i; // i flag for case-insensitive
    const accessionRegex = /^PWH\d{9}[A-Z]$/i; // i flag for case-insensitive

    // --- HTML Element References ---
    const videoElement = document.getElementById('video');
    const scanButton = document.getElementById('scan-button');
    const patientIdElement = document.getElementById('patient-id');
    const accessionNumberElement = document.getElementById('accession-number');

    // --- Initialize Barcode Reader ---
    // We specify a time hint to help the library perform faster.
    const hints = new Map();
    const formats = [
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.QR_CODE,
        ZXing.BarcodeFormat.DATA_MATRIX
    ];
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
    const codeReader = new ZXing.BrowserMultiFormatReader(hints);

    // --- Start Camera ---
    function startCamera() {
        // Request access to the rear camera of the phone
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        }).then(stream => {
            videoElement.srcObject = stream;
            videoElement.play();
        }).catch(err => {
            console.error("Camera Error:", err);
            alert("Could not access camera. Please grant permission and ensure you are on a secure (HTTPS) connection.");
        });
    }

    // --- Handle Scan Button Click ---
    scanButton.addEventListener('click', async () => {
        resetResults();
        try {
            // This captures the current video frame and attempts to decode barcodes from it.
            // The image data exists only in memory and is never stored as a file.
            const results = await codeReader.decodeFromVideoDevice(undefined, videoElement, (result, err) => {
                 // This callback is for continuous scanning, which we stop after first success.
                 if (result) {
                    codeReader.stopContinuousDecode();
                    processScanResults(result.getText());
                }
            });
            // We use `decodeOnceFromVideoElement` for a single-shot scan on button press.
            const result = await codeReader.decodeOnceFromVideoElement(videoElement);

            // Process Multiple Barcodes found in the single frame
            if (result) {
                 const barcodes = [result]; // Start with the first result
                 try {
                    // Try to decode more from the same frame
                    const moreResults = await codeReader.decodeMultipleFromVideoElement(videoElement);
                    if (moreResults && moreResults.length > 0) {
                        barcodes.push(...moreResults);
                    }
                 } catch (e) { /* It's okay if no more are found */ }
                 
                 processAllBarcodes(barcodes);
            }

        } catch (error) {
            if (error instanceof ZXing.NotFoundException) {
                alert("No barcode was found. Please position the document clearly in the camera view.");
            } else {
                console.error("Scanning Error:", error);
                alert("An error occurred during scanning.");
            }
        }
    });

    // --- Process All Found Barcodes ---
    function processAllBarcodes(barcodes) {
        let patientIdFound = false;
        let accessionFound = false;
        
        // Use a Set to avoid processing duplicate barcode reads from the same frame
        const uniqueBarcodeTexts = new Set(barcodes.map(b => b.getText()));

        uniqueBarcodeTexts.forEach(text => {
            console.log(`Found barcode: ${text}`);

            // Test against Patient ID format
            if (patientIdRegex.test(text)) {
                updateResultUI(patientIdElement, text, true);
                patientIdFound = true;
            }
            // Test against Accession Number format
            else if (accessionRegex.test(text)) {
                updateResultUI(accessionNumberElement, text, true);
                accessionFound = true;
            }
        });

        if (!patientIdFound) {
            updateResultUI(patientIdElement, 'Not Found / Invalid Format', false);
        }
        if (!accessionFound) {
            updateResultUI(accessionNumberElement, 'Not Found / Invalid Format', false);
        }
    }
    
    // --- Helper Functions ---
    function resetResults() {
        updateResultUI(patientIdElement, '-- Please Scan --', null);
        updateResultUI(accessionNumberElement, '-- Please Scan --', null);
    }
    
    function updateResultUI(element, text, isValid) {
        element.textContent = text;
        element.classList.remove('valid', 'invalid');
        if (isValid === true) {
            element.classList.add('valid');
        } else if (isValid === false) {
            element.classList.add('invalid');
        }
    }

    // --- Application Entry Point ---
    startCamera();
});
