import { google } from 'googleapis';
import { createInterface } from 'readline';

const CLIENT_ID =
  '532082808559-eaakbp3hupnauv59f9kksthn4vld6f0v.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://app.gogocash.co';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

// Scopes ที่ให้สิทธิ์อัปโหลด Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('CLIENT_ID', CLIENT_ID);
console.log('CLIENT_SECRET', CLIENT_SECRET);
console.log('REDIRECT_URI', REDIRECT_URI);

console.log('Authorize this app:', url);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving token', err);
    console.log('TOKEN:', token);
    rl.close();
  });
});
