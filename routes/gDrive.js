const express = require('express');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');
const uuid = require('uuid');
const mime = require('mime');

const {
  google
} = require('googleapis');

const router = express.Router();

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];
const TOKEN_PATH = 'token.json';

router.get('/list-files', function (req, res) {
  fs.readFile(path.join(__dirname, '../credentials.json'), (err, content) => {
    if (err) {
      return console.log('Error loading client secret file:', err);
    }

    authorize(JSON.parse(content))
      .then((oAuth2Client) => {
        listFiles(oAuth2Client).then((data) => {
          res.send(data.files);
        });
      });
  });
});

router.get('/download-file/:id', function (req, res) {
  const id = req.params.id;
  fs.readFile(path.join(__dirname, '../credentials.json'), (err, content) => {
    if (err) {
      return console.log('Error loading client secret file:', err);
    }

    authorize(JSON.parse(content))
      .then((oAuth2Client) => {
        downloadFile(oAuth2Client, id).then((result, err) => {
          const filePath = path.join(os.tmpdir(), uuid.v4());
          const destination = fs.createWriteStream(filePath);

          result.data
            .on('end', () => {
              const fileName = path.basename(filePath);
              const extension = mime.extension(result.headers['content-type']);
              res.download(filePath, fileName + '.' + extension);
            })
            .on('error', err => {
              console.log('Error', err);
            })
            .pipe(destination);
        });
      });
  });
});

router.get('/upload-file', function (req, res) {
  fs.readFile(path.join(__dirname, '../credentials.json'), (err, content) => {
    if (err) {
      return console.log('Error loading client secret file:', err);
    }

    authorize(JSON.parse(content))
      .then((oAuth2Client) => {
        uploadFile(oAuth2Client);
        res.send("upload success");
      });
  });
});

function authorize(credentials) {
  return new Promise((resolve, reject) => {
    const {
      client_secret,
      client_id,
      redirect_uris
    } = credentials.installed;

    try {
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) {
          return getAccessToken(oAuth2Client);
        }

        oAuth2Client.setCredentials(JSON.parse(token));
        resolve(oAuth2Client);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function getAccessToken(oAuth2Client) {
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
      if (err) {
        return console.error('Error retrieving access token', err);
      }

      oAuth2Client.setCredentials(token);

      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });

      return oAuth2Client;
    });
  });
}

function listFiles(auth) {
  return new Promise((resolve, reject) => {
    try {
      const drive = google.drive({
        version: 'v3',
        auth
      });

      drive.files.list({
        // pageSize: 10,
        fields: 'files(id, name, mimeType, modifiedTime, size)',
      }, (err, res) => {
        if (err) {
          return console.log('The API returned an error: ' + err);
        }

        resolve(res.data);
      });
    } catch (e) {
      reject(e);
    }
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
    body: fs.createReadStream(path.join(__dirname, '../files/photo.jpg'))
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

function downloadFile(auth, fileId) {
  const drive = google.drive({
    version: 'v3',
    auth
  });

  const params = {
    fileId: fileId,
    alt: 'media'
  };
  const options = {
    responseType: 'stream'
  };

  return drive.files.get(params, options);
}

module.exports = router;