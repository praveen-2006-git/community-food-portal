import localtunnel from 'localtunnel';

async function startTunnel() {
  try {
    console.log('Connecting to localtunnel...');
    const tunnel = await localtunnel({ port: 5173 });
    console.log('Tunnel active at:', tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 5s...');
      setTimeout(startTunnel, 5000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch (err) {
    console.error('Failed to create tunnel. Retrying in 5s...', err);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();

// Keep Node.js process alive persistently
setInterval(() => {}, 60000);
