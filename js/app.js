// Book Stall Customer Web UI Logic

const BOOK_SHEET_API = 'https://script.google.com/macros/s/AKfycbyInS5VHsrewilnPYokOEASU2uwOmB_gAUYd4x29Y0QUNrshk4QaHbqLjGUGa3OWNbLwg/exec';
const USE_MOCK_DATA = false;

// Mock Data removed/ignored for production...

document.addEventListener('DOMContentLoaded', () => {
    fetchBooks();
});

async function fetchBooks() {
    const loadingEl = document.getElementById('loading');
    const gridEl = document.getElementById('book-grid');
    const errorEl = document.getElementById('error-message');

    try {
        let books = [];

        if (USE_MOCK_DATA) {
            // ...
        } else {
            const response = await fetch(`${BOOK_SHEET_API}?action=read`);
            const data = await response.json();
            books = data;
        }

        renderBooks(books);

        loadingEl.classList.add('hidden');
        gridEl.classList.remove('hidden');

    } catch (error) {
        console.error("Error fetching books:", error);
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
    }
}

function renderBooks(books) {
    const gridEl = document.getElementById('book-grid');
    gridEl.innerHTML = ''; // Clear current content

    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';

        // Process the image URL to ensure it displays correctly
        const displayImage = processImageURL(book.image_url);

        card.innerHTML = `
            <div class="book-image-container">
                <img src="${displayImage}" alt="${book.title}" class="book-image" onerror="this.parentElement.innerHTML='<div class=\\'no-image-placeholder\\'>No Preview</div>'">
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title || 'Untitled'}</h3>
                <p class="book-author">By ${book.author || 'Unknown Author'}</p>
                <div class="book-footer">
                     <div class="book-price">₹${book.price || '0.00'}</div>
                     <button class="buy-btn" onclick="buyBook('${(book.title || '').replace(/'/g, "\\'")}', '${(book.author || '').replace(/'/g, "\\'")}', '${book.price}', '${(book.image_url || '').replace(/'/g, "\\'")}')">Buy</button>
                </div>
            </div>
        `;

        gridEl.appendChild(card);
    });
}


function processImageURL(url) {
    if (!url) return 'https://via.placeholder.com/300x450?text=No+Image';
    let newUrl = String(url).trim();

    // Already in correct format?
    if (newUrl.includes('drive.google.com/uc?export=view')) return newUrl;
    if (newUrl.includes('lh3.googleusercontent.com')) return newUrl;

    // Extract ID from various Drive URL formats
    let fileId = null;
    const regExp = /\/file\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
    const match = newUrl.match(regExp);

    if (match) {
        fileId = match[1] || match[2];
    }

    if (fileId) {
        // Use this specific format which is most reliable for img tags
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    return newUrl;
}

function buyBook(title, author, price, imageUrl) {
    const phoneNumber = "919526452423";

    let text = `Hello Akshara Bookstall, I am interested in buying this book:\n\n`;
    text += `*Title:* ${title}\n`;
    text += `*Author:* ${author}\n`;
    text += `*Price:* ₹${price}\n`;
    if (imageUrl) {
        text += `*Image:* ${imageUrl}`;
    }

    const message = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
}
