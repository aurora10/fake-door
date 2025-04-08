const { google } = require('googleapis');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});
const path = require('path');
const fs = require('fs');

// --- You provided these ---
const CLIENT_ID = '655790129180-n3h617benp42gpglq2jqejvksgo64lav.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback'; // Must match the one in Google Cloud Console
// ---

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']; // Scope for Google Sheets API

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate the url that will be used for the consent dialog.
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // 'offline' gets refresh_token
  scope: SCOPES,
  prompt: 'consent', // Force consent screen even if previously approved
});

console.log('Authorize this app by visiting this url:');
console.log(authUrl);
console.log('\nAfter authorizing, Google will redirect you to a URL like:');
console.log(`${REDIRECT_URI}?code=YOUR_CODE&scope=...`);
console.log('(You might see a "This site can’t be reached" error, that\'s okay)');
console.log('\nCopy the value of the \'code\' parameter from that URL.');

readline.question('Enter the code from that page here: ', async (code) => {
  readline.close();
  try {
    const { tokens } = await oauth2Client.getToken(decodeURIComponent(code));
    oauth2Client.setCredentials(tokens);

    console.log('\nTokens received:');
    // console.log(tokens); // Contains access_token, refresh_token, etc.

    if (tokens.refresh_token) {
      console.log('\n\n************************************************************');
      console.log('SUCCESS! Your Refresh Token is:');
      console.log(tokens.refresh_token);
      console.log('************************************************************');
      console.log('\nKeep this refresh token safe! Provide it back to Cline.');

      // Optional: Save tokens to a file for potential reuse (though we only need refresh_token)
      // fs.writeFileSync(path.join(__dirname,'google-tokens.json'), JSON.stringify(tokens));
      // console.log('Tokens saved to google-tokens.json');

    } else {
      console.error('\n\nError: Did not receive a refresh token.');
      console.log('Make sure you included "access_type: \'offline\'" and "prompt: \'consent\'" in generateAuthUrl.');
      console.log('Also ensure the Google account hasn\'t already granted consent without the offline scope.');
      console.log('You might need to revoke access in your Google Account settings and try again.');
    }
  } catch (err) {
    console.error('\nError retrieving access token', err.response ? err.response.data : err.message);
  }
});
