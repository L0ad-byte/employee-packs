// app.js

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
    .then(reg => console.log('Service Worker Registered', reg))
    .catch(err => console.log('Service Worker Registration Failed', err));
}

const cameraStream = document.getElementById('camera-stream');
const captureButtons = document.querySelectorAll('#capture-buttons button');
const previewsContainer = document.getElementById('previews-container');
const generatePdfButton = document.getElementById('generate-pdf');
const idNumberInput = document.getElementById('id-number');
const clearCacheButton = document.getElementById('clear-cache');
const viewLogsButton = document.getElementById('view-logs');

let capturedDocs = {};
let logs = [];

// Initialize Camera
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        cameraStream.srcObject = stream;
    } catch (err) {
        alert('Error accessing camera: ' + err);
    }
}

// Capture Photo
function capturePhoto(docType) {
    const canvas = document.createElement('canvas');
    canvas.width = cameraStream.videoWidth;
    canvas.height = cameraStream.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/png');
    capturedDocs[docType] = dataURL;
    displayPreview(docType, dataURL);
    logAction(`Captured ${docType}`);
}

// Display Preview
function displayPreview(docType, dataURL) {
    const preview = document.createElement('div');
    preview.classList.add('preview');
    preview.setAttribute('data-doc-type', docType);
    const img = document.createElement('img');
    img.src = dataURL;
    preview.appendChild(img);
    previewsContainer.appendChild(preview);
}

// Format ID Number
function formatIDNumber(id) {
    return id.replace(/(\d{6})(\d{4})(\d{2})(\d)/, '$1 $2 $3 $4');
}

// Handle ID Input Formatting
idNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '').substring(0,13);
    if(value.length > 0){
        value = formatIDNumber(value);
    }
    e.target.value = value;
});

// Generate PDF
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add ID Number
    const idNumber = idNumberInput.value.replace(/\s/g, '');
    if(idNumber.length !== 13){
        alert('ID Number must be 13 digits.');
        return;
    }
    const formattedID = formatIDNumber(idNumber);
    doc.text(`ID Number: ${formattedID}`, 10, 10);

    // Add Date
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth()+1).padStart(2, '0')}/${today.getFullYear()}`;
    doc.text(`Date: ${dateStr}`, 10, 20);

    // Add Images
    let yOffset = 30;
    for (const [docType, dataURL] of Object.entries(capturedDocs)) {
        if (dataURL) {
            doc.text(docType, 10, yOffset);
            yOffset += 5;
            doc.addImage(dataURL, 'PNG', 10, yOffset, 180, 160);
            yOffset += 170;
            if(yOffset > 270){
                doc.addPage();
                yOffset = 10;
            }
        }
    }

    // Save PDF locally before uploading
    const pdfBlob = doc.output('blob');

    // Name PDF
    const pdfName = `${idNumber}_${today.getDate()}_${today.getMonth()+1}_${today.getFullYear()}.pdf`;

    // Upload to Google Drive
    try {
        await uploadToGoogleDrive(pdfBlob, pdfName);
        alert('PDF generated and uploaded successfully!');
        logAction(`Generated and uploaded PDF: ${pdfName}`);
    } catch (err) {
        alert('Error uploading PDF: ' + err);
    }
}

// Google Drive Integration
let GoogleAuth; // Google Auth object.

function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: 'YOUR_API_KEY',
        clientId: 'YOUR_CLIENT_ID',
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        scope: 'https://www.googleapis.com/auth/drive.file'
    }).then(() => {
        GoogleAuth = gapi.auth2.getAuthInstance();
        if (!GoogleAuth.isSignedIn.get()) {
            GoogleAuth.signIn();
        }
    });
}

async function uploadToGoogleDrive(blob, fileName) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            gapi.client.drive.files.list({
                'q': "name='Employee test packs' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                'fields': 'files(id, name)'
            }).then(response => {
                let folderId;
                if(response.result.files.length > 0){
                    folderId = response.result.files[0].id;
                } else {
                    // Create folder
                    gapi.client.drive.files.create({
                        'resource': {
                            'name': 'Employee test packs',
                            'mimeType': 'application/vnd.google-apps.folder'
                        },
                        'fields': 'id'
                    }).then(folderResponse => {
                        folderId = folderResponse.result.id;
                        uploadFile(folderId, base64Data, fileName).then(resolve).catch(reject);
                    });
                    return;
                }
                uploadFile(folderId, base64Data, fileName).then(resolve).catch(reject);
            }).catch(reject);
        };
        reader.onerror = reject;
    });
}

function uploadFile(folderId, base64Data, fileName) {
    return gapi.client.drive.files.create({
        'resource': {
            'name': fileName,
            'parents': [folderId]
        },
        'media': {
            'mimeType': 'application/pdf',
            'body': b64toBlob(base64Data, 'application/pdf')
        },
        'fields': 'id'
    });
}

function b64toBlob(b64Data, contentType='', sliceSize=512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
  
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
  
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
  
    return new Blob(byteArrays, {type: contentType});
}

// Initialize Google API
// Load the Google API script
const script = document.createElement('script');
script.src = "https://apis.google.com/js/api.js";
script.onload = handleClientLoad;
document.body.appendChild(script);

// Event Listeners
captureButtons.forEach(button => {
    button.addEventListener('click', () => {
        const docType = button.getAttribute('data-doc-type');
        capturePhoto(docType);
    });
});

generatePdfButton.addEventListener('click', generatePDF);

// Clear Cache
clearCacheButton.addEventListener('click', () => {
    if ('caches' in window) {
        caches.keys().then(names => {
            for (let name of names) {
                caches.delete(name);
            }
            alert('Cache cleared!');
            logAction('Cache cleared');
        });
    }
});

// View Logs
viewLogsButton.addEventListener('click', () => {
    alert(logs.join('\n'));
});

// Logging Function
function logAction(action) {
    const timestamp = new Date().toLocaleString();
    logs.push(`[${timestamp}] ${action}`);
}
