// Google Apps Script Code
// Copy and paste this into your Google Apps Script editor

const SPREADSHEET_ID = "1jKITM2zrbbnw4GfMVOSw-gLWBgUpwHeHY3s9NDultZE"; // <--- REPLACE THIS
const SHEET_NAME = "Books";
const FOLDER_ID = "1s648T2Ng8BQOxLSKSccyyQqD3SBKb8t0"; // <--- Folder for Images

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    try {
        const action = e.parameter.action;

        if (action === "read") {
            const data = getAllBooks();
            return jsonResponse(data, headers);
        }

        // Handle POST
        if (e.postData) {
            const payload = JSON.parse(e.postData.contents);
            const actionPost = payload.action;

            // Handle Image Upload if present
            if (payload.data && payload.data.imageFile) {
                const imageUrl = saveImageToDrive(payload.data.imageFile, payload.data.imageName);
                payload.data.image_url = imageUrl; // Overwrite URL with new Drive Link
                // Remove huge base64 string before passing to data handlers to save memory
                delete payload.data.imageFile;
                delete payload.data.imageName;
            }

            if (actionPost === "add") {
                const result = addBook(payload.data);
                return jsonResponse(result, headers);
            } else if (actionPost === "edit") {
                const result = editBook(payload.id, payload.data);
                return jsonResponse(result, headers);
            } else if (actionPost === "delete") {
                const result = deleteBook(payload.id);
                return jsonResponse(result, headers);
            }
        }

        return jsonResponse({ status: "error", message: "Invalid action" }, headers);

    } catch (error) {
        return jsonResponse({ status: "error", message: error.toString() }, headers);
    }
}

function jsonResponse(data, headers) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// --- Drive Operations ---

function saveImageToDrive(base64Data, fileName) {
    try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        // data:image/jpeg;base64,.....
        const split = base64Data.split(',');
        const type = split[0].split(';')[0].replace('data:', '');
        const data = Utilities.base64Decode(split[1]);
        const blob = Utilities.newBlob(data, type, fileName);

        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        // Return a direct link or view link
        // User requested lh3 format
        return "https://lh3.googleusercontent.com/d/" + file.getId();
    } catch (e) {
        throw new Error("Image Upload Failed: " + e.message);
    }
}

// --- Data Operations ---

function getSheet() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return ss.getSheetByName(SHEET_NAME);
}

function getAllBooks() {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return []; // Only headers

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
        let book = {};
        headers.forEach((header, index) => {
            book[header] = row[index];
        });
        return book;
    });
}

function addBook(bookData) {
    const sheet = getSheet();
    const newRow = [
        bookData.id,
        bookData.title,
        bookData.author,
        bookData.price,
        bookData.image_url,
        bookData.description,
        bookData.stock,
        bookData.category
    ];
    sheet.appendRow(newRow);
    return { status: "success", message: "Book added successfully" };
}

function editBook(id, bookData) {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) {
            // Only update provided fields (merge logic could be added here, 
            // but frontend usually sends full object). 
            // We'll trust bookData has everything needed or use what's sent.

            // Update columns B(2) to H(8)
            const range = sheet.getRange(i + 1, 1, 1, 8);
            range.setValues([[
                id,
                bookData.title,
                bookData.author,
                bookData.price,
                bookData.image_url,
                bookData.description,
                bookData.stock,
                bookData.category
            ]]);

            return { status: "success", message: "Book updated" };
        }
    }
    return { status: "error", message: "Book not found" };
}

function deleteBook(id) {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) {
            sheet.deleteRow(i + 1);
            return { status: "success", message: "Book deleted" };
        }
    }
    return { status: "error", message: "Book not found" };
}

// FORCE PERMOTION REQUEST:
function authorizeScript() {
    console.log("Checking permissions...");
    // This line is CRITICAL. It forces Google to ask for "Edit/Create" permissions.
    // We create a tiny temp file and then delete it immediately.
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const temp = folder.createFile("auth_check.txt", "checking permissions");
    temp.setTrashed(true);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log("SUCCESS! Permissions upgraded to Read/Write. You can now deploy.");
}