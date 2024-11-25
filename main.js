// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker Registered'))
    .catch(err => console.error('Service Worker Registration Failed:', err));
}

// Initialize Variables
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const documentOptions = document.getElementById('document-options');
const previewContainer = document.getElementById('preview-container');
const generatePdfBtn = document.getElementById('generate-pdf');
const idInput = document.getElementById('id-number');
const clearCacheBtn = document.getElementById('clear-cache');
const viewLogsBtn = document.getElementById('view-logs');

let currentDocType = null;
let documents = {};

// Access the camera
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
  .then(stream => {
    video.srcObject = stream;
    video.play();
  })
  .catch(err => {
    console.error("Error accessing camera: ", err);
    alert("Cannot access camera. Please allow camera permissions.");
  });

// Handle Document Type Selection
documentOptions.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    currentDocType = e.target.getAttribute('data-doc');
    alert(`Selected Document Type: ${currentDocType}`);
  }
});

// Capture Image
captureBtn.addEventListener('click', () => {
  if (!currentDocType) {
    alert("Please select a document type before capturing.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const dataURL = canvas.toDataURL('image/png');
  documents[currentDocType] = dataURL;
  displayPreviews();
});

// Display Previews
function displayPreviews() {
  previewContainer.innerHTML = '';
  for (const [doc, imgSrc] of Object.entries(documents)) {
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = doc;
    img.title = doc;
    previewContainer.appendChild(img);
  }
}

// Format ID Number
idInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 13) value = value.slice(0, 13);
  let formatted = value;
  if (value.length > 0) formatted = value.slice(0,6) + ' ';
  if (value.length > 6) formatted += value.slice(6,10) + ' ';
  if (value.length > 10) formatted += value.slice(10,12) + ' ';
  if (value.length > 12) formatted += value.slice(12,13);
  e.target.value = formatted;
});

// Generate PDF
generatePdfBtn.addEventListener('click', async () => {
  const idNumber = idInput.value.replace(/\s/g, '');
  if (idNumber.length !== 13) {
    alert("ID Number must be 13 digits.");
    return;
  }

  // Ensure all documents are captured
  const requiredDocs = ["KB", "SSO", "HAZARD ID", "ID FRONT", "ID BACK"];
  for (const doc of requiredDocs) {
    if (!documents[doc]) {
      alert(`Please capture the ${doc} document.`);
      return;
    }
  }

  // Generate PDF using jsPDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  for (const [docType, imgData] of Object.entries(documents)) {
    doc.addPage();
    doc.text(docType, 10, 10);
    doc.addImage(imgData, 'PNG', 10, 20, 180, 160);
  }

  // Remove the first blank page
  doc.deletePage(1);

  // Format PDF name
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  const yyyy = today.getFullYear();
  const formattedDate = `${dd}-${mm}-${yyyy}`;
  const pdfName = `${idNumber}_${formattedDate}.pdf`;

  // Save PDF locally (optional)
  doc.save(pdfName);

  // Upload to Google Drive
  await uploadToGoogleDrive(pdfName, doc.output('blob'));

  alert("PDF generated and uploaded to Google Drive.");
});

// Clear Cache
clearCacheBtn.addEventListener('click', () => {
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
      alert("Cache cleared.");
    });
  }
});

// View Logs (Basic Implementation)
viewLogsBtn.addEventListener('click', () => {
  // Implement log viewing as needed
  alert("Log viewing is not implemented yet.");
});

// Google Drive Integration
async function uploadToGoogleDrive(fileName, fileBlob) {
  // Implement OAuth 2.0 flow and Google Drive API upload
  // This requires setting up OAuth credentials and handling authentication
  // For simplicity, refer to Google Drive API documentation:
  // https://developers.google.com/drive/api/v3/quickstart/js
  alert("Google Drive upload functionality is not implemented in this example.");
}
