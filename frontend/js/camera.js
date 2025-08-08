// camera.js
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    await video.play();
    updateUI('-- Ready to Scan --', '');
  } catch (err) {
    console.error('Camera error:', err);
    alert('Failed to access camera. Make sure to allow permissions.');
  }
}

function captureFrame() {
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg');
}

function updateUI(patientText, accessionText) {
  document.getElementById('patientStatus').textContent = patientText;
  document.getElementById('accessionStatus').textContent = accessionText;
}

export { startCamera, captureFrame, updateUI };
