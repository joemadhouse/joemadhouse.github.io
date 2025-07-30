window.addEventListener('load', function () {
    // --- Configuration ---
    const patientIdRegex = /^[A-Z]\d{6,7}[A-Z0-9]?$/i;
    const accessionRegex = /^PWH\d{9}[A-Z]$/i;

    // --- State Management ---
    const foundCodes = {
        patientId: null,
        accessionNumber: null
    };
    let isContinuousScanActive = false; // Flag to prevent multiple scan initializations

    // --- HTML Element References ---
    const videoElement = document.getElementById('video');
    const canvasElement = document.getElementById('frame-canvas');
    const canvasContext = canvasElement.getContext('2d');
    const scanButton = document.getElementById('scan-button');
    const patientIdElement = document.getElementById('patient-id');
    const accessionNumberElement = document.getElementById('accession-number');

    // --- Initialize Barcode Reader ---
    const hints = new Map();
    const formats = [ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39, ZXing.BarcodeFormat.QR_CODE];
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
    const codeReader = new ZXing.BrowserMultiFormatReader(hints);

    // --- Main Logic ---

    // Function to process a set of barcode results
    function processAllBarcodes(barcodeResults) {
        // ... (This function's internal logic remains the same as before)
        const uniqueBarcodeTexts = new Set(barcodeResults.map(result => result.getText()));
        let wasPatientIdFoundThisScan = false;
        let wasAccessionFoundThisScan = false;

        uniqueBarcodeTexts.forEach(text => {
            const upperCaseText = text.toUpperCase();
            if (patientIdRegex.test(upperCaseText) && !foundCodes.patientId) {
                foundCodes.patientId = upperCaseText;
                updateResultUI(patientIdElement, upperCaseText, true);
                wasPatientIdFoundThisScan = true;
            } else if (accessionRegex.test(upperCaseText) && !foundCodes.accessionNumber) {
                foundCodes.accessionNumber = upperCaseText;
                updateResultUI(accessionNumberElement, upperCaseText, true);
                wasAccessionFoundThisScan = true;
            }
        });

        if (foundCodes.patientId && foundCodes.accessionNumber && isContinuousScanActive) {
            codeReader.reset();
            isContinuousScanActive = false;
            console.log("Both codes found. Stopping continuous scan.");
        }
        return { patientIdFound: wasPatientIdFoundThisScan, accessionFound: wasAccessionFoundThisScan };
    }

    // --- Event Listener for the Button ---
    scanButton.addEventListener('click', async () => {
        if (!videoElement.srcObject) {
            alert("Camera is not active. Please allow camera permissions.");
            return;
        }
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        canvasContext.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
        
        resetResultsForManualScan();

        try {
            const results = await codeReader.decodeFromCanvas(canvasElement);
            if (results && results.length > 0) {
                const found = processAllBarcodes(results);
                if (!found.patientIdFound) updateResultUI(patientIdElement, 'Not Found in Frame', false);
                if (!found.accessionFound) updateResultUI(accessionNumberElement, 'Not Found in Frame', false);
            } else {
                 alert("No barcodes could be read from the frozen frame.");
            }
        } catch (error) {
            if (error instanceof ZXing.NotFoundException) {
                alert("No barcode was found in the frozen frame.");
            } else {
                console.error("Canvas scan error:", error);
                alert("An error occurred during the scan.");
            }
        }
    });

    // --- Application Entry Point ---
    // This is the new, more robust camera startup sequence.
    function startCamera() {
        resetInitialUI();
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        }).then(stream => {
            videoElement.srcObject = stream;
            
            // **THE CRITICAL FIX IS HERE**
            // We listen for the 'playing' event. This event only fires when the browser
            // has successfully started rendering video frames from the stream.
            videoElement.addEventListener('playing', () => {
                // Only start the continuous scan once we are SURE the video is playing.
                if (!isContinuousScanActive) {
                    console.log("Video is playing. Starting continuous scan.");
                    isContinuousScanActive = true;
                    codeReader.decodeFromVideoDevice(videoElement.id, 'video', (result, err) => {
                        if (result) {
                            processAllBarcodes([result]);
                        }
                        if (err && !(err instanceof ZXing.NotFoundException)) {
                            console.error("Continuous scan error:", err);
                        }
                    });
                }
            });

            // We must explicitly call play() on the video element to trigger the stream.
            // On some browsers (like Safari on iOS), this might only work if inside an event
            // handler from a user gesture, but getUserMedia often provides an exception.
            // The 'playing' event listener above will handle success or failure gracefully.
            videoElement.play().catch(e => console.error("Video play error:", e));

        }).catch(err => {
            console.error("Camera Access Error:", err);
            alert("Could not access camera. Please grant permission and ensure you are on a secure (HTTPS) connection.");
        });
    }

    // --- Helper Functions ---
    function resetInitialUI() {
        foundCodes.patientId = null;
        foundCodes.accessionNumber = null;
        updateResultUI(patientIdElement, '-- Starting Camera... --', null);
        updateResultUI(accessionNumberElement, '-- Starting Camera... --', null);
    }

    function resetResultsForManualScan() {
        // When scanning manually, we want to clear and re-validate both fields from the new frame.
        foundCodes.patientId = null;
        foundCodes.accessionNumber = null;
        updateResultUI(patientIdElement, '-- Scanning Frame... --', null);
        updateResultUI(accessionNumberElement, '-- Scanning Frame... --', null);
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

    // --- Start the application ---
    startCamera();
});
