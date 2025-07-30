window.addEventListener('load', function () {
    // --- Configuration ---
    // Regular Expressions for validating the barcode formats.
    // The 'i' flag makes matching case-insensitive.
    const patientIdRegex = /^[A-Z]\d{6,7}[A-Z0-9]?$/i;
    const accessionRegex = /^PWH\d{9}[A-Z]$/i;

    // --- HTML Element References ---
    const videoElement = document.getElementById('video');
    const scanButton = document.getElementById('scan-button');
    const patientIdElement = document.getElementById('patient-id');
    const accessionNumberElement = document.getElementById('accession-number');

    // --- Initialize Barcode Reader ---
    // We give the library a "hint" to only look for common 1D/2D barcode formats to improve performance.
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
    // This function is called when the page loads.
    function startCamera() {
        // Request access to the 'environment' (rear) camera.
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        }).then(stream => {
            // If permission is granted, set the video source to the camera stream.
            videoElement.srcObject = stream;
            videoElement.play();
        }).catch(err => {
            // Log the full error to the console for debugging.
            console.error("Camera Access Error:", err);
            alert("Could not access camera. Please grant permission and ensure you are on a secure (HTTPS) connection.");
        });
    }

    // --- Handle Scan Button Click ---
    // This is the corrected logic.
    scanButton.addEventListener('click', async () => {
        resetResults(); // Clear previous results from the UI.

        try {
            // The core of our logic: Attempt to decode all barcodes from the current video frame.
            // The image data exists only in memory and is never stored.
            const results = await codeReader.decodeMultipleFromVideoElement(videoElement);
            
            if (results && results.length > 0) {
                processAllBarcodes(results);
            } else {
                // This handles the case where the scan is successful but no barcodes are detected.
                updateResultUI(patientIdElement, 'Not Found', false);
                updateResultUI(accessionNumberElement, 'Not Found', false);
            }

        } catch (error) {
            // This 'catch' block handles errors during the decoding process.
            if (error instanceof ZXing.NotFoundException) {
                // This specific error means no barcodes could be located/read in the frame.
                alert("No barcode was found. Please position the document clearly in the camera view.");
            } else {
                // For any other unexpected errors, log the details to the console for debugging.
                console.error("An unexpected scanning error occurred:", error);
                alert("An error occurred during scanning. Check the browser console for details.");
            }
        }
    });

    // --- Process All Found Barcodes ---
    function processAllBarcodes(barcodeResults) {
        let patientIdFound = false;
        let accessionFound = false;
        
        // Use a Set to avoid processing duplicate barcode values if the library reads the same one multiple times.
        const uniqueBarcodeTexts = new Set(barcodeResults.map(result => result.getText()));

        uniqueBarcodeTexts.forEach(text => {
            const upperCaseText = text.toUpperCase(); // Standardize to uppercase for reliable matching.
            console.log(`Found and processing barcode: ${upperCaseText}`);

            // Test against Patient ID format
            if (patientIdRegex.test(upperCaseText)) {
                updateResultUI(patientIdElement, upperCaseText, true);
                patientIdFound = true;
            }
            // Test against Accession Number format
            else if (accessionRegex.test(upperCaseText)) {
                updateResultUI(accessionNumberElement, upperCaseText, true);
                accessionFound = true;
            }
        });

        // If after checking all barcodes, a type was not found, update the UI to reflect that.
        if (!patientIdFound) {
            updateResultUI(patientIdElement, 'Not Found / Invalid Format', false);
        }
        if (!accessionFound) {
            updateResultUI(accessionNumberElement, 'Not Found / Invalid Format', false);
        }
    }
    
    // --- Helper Functions ---
    // Resets the UI to its initial state.
    function resetResults() {
        updateResultUI(patientIdElement, '-- Please Scan --', null);
        updateResultUI(accessionNumberElement, '-- Please Scan --', null);
    }
    
    // Updates a specific part of the UI (Patient ID or Accession #) with the result.
    function updateResultUI(element, text, isValid) {
        element.textContent = text;
        element.classList.remove('valid', 'invalid'); // Reset styling
        if (isValid === true) {
            element.classList.add('valid');
        } else if (isValid === false) {
            element.classList.add('invalid');
        }
    }

    // --- Application Entry Point ---
    // Start the camera as soon as the page has finished loading.
    startCamera();
});
