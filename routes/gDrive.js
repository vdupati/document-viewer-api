const express = require('express');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  google
} = require('googleapis');

const router = express.Router();

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const TOKEN_PATH = 'token.json';

router.get('/list', function (req, res, next) {
  fs.readFile(path.join(__dirname, '../credentials.json'), (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), res, listFiles);
  });
});

function authorize(credentials, res, listFilesCallback) {
  const {
    client_secret,
    client_id,
    redirect_uris
  } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      return getAccessToken(oAuth2Client, res, listFilesCallback);
    }
    oAuth2Client.setCredentials(JSON.parse(token));
    listFilesCallback(oAuth2Client, res);
  });
}

function getAccessToken(oAuth2Client, res, listFilesCallback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });

      listFilesCallback(oAuth2Client, res);
    });
  });
}

function listFiles(auth, response) {
  const drive = google.drive({
    version: 'v3',
    auth
  });
  drive.files.list({
    // pageSize: 10,
    // fields: 'nextPageToken, files(id, name)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    response.send(res.data);
  });
}

function uploadFile(auth) {
  const drive = google.drive({
    version: 'v3',
    auth
  });
  const fileMetadata = {
    'name': 'photo.jpg'
  };
  const media = {
    mimeType: 'image/jpeg',
    body: fs.createReadStream('files/photo.jpg')
  };
  drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  }, (err, file) => {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      console.log('File Id: ', file.id);
    }
  });
}

module.exports = router;