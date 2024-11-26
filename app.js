// app.js

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
    .then(reg => {
        console.log('Service Worker Registered:', reg);
    })
    .catch(err => {
        console.error('Service Worker Registration Failed:', err);
    });
}

const cameraStream = document.getElementById('camera-stream');
const captureButtons = document.querySelectorAll('.doc-button');
const previewsContainer = document.getElementById('previews-container');
const generatePdfButton = document.getElementById('generate-pdf');
const idNumberInput = document.getElementById('id-number');
const clearCacheButton = document.getElementById('clear-cache');
const viewLogsButton = document.getElementById('view-logs');
const captureButton = document.getElementById('capture-button');

let capturedDocs = {};
let logs = [];
let selectedDocType = null;

// Initialize Camera
async function initCamera() {
    try {
        console.log('Initializing camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        cameraStream.srcObject = stream;
        console.log('Camera initialized successfully.');
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Error accessing camera: ' + err.message);
        logAction(`Error accessing camera: ${err.message}`);
    }
}

// Call initCamera when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed.');
    initCamera();
});

// Handle Document Type Selection
captureButtons.forEach(button => {
    button.addEventListener('click', () => {
        console.log(`Document type button clicked: ${button.getAttribute('data-doc-type')}`);
        // Toggle active state
        if (button.classList.contains('active')) {
            button.classList.remove('active');
            selectedDocType = null;
            console.log(`Document type deselected: ${button.getAttribute('data-doc-type')}`);
            logAction(`Document type deselected: ${button.getAttribute('data-doc-type')}`);
        } else {
            captureButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedDocType = button.getAttribute('data-doc-type');
            console.log(`Document type selected: ${selectedDocType}`);
            logAction(`Document type selected: ${selectedDocType}`);
        }
    });
});

// Capture Photo
function capturePhoto() {
    console.log('Capture photo button clicked.');
    if (!cameraStream.srcObject) {
        alert('Camera is not initialized.');
        console.warn('Capture failed: Camera is not initialized.');
        logAction('Capture failed: Camera is not initialized.');
        return;
    }

    if (!selectedDocType) {
        alert('Please select a document type before capturing.');
        console.warn('Capture failed: No document type selected.');
        logAction('Capture failed: No document type selected.');
        return;
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = cameraStream.videoWidth;
        canvas.height = cameraStream.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');
        capturedDocs[selectedDocType] = dataURL;
        displayPreview(selectedDocType, dataURL);
        console.log(`Captured ${selectedDocType} successfully.`);
        logAction(`Captured ${selectedDocType} successfully.`);
    } catch (err) {
        console.error('Error capturing photo:', err);
        alert('Error capturing photo: ' + err.message);
        logAction(`Error capturing photo: ${err.message}`);
    }
}

// Display Preview
function displayPreview(docType, dataURL) {
    console.log(`Displaying preview for: ${docType}`);
    // Remove existing preview for the same docType
    const existingPreview = document.querySelector(`.preview[data-doc-type="${docType}"]`);
    if (existingPreview) {
        existingPreview.remove();
        console.log(`Removed existing preview for: ${docType}`);
        logAction(`Removed existing preview for: ${docType}`);
    }

    const preview = document.createElement('div');
    preview.classList.add('preview');
    preview.setAttribute('data-doc-type', docType);
    const img = document.createElement('img');
    img.src = dataURL;
    img.alt = `${docType} Preview`;
    preview.appendChild(img);
    previewsContainer.appendChild(preview);
    console.log(`Preview added for: ${docType}`);
    logAction(`Preview added for: ${docType}`);
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
    console.log(`ID Number input updated: ${e.target.value}`);
    logAction(`ID Number input updated: ${e.target.value}`);
});

