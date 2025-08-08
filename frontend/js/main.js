// main.js
import { startCamera, captureFrame, updateUI } from './camera.js';

window.addEventListener('DOMContentLoaded', () => {
  startCamera();

  document.getElementById('captureBtn').addEventListener('click', () => {
    const base64Image = captureFrame();
    updateUI('📤 Uploading image...', '');

    fetch('https://monkeyjoe.ddns.net/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
          })
      .then(res => res.json())
      .then(data => {
        if (data.patient_id && data.accession_number) {
          updateUI(`✅ Patient ID: ${data.patient_id}`, `✅ Accession #: ${data.accession_number}`);
        } else {
          updateUI('❌ Patient ID not found', '❌ Accession # not found');
        }
      })
      .catch(err => {
        updateUI('❌ Upload failed', '');
        console.error(err);
      });
  });
});
