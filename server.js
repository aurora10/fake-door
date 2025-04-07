const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000; // Port for the server to listen on
const csvFilePath = path.join(__dirname, 'applicants.csv');

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

// Endpoint to handle form submissions
app.post('/submit', (req, res) => {
    const { name, company, email, phone } = req.body;

    // Basic validation (can be more robust)
    if (!name || !company || !email || !phone) {
        return res.status(400).send('Missing required form fields.');
    }

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
        res.status(200).send('Data saved successfully.');
    } catch (error) {
        console.error('Error writing to CSV file:', error);
        res.status(500).send('Error saving data.');
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
