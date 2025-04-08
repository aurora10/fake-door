require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const port = 3000; // Port for the server to listen on
const csvFilePath = path.join(__dirname, 'applicants.csv');

// --- Google Sheets Config ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1OWJKaVrLaFw6whnCIoW9Yf-AkNdPs0dMXEsSVvR_RHQ'; // Keep default or use env var
const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1'; // Keep default or use env var
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'; // Keep default or use env var
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Validate required environment variables
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    console.error('ERROR: Missing required Google API environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)');
    process.exit(1); // Exit if secrets are missing
}
if (!SPREADSHEET_ID || !SHEET_NAME) {
    console.error('ERROR: Missing required Sheet environment variables (SPREADSHEET_ID, SHEET_NAME)');
    process.exit(1); // Exit if sheet info is missing
}


// Setup Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI // This is mainly needed for the initial token generation
);
oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
// --- End Google Sheets Config ---

// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to serve static files (HTML, CSS, JS) from the current directory
app.use(express.static(__dirname));

// Function to escape CSV fields if necessary
const escapeCsvField = (field) => {
    if (field === null || field === undefined) {
        return '';
    }
    const stringField = String(field);
    // Escape double quotes by doubling them and wrap field in double quotes if it contains comma, double quote, or newline
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

// Helper function to check if email exists in the sheet
async function checkEmailExists(emailToCheck) {
    if (!emailToCheck) return false; // Don't check if email is empty

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const range = `${SHEET_NAME}!C:C`; // Assuming emails are in Column C

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const rows = response.data.values;
        if (rows && rows.length) {
            // Flatten array and check case-insensitively
            const lowerCaseEmailToCheck = emailToCheck.toLowerCase();
            for (const row of rows) {
                if (row[0] && row[0].toLowerCase() === lowerCaseEmailToCheck) {
                    console.log(`Duplicate email found: ${emailToCheck}`);
                    return true; // Email found
                }
            }
        }
        return false; // Email not found
    } catch (err) {
        console.error('Error reading Google Sheet for duplicate check:', err.response ? err.response.data : err.message);
        // Decide how to handle read errors - potentially allow submission? Or block?
        // For now, let's log the error and allow submission to proceed (fail-safe)
        // Alternatively, could return true to prevent submission on error.
        return false;
    }
}


// Helper function to append data to Google Sheets
async function appendToSheet(dataRow) {
    try {
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        const range = SHEET_NAME; // Append after the last row in the specified sheet
        const valueInputOption = 'USER_ENTERED'; // Interpret values as if typed into the UI
        const resource = {
            values: [dataRow], // dataRow should be an array like [name, company, email, phone]
        };

        // Revert back to append
        const result = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range, // Use SHEET_NAME for append
            valueInputOption: valueInputOption,
            resource: resource,
        });
        console.log(`${result.data.updates.updatedCells} cells appended to Google Sheet.`); // Reverted log message
        return true; // Indicate success
    } catch (err) {
        console.error('Error appending to Google Sheet:', err.response ? err.response.data : err.message);
        // If token error, might need re-authentication (though refresh token should handle this)
        if (err.response && err.response.data && err.response.data.error === 'invalid_grant') {
             console.error('Google API Error: Invalid Grant. Refresh token might be expired or revoked. Please re-run get-refresh-token.js');
        }
        return false; // Indicate failure
    }
}

// Endpoint to handle form submissions
app.post('/submit', async (req, res) => { // Make handler async
    const { name, company, email, phone } = req.body;

    // Basic validation (can be more robust)
    if (!name || !company || !email || !phone) {
        return res.status(400).send('Missing required form fields.');
    }

    // --- Check for Duplicate Email ---
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
        // Send a specific message and status code (e.g., 409 Conflict)
        return res.status(409).send('We already have your data, will get in touch asap...');
    }
    // --- End Check for Duplicate Email ---


    const csvHeader = 'Name,Company Name,Email,Phone\n';
    const csvRow = [
        escapeCsvField(name),
        escapeCsvField(company),
        escapeCsvField(email),
        escapeCsvField(phone)
    ].join(',') + '\n';

    try {
        // Check if file exists
        if (!fs.existsSync(csvFilePath)) {
            // File doesn't exist, write header + first row
            fs.writeFileSync(csvFilePath, csvHeader + csvRow, 'utf8');
            console.log(`Created ${csvFilePath} and saved first entry.`);
        } else {
            // File exists, append new row
            fs.appendFileSync(csvFilePath, csvRow, 'utf8');
            console.log(`Appended new entry to ${csvFilePath}.`);
        }

        // --- Append to Google Sheets ---
        const sheetDataRow = [name, company, email, phone]; // Order matters, should match sheet columns
        const sheetSuccess = await appendToSheet(sheetDataRow);
        // --- End Append to Google Sheets ---

        if (sheetSuccess) {
            res.status(200).send('Data saved successfully to CSV and Google Sheet.');
        } else {
            // Still send 200 if CSV write was okay, but maybe log/notify about sheet failure
            res.status(200).send('Data saved to CSV, but failed to save to Google Sheet.');
            console.warn('Data saved to CSV, but failed to save to Google Sheet.');
        }

    } catch (error) {
        // This catch block now primarily handles CSV errors
        console.error('Error writing to CSV file:', error);
        res.status(500).send('Error saving data to CSV.'); // More specific error
    }
});

// Serve index.html for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.listen(port, () => {
    console.log(`Fake door server listening at http://localhost:${port}`);
    console.log(`Serving static files from: ${__dirname}`);
    console.log(`Saving data to: ${csvFilePath}`);
});
