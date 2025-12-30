// Admin Panel Logic
const API_URL = "https://script.google.com/macros/s/AKfycbyInS5VHsrewilnPYokOEASU2uwOmB_gAUYd4x29Y0QUNrshk4QaHbqLjGUGa3OWNbLwg/exec";

let inventory = [];

// Default PIN (You can change this)
const ADMIN_PIN = "9526452423";

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in this session
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        showDashboard();
    }
});

function checkLogin() {
    const pinInput = document.getElementById('admin-pin');
    const errorMsg = document.getElementById('login-error');

    if (pinInput.value === ADMIN_PIN) {
        sessionStorage.setItem('admin_logged_in', 'true');
        showDashboard();
    } else {
        errorMsg.style.display = 'block';
        pinInput.value = '';
    }
}

function showDashboard() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'flex'; // Restore flex layout
    loadInventory();
    setupModal();
}

async function loadInventory() {
    const loadingEl = document.getElementById('loading');
    const tableView = document.getElementById('table-view');
    const tableBody = document.getElementById('book-table-body');
    const errorEl = document.getElementById('error-message');

    // Reset UI
    loadingEl.classList.remove('hidden');
    tableView.classList.add('hidden');
    errorEl.classList.add('hidden');

    try {
        const response = await fetch(`${API_URL}?action=read`);
        const data = await response.json();

        inventory = data; // Store globally for edit lookup
        renderTable(inventory);

        loadingEl.classList.add('hidden');
        tableView.classList.remove('hidden');
    } catch (error) {
        console.error("Error loading inventory:", error);
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
    }
}

function renderTable(books) {
    const tableBody = document.getElementById('book-table-body');
    tableBody.innerHTML = '';

    if (!books || books.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No books found in the database.</td></tr>';
        return;
    }

    books.forEach(book => {
        const row = document.createElement('tr');
        const displayImage = processImageURL(book.image_url);

        row.innerHTML = `
            <td><img src="${displayImage}" class="thumb" alt="Cover" onerror="this.src='https://via.placeholder.com/40x60?text=?'"></td>
            <td>${book.title || ''}</td>
            <td>${book.author || ''}</td>
            <td><span style="background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${book.category || 'N/A'}</span></td>
            <td>${book.stock || 0}</td>
            <td>₹${book.price || 0}</td>
            <td>
                <button class="action-btn edit-btn" onclick="openEditModal('${book.id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="action-btn delete-btn" onclick="deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// --- Modal & Form Logic ---

const modal = document.getElementById('book-modal');
const form = document.getElementById('book-form');
const modalTitle = document.getElementById('modal-title');
const addBtn = document.getElementById('add-book-btn');
const closeBtn = document.querySelector('.close-btn');
const cancelBtn = document.getElementById('cancel-modal');
const saveBtn = document.querySelector('.save-btn');
const imagePreviewDiv = document.getElementById('image-preview');
const imagePreviewImg = imagePreviewDiv.querySelector('img');

function setupModal() {
    addBtn.addEventListener('click', () => {
        resetForm();
        modalTitle.textContent = "Add New Book";
        modal.classList.add('show');
    });

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    form.addEventListener('submit', handleFormSubmit);

    // File input preview logic
    document.getElementById('book-image-file').addEventListener('change', function (e) {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreviewImg.src = e.target.result;
                imagePreviewDiv.style.display = 'block';
            }
            reader.readAsDataURL(this.files[0]);
        }
    });
}

function closeModal() {
    modal.classList.remove('show');
}

function resetForm() {
    document.getElementById('book-id').value = '';
    document.getElementById('existing-image-url').value = '';
    imagePreviewDiv.style.display = 'none';
    form.reset();
}

function openEditModal(id) {
    const book = inventory.find(b => String(b.id) === String(id));
    if (!book) {
        alert("Book details not found locally. Try reloading.");
        return;
    }

    document.getElementById('book-id').value = book.id;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-price').value = book.price;
    document.getElementById('book-category').value = book.category;
    document.getElementById('book-stock').value = book.stock;
    document.getElementById('book-description').value = book.description || '';

    // Handle Image
    document.getElementById('existing-image-url').value = book.image_url || '';
    if (book.image_url) {
        imagePreviewImg.src = processImageURL(book.image_url);
        imagePreviewDiv.style.display = 'block';
    } else {
        imagePreviewDiv.style.display = 'none';
    }

    modalTitle.textContent = "Edit Book";
    modal.classList.add('show');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('book-id').value;
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    const price = parseFloat(document.getElementById('book-price').value);
    const category = document.getElementById('book-category').value;
    const stock = parseInt(document.getElementById('book-stock').value);
    const description = document.getElementById('book-description').value;

    // Image Handling
    const fileInput = document.getElementById('book-image-file');
    const existingUrl = document.getElementById('existing-image-url').value;
    let imageFileMap = null;
    let finalUrl = existingUrl;

    // Check if new file selected
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) { // 2MB limit check (optional but good practice)
            alert("File is too large. Please select an image under 2MB.");
            return;
        }

        try {
            const base64 = await readFileAsBase64(file);
            imageFileMap = {
                imageFile: base64,
                imageName: file.name
            };
        } catch (err) {
            alert("Error reading file");
            return;
        }
    }

    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    const bookData = {
        title, author, price, category, stock, description,
        image_url: finalUrl // Will be overwritten by backend if imageFile is present
    };

    // Merge image file data if present
    if (imageFileMap) {
        Object.assign(bookData, imageFileMap);
    }

    const bookId = id ? id : 'book_' + Date.now();
    const action = id ? 'edit' : 'add';
    bookData.id = bookId;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: action,
                id: bookId,
                data: bookData
            })
        });

        const result = await response.json();

        if (result.status !== 'success') {
            throw new Error(result.message || "Unknown server error");
        }

        // Success
        alert("Success: " + result.message);
        closeModal();
        loadInventory();

    } catch (error) {
        console.error("Save failed", error);
        alert("Failed to save changes: " + error.message);
    } finally {
        saveBtn.textContent = "Save Book";
        saveBtn.disabled = false;
    }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function deleteBook(id) {
    if (!confirm("Are you sure you want to delete this book? This cannot be undone.")) {
        return;
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                id: id
            })
        });

        loadInventory();

    } catch (error) {
        console.error("Delete failed", error);
        alert("Failed to delete book.");
    }
}

// Reuse image processor
// Reuse image processor
function processImageURL(url) {
    if (!url) return 'https://via.placeholder.com/300x450?text=No+Image';
    let newUrl = String(url).trim();

    // Already in correct format?
    if (newUrl.includes('drive.google.com/uc?export=view')) return newUrl;
    if (newUrl.includes('lh3.googleusercontent.com')) return newUrl;

    // Extract ID
    let fileId = null;
    const regExp = /\/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
    const match = newUrl.match(regExp);

    if (match) {
        fileId = match[1] || match[2];
    }

    if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return newUrl;
}
