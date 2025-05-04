// Load environment variables first
require('./load-env');

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Create the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Prepare the app
app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Special handling for static files
      if (
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/static/') ||
        /\.(css|js|svg|png|jpg|jpeg|gif|ico|json)$/.test(pathname)
      ) {
        // Try to serve from the .next directory first
        const staticFilePath = path.join(__dirname, '.next', pathname);
        if (fs.existsSync(staticFilePath)) {
          const stat = fs.statSync(staticFilePath);
          res.writeHead(200, {
            'Content-Type': getContentType(pathname),
            'Content-Length': stat.size,
            'Cache-Control': 'public, max-age=31536000, immutable',
          });
          const readStream = fs.createReadStream(staticFilePath);
          readStream.pipe(res);
          return;
        }

        // Then try the public directory
        const publicFilePath = path.join(__dirname, 'public', pathname);
        if (fs.existsSync(publicFilePath)) {
          const stat = fs.statSync(publicFilePath);
          res.writeHead(200, {
            'Content-Type': getContentType(pathname),
            'Content-Length': stat.size,
            'Cache-Control': 'public, max-age=31536000, immutable',
          });
          const readStream = fs.createReadStream(publicFilePath);
          readStream.pipe(res);
          return;
        }
      }

      // Let Next.js handle everything else
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

// Helper function to determine content type
function getContentType(pathname) {
  const ext = path.extname(pathname).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.js': return 'application/javascript';
    case '.css': return 'text/css';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.gif': return 'image/gif';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}