// Generate PDF
async function generatePDF() {
    console.log('Generate PDF button clicked.');
    const { jsPDF } = window.jspdf;
    let doc;

    try {
        doc = new jsPDF();
        console.log('jsPDF instance created.');
        logAction('jsPDF instance created.');
    } catch (err) {
        console.error('Error creating jsPDF instance:', err);
        alert('Error creating PDF: ' + err.message);
        logAction(`Error creating jsPDF instance: ${err.message}`);
        return;
    }

    // Add ID Number
    const idNumber = idNumberInput.value.replace(/\s/g, '');
    if(idNumber.length !== 13){
        alert('ID Number must be 13 digits.');
        console.warn('Generate PDF failed: Invalid ID Number.');
        logAction('Generate PDF failed: Invalid ID Number.');
        return;
    }
    const formattedID = formatIDNumber(idNumber);
    doc.text(`ID Number: ${formattedID}`, 10, 10);
    console.log(`Added ID Number to PDF: ${formattedID}`);
    logAction(`Added ID Number to PDF: ${formattedID}`);

    // Add Date
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth()+1).padStart(2, '0')}/${today.getFullYear()}`;
    doc.text(`Date: ${dateStr}`, 10, 20);
    console.log(`Added Date to PDF: ${dateStr}`);
    logAction(`Added Date to PDF: ${dateStr}`);

    // Add Images
    let yOffset = 30;
    try {
        for (const [docType, dataURL] of Object.entries(capturedDocs)) {
            if (dataURL) {
                doc.text(docType, 10, yOffset);
                yOffset += 5;
                // Adjust image size as needed
                doc.addImage(dataURL, 'PNG', 10, yOffset, 180, 160);
                console.log(`Added image for ${docType} to PDF.`);
                logAction(`Added image for ${docType} to PDF.`);
                yOffset += 170;
                if(yOffset > 270){
                    doc.addPage();
                    yOffset = 10;
                    console.log('Added new page to PDF.');
                    logAction('Added new page to PDF.');
                }
            }
        }
    } catch (err) {
        console.error('Error adding images to PDF:', err);
        alert('Error adding images to PDF: ' + err.message);
        logAction(`Error adding images to PDF: ${err.message}`);
        return;
    }

    // Save PDF locally before uploading
    let pdfBlob;
    try {
        pdfBlob = doc.output('blob');
        console.log('PDF blob created successfully.');
        logAction('PDF blob created successfully.');
    } catch (err) {
        console.error('Error generating PDF blob:', err);
        alert('Error generating PDF: ' + err.message);
        logAction(`Error generating PDF blob: ${err.message}`);
        return;
    }

    // Name PDF
    const pdfName = `${idNumber}_${today.getDate()}_${today.getMonth()+1}_${today.getFullYear()}.pdf`;
    console.log(`PDF will be named: ${pdfName}`);
    logAction(`PDF will be named: ${pdfName}`);

    // Upload to Google Drive
    try {
        await uploadToGoogleDrive(pdfBlob, pdfName);
        alert('PDF generated and uploaded successfully!');
        console.log('PDF generated and uploaded successfully.');
        logAction('PDF generated and uploaded successfully.');
    } catch (err) {
        console.error('Error uploading PDF:', err);
        alert('Error uploading PDF: ' + err.message);
        logAction(`Error uploading PDF: ${err.message}`);
    }
}

// Google Drive Integration
let GoogleAuth; // Google Auth object.

// Load the Google API script
// Note: This script is already included in index.html via <script src="https://apis.google.com/js/api.js"></script>

function handleClientLoad() {
    console.log('Loading Google API client.');
    gapi.load('client:auth2', initClient);
}

function initClient() {
    console.log('Initializing Google API client.');
    gapi.client.init({
        apiKey: 'YOUR_NEW_API_KEY', // 🔒 Replace with your new API Key
        clientId: 'YOUR_NEW_CLIENT_ID.apps.googleusercontent.com', // 🔒 Replace with your new Client ID
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        scope: 'https://www.googleapis.com/auth/drive.file'
    }).then(() => {
        console.log('Google API client initialized successfully.');
        logAction('Google API client initialized successfully.');
        GoogleAuth = gapi.auth2.getAuthInstance();
        if (!GoogleAuth.isSignedIn.get()) {
            console.log('Signing in to Google.');
            logAction('Signing in to Google.');
            GoogleAuth.signIn().then(() => {
                console.log('Google sign-in successful.');
                logAction('Google sign-in successful.');
            }).catch(err => {
                console.error('Error during Google sign-in:', err);
                alert('Error during Google sign-in: ' + err.message);
                logAction(`Error during Google sign-in: ${err.message}`);
            });
        } else {
            console.log('Already signed in to Google.');
            logAction('Already signed in to Google.');
        }
    }).catch(err => {
        console.error('Error initializing Google API client:', err);
        alert('Error initializing Google API client: ' + JSON.stringify(err));
        logAction(`Error initializing Google API client: ${JSON.stringify(err)}`);
    });
}

async function uploadToGoogleDrive(blob, fileName) {
    console.log(`Uploading PDF to Google Drive: ${fileName}`);
    logAction(`Uploading PDF to Google Drive: ${fileName}`);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            console.log('PDF blob converted to base64.');
            logAction('PDF blob converted to base64.');

            gapi.client.drive.files.list({
                'q': "name='Employee test packs' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                'fields': 'files(id, name)'
            }).then(response => {
                let folderId;
                if(response.result.files.length > 0){
                    folderId = response.result.files[0].id;
                    console.log('Found existing "Employee test packs" folder:', folderId);
                    logAction(`Found existing "Employee test packs" folder: ${folderId}`);
                    uploadFile(folderId, base64Data, fileName).then(resolve).catch(reject);
                } else {
                    console.log('"Employee test packs" folder not found. Creating new folder.');
                    logAction('"Employee test packs" folder not found. Creating new folder.');
                    // Create folder
                    gapi.client.drive.files.create({
                        'resource': {
                            'name': 'Employee test packs',
                            'mimeType': 'application/vnd.google-apps.folder'
                        },
                        'fields': 'id'
                    }).then(folderResponse => {
                        folderId = folderResponse.result.id;
                        console.log('Created "Employee test packs" folder:', folderId);
                        logAction(`Created "Employee test packs" folder: ${folderId}`);
                        uploadFile(folderId, base64Data, fileName).then(resolve).catch(reject);
                    }).catch(err => {
                        console.error('Error creating "Employee test packs" folder:', err);
                        alert('Error creating folder: ' + err.message);
                        logAction(`Error creating "Employee test packs" folder: ${err.message}`);
                        reject(err);
                    });
                }
            }).catch(err => {
                console.error('Error listing folders:', err);
                alert('Error accessing Google Drive: ' + err.message);
                logAction(`Error listing folders: ${err.message}`);
                reject(err);
            });
        };
        reader.onerror = (error) => {
            console.error('Error reading blob:', error);
            alert('Error reading PDF blob: ' + error.message);
            logAction(`Error reading blob: ${error.message}`);
            reject(error);
        };
    });
}

function uploadFile(folderId, base64Data, fileName) {
    console.log(`Uploading file to folder ID: ${folderId}`);
    logAction(`Uploading file to folder ID: ${folderId}`);

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
    }).then(response => {
        console.log(`File uploaded successfully. File ID: ${response.result.id}`);
        logAction(`File uploaded successfully. File ID: ${response.result.id}`);
    }).catch(err => {
        console.error('Error uploading file:', err);
        alert('Error uploading file: ' + err.message);
        logAction(`Error uploading file: ${err.message}`);
        throw err;
    });
}

function b64toBlob(b64Data, contentType='', sliceSize=512) {
    console.log('Converting base64 data to Blob.');
    logAction('Converting base64 data to Blob.');

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

    const blob = new Blob(byteArrays, {type: contentType});
    console.log('Blob created successfully.');
    logAction('Blob created successfully.');
    return blob;
}

// Initialize Google API
function handleClientLoad() {
    console.log('Loading Google API client.');
    logAction('Loading Google API client.');
    gapi.load('client:auth2', initClient);
}

window.addEventListener('load', () => {
    handleClientLoad();
});

// Event Listeners
captureButton.addEventListener('click', capturePhoto);
generatePdfButton.addEventListener('click', generatePDF);

// Clear Cache
clearCacheButton.addEventListener('click', () => {
    console.log('Clear Cache button clicked.');
    logAction('Clear Cache button clicked.');
    if ('caches' in window) {
        caches.keys().then(names => {
            for (let name of names) {
                caches.delete(name);
                console.log(`Cache deleted: ${name}`);
                logAction(`Cache deleted: ${name}`);
            }
            alert('Cache cleared!');
            console.log('All caches cleared.');
            logAction('All caches cleared.');
        }).catch(err => {
            console.error('Error clearing cache:', err);
            alert('Error clearing cache: ' + err.message);
            logAction(`Error clearing cache: ${err.message}`);
        });
    } else {
        console.warn('Caches API not supported in this browser.');
        logAction('Caches API not supported in this browser.');
    }
});

// View Logs
viewLogsButton.addEventListener('click', () => {
    console.log('View Logs button clicked.');
    logAction('View Logs button clicked.');
    if (logs.length === 0) {
        alert('No logs to display.');
    } else {
        alert(logs.join('\n'));
    }
});

// Logging Function
function logAction(action) {
    const timestamp = new Date().toLocaleString();
    logs.push(`[${timestamp}] ${action}`);
    console.log(`Log: [${timestamp}] ${action}`);
}
