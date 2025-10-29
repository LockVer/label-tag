const { spawn } = require('child_process');

let nextServer = null;
let isServerReady = false;
let requestQueue = [];

// 启动 Next.js 服务器
function startNextServer() {
  return new Promise((resolve, reject) => {
    console.log('Installing dependencies...');

    // 先安装依赖
    const install = spawn('npm', ['install', '--omit=dev'], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    install.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`npm install failed with code ${code}`));
        return;
      }

      console.log('Starting Next.js server...');

      // 启动 Next.js
      nextServer = spawn('npm', ['run', 'start'], {
        cwd: __dirname,
        env: { ...process.env, PORT: '3000' },
        stdio: 'pipe'
      });

      nextServer.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);

        if (output.includes('ready') || output.includes('started server')) {
          isServerReady = true;
          resolve();

          // 处理队列中的请求
          requestQueue.forEach(({ req, res, callback }) => {
            handleRequest(req, res, callback);
          });
          requestQueue = [];
        }
      });

      nextServer.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      nextServer.on('error', (err) => {
        reject(err);
      });

      // 超时保护
      setTimeout(() => {
        if (!isServerReady) {
          isServerReady = true;
          resolve();
        }
      }, 60000); // 60 秒超时
    });
  });
}

// 处理 HTTP 请求
async function handleRequest(req, res, callback) {
  try {
    const http = require('http');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: req.path || '/',
      method: req.method,
      headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (chunk) => {
        body += chunk;
      });
      proxyRes.on('end', () => {
        callback(null, {
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          body
        });
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Error proxying request:', error);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      });
    });

    if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
      proxyReq.write(req.body);
    }

    proxyReq.end();
  } catch (error) {
    console.error('Error handling request:', error);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    });
  }
}

exports.handler = async (req, res, callback) => {
  if (!isServerReady && !nextServer) {
    try {
      await startNextServer();
    } catch (error) {
      console.error('Failed to start Next.js server:', error);
      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to start server' })
      });
    }
  }

  if (!isServerReady) {
    // 服务器还未就绪，将请求加入队列
    requestQueue.push({ req, res, callback });
    return;
  }

  await handleRequest(req, res, callback);
};
