window.addEventListener('load', function () {
    // --- Configuration ---
    const patientIdRegex = /^[A-Z]\d{6,7}[A-Z0-9]?$/i;
    const accessionRegex = /^PWH\d{9}[A-Z]$/i;

    // --- State Management ---
    // Use an object to track the found values to prevent them from being overwritten by subsequent scans.
    const foundCodes = {
        patientId: null,
        accessionNumber: null
    };

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

    // Function to process a set of barcode results (from video or canvas)
    function processAllBarcodes(barcodeResults) {
        let patientIdFound = false;
        let accessionFound = false;
        
        const uniqueBarcodeTexts = new Set(barcodeResults.map(result => result.getText()));

        uniqueBarcodeTexts.forEach(text => {
            const upperCaseText = text.toUpperCase();
            console.log(`Found barcode: ${upperCaseText}`);

            // Test and set Patient ID if not already found
            if (patientIdRegex.test(upperCaseText) && !foundCodes.patientId) {
                foundCodes.patientId = upperCaseText;
                updateResultUI(patientIdElement, upperCaseText, true);
                patientIdFound = true;
            }
            // Test and set Accession Number if not already found
            else if (accessionRegex.test(upperCaseText) && !foundCodes.accessionNumber) {
                foundCodes.accessionNumber = upperCaseText;
                updateResultUI(accessionNumberElement, upperCaseText, true);
                accessionFound = true;
            }
        });

        // If both codes are found, we can stop the continuous scan to save battery.
        if (foundCodes.patientId && foundCodes.accessionNumber) {
            codeReader.reset(); // Stop the video stream decoding
            console.log("Both codes found. Stopping continuous scan.");
        }

        return { patientIdFound, accessionFound };
    }

    // --- Event Listener for the Button ---
    scanButton.addEventListener('click', async () => {
        // Freeze Frame: The image data is copied from the video to the hidden canvas.
        // This creates our "photo" in memory.
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        canvasContext.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
        
        resetResults(); // Reset UI for the new manual scan

        try {
            // Scan the static image on the canvas. This is often more reliable.
            const results = await codeReader.decodeFromCanvas(canvasElement);
            if (results && results.length > 0) {
                console.log(`Manual scan found ${results.length} barcodes.`);
                const found = processAllBarcodes(results);

                // Provide feedback if one of the codes was still not found
                if (!found.patientIdFound) {
                    updateResultUI(patientIdElement, 'Not Found in Frame', false);
                }
                if (!found.accessionFound) {
                    updateResultUI(accessionNumberElement, 'Not Found in Frame', false);
                }
            } else {
                 alert("No barcodes could be read from the frozen frame.");
            }
        } catch (error) {
            if (error instanceof ZXing.NotFoundException) {
                alert("No barcode was found in the frozen frame. Please try again.");
            } else {
                console.error("An unexpected error occurred during canvas scan:", error);
                alert("An error occurred during the scan. Check console for details.");
            }
        }
    });

    // --- Start Continuous Scanning ---
    function startContinuousScan() {
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        }).then(stream => {
            videoElement.srcObject = stream;
            // The third argument to this function is a callback that runs on every successful scan.
            codeReader.decodeFromVideoDevice(videoElement, 'video', (result, err) => {
                if (result) {
                    // When a barcode is found, process it. We wrap it in an array to reuse our processing function.
                    console.log("Continuous scan found a barcode.");
                    processAllBarcodes([result]);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    // Log errors other than "not found" which is expected.
                    console.error(err);
                }
            });
            resetResults(); // Initial UI state
            updateResultUI(patientIdElement, '-- Scanning... --', null);
            updateResultUI(accessionNumberElement, '-- Scanning... --', null);

        }).catch(err => {
            console.error("Camera Access Error:", err);
            alert("Could not access camera. Please grant permission and ensure you are on a secure (HTTPS) connection.");
        });
    }

    // --- Helper Functions ---
    function resetResults() {
        foundCodes.patientId = null;
        foundCodes.accessionNumber = null;
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
    startContinuousScan();
});
