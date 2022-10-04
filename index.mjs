import { exec as execCP } from 'child_process';
import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import { promises as fs } from 'fs';
import { Low, JSONFile } from 'lowdb';
import morgan from 'morgan';
import path from 'path';
import util from 'util';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __tempDir = '/usr/src/tmp';

const exec = util.promisify(execCP);

// Create database
const db = new Low(new JSONFile(path.join(__dirname, './db/db.json')));

// Create Express Server
const app = express();

// Configuration
const PORT = 3000;
const HOST = '0.0.0.0';

const exists = async (path) => {  
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
};

// cors
app.use(cors());

// Logging
app.use(morgan('dev'));

// Info GET endpoint
app.get('/info', (req, res, next) => {
  return res.send('Moonbase Alpha TTS simple API');
});

// Authorization
async function ensureAuthenticated (req, res, next) {
  try {
    await db.read();
    const tokens = (db.data || { tokens: [] }).tokens;

    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }

    if (tokens.indexOf(token) > -1) {
      return next();
    } else {
      return res.status(401).send({ message: 'You don\'t have permission to access this resource.' });
    }
  } catch (err) {
    console.error('ensureAuthenticated failed', err);
    return res.status(500).send({ message: 'Failed to verify token.' });
  }
}

app.get('/tts', ensureAuthenticated, async (req, res, next) => {
  try {
    const text = req.query.text;
    const filename = `dectalk_${crypto.randomBytes(4).readUInt32LE(0)}.ogg`;
    const filepath = path.join(__tempDir, filename);
    const dangerBase64 = Buffer.from(text).toString('base64')

    const { _, stderr } = await exec(`echo "$(echo ${dangerBase64} | base64 -d)" | { read text; ./_dectalk/say -fo ${filepath} -a "[:PHONE ON] $text"; }`);

    if (stderr) {
      console.error(`error: ${stderr}`);
      return res.status(500).send({ message: 'Failed to generate the sound.' });
    }

    if (await exists(filepath)) {
      res.on('finish', async () => {
        console.log('FINISH CALLED', filepath);
        try {
          await fs.unlink(filepath); 
        } catch(e) {
          console.error('Error removing file', filepath); 
        }
      });
      return res.sendFile(filepath);
    }
    return res.status(500).send({ message: 'Failed to generate the sound.' });

  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Failed to generate the sound.' });
  }
})

// Start the Proxy
app.listen(PORT, HOST, () => {
  console.log(`🚀 Starting server at ${HOST}:${PORT}`);
});

