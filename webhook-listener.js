const http = require('http');
const { execSync } = require('child_process');
const crypto = require('crypto');

// GitHub webhook secret - bunu güvenli bir değerle değiştirin
const SECRET = process.env.WEBHOOK_SECRET || 'CHANGE_THIS_SECRET_123!@#';
const PORT = process.env.WEBHOOK_PORT || 9000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const signature = req.headers['x-hub-signature-256'];
      const hash = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
      
      if (signature === hash) {
        console.log('✅ Webhook doğrulandı, deployment başlatılıyor...');
        
        try {
          execSync('powershell -File C:\\inetpub\\wwwroot\\cliff\\cliff\\deploy.ps1', {
            stdio: 'inherit'
          });
          res.writeHead(200);
          res.end('Deployment başarılı');
        } catch (error) {
          console.error('❌ Deployment hatası:', error);
          res.writeHead(500);
          res.end('Deployment hatası');
        }
      } else {
        res.writeHead(401);
        res.end('Unauthorized');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🎣 Webhook listener ${PORT} portunda çalışıyor...`);
});
