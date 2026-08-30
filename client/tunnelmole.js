import { tunnelmole } from 'tunnelmole';

async function startTunnel() {
  try {
    console.log('Connecting to tunnelmole...');
    const url = await tunnelmole({
      port: 5173
    });
    console.log('Tunnel active at:', url);
  } catch (err) {
    console.error('Failed to create tunnel:', err);
  }
}

startTunnel();
