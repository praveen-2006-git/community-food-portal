const mongoose = require('mongoose');
require('dotenv').config();
const { autoSeedIfEmpty } = require('../utils/autoSeed');

let dbDiagnosticState = {
  connected: false,
  state: 'disconnected',
  host: null,
  targetHost: null,
  databaseName: null,
  authSource: null,
  lastError: null,
  reconnectAttempts: 0
};

// Mask sensitive credentials from connection strings for safe logging
const getMaskedUri = (uri) => {
  if (!uri) return 'not_configured';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

const extractTargetHost = (uri) => {
  if (!uri) return 'unknown';
  const match = uri.match(/@([^/?]+)/);
  return match ? match[1] : (uri.includes('127.0.0.1') || uri.includes('localhost') ? 'local' : 'unknown');
};

const normalizeConnectionString = (rawUri) => {
  if (!rawUri) return 'mongodb://127.0.0.1:27017/community_food_portal';
  
  let uri = rawUri.trim().replace(/^["']|["']$/g, '');
  
  // Atlas srv connections typically authenticate against 'admin' unless specified
  if (uri.startsWith('mongodb+srv://') && !uri.includes('authSource=')) {
    const delimiter = uri.includes('?') ? '&' : '?';
    uri = `${uri}${delimiter}authSource=admin`;
  }
  return uri;
};

const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI;
  let connStr = normalizeConnectionString(rawUri);
  const targetHost = extractTargetHost(connStr);
  dbDiagnosticState.targetHost = targetHost;

  console.log(`[DB Init] Attempting connection to MongoDB (${targetHost})...`);

  const tryConnect = async (uriToTry) => {
    return await mongoose.connect(uriToTry, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000
    });
  };

  try {
    await tryConnect(connStr);
    handleConnectionSuccess(connStr);
  } catch (primaryErr) {
    dbDiagnosticState.lastError = primaryErr.message;
    console.error(`[DB Error] Primary connection to ${targetHost} failed: ${primaryErr.message}`);

    // If Atlas auth failed, try connecting without the auto-appended authSource in case user created credentials in default db
    if (primaryErr.message.includes('bad auth') && connStr.includes('authSource=admin')) {
      const fallbackNoAuthSource = connStr.replace(/[?&]authSource=admin/, '');
      console.warn(`[DB Retry] Retrying authentication without explicit authSource=admin...`);
      try {
        await tryConnect(fallbackNoAuthSource);
        handleConnectionSuccess(fallbackNoAuthSource);
        return;
      } catch (secondaryErr) {
        console.error(`[DB Error] Secondary auth attempt also failed: ${secondaryErr.message}`);
        dbDiagnosticState.lastError = secondaryErr.message;
      }
    }

    // Local development fallback
    if (process.env.NODE_ENV !== 'production' && connStr !== 'mongodb://127.0.0.1:27017/community_food_portal') {
      console.warn(`[DB Fallback] Attempting local MongoDB connection (127.0.0.1:27017)...`);
      try {
        await tryConnect('mongodb://127.0.0.1:27017/community_food_portal');
        handleConnectionSuccess('mongodb://127.0.0.1:27017/community_food_portal');
        return;
      } catch (localErr) {
        console.error(`[DB Error] Local MongoDB fallback failed: ${localErr.message}`);
      }
    }

    // In production, keep HTTP server alive and schedule non-blocking periodic reconnects
    scheduleBackgroundReconnect();
  }
};

const handleConnectionSuccess = async (uriUsed) => {
  dbDiagnosticState.connected = true;
  dbDiagnosticState.state = 'connected';
  dbDiagnosticState.host = mongoose.connection.host || extractTargetHost(uriUsed);
  dbDiagnosticState.databaseName = mongoose.connection.name;
  dbDiagnosticState.lastError = null;

  console.log(`[DB Success] MongoDB connected successfully to: ${dbDiagnosticState.host} (DB: ${dbDiagnosticState.databaseName})`);

  // Transaction support check
  try {
    const { checkTransactionSupport } = require('../utils/transactionHelper');
    const supported = await checkTransactionSupport();
    if (supported) {
      console.log(`[DB Startup] Transaction capability: SUPPORTED (Replica set active)`);
    } else {
      console.log(`[DB Startup] Standalone/free cluster: atomic operations enabled with graceful multi-doc fallback.`);
    }
  } catch (txErr) {
    console.warn(`[DB Startup] Transaction probe notice: ${txErr.message}`);
  }

  // Auto-seed initial demo data if brand new database
  await autoSeedIfEmpty();
};

let reconnectTimer = null;
const scheduleBackgroundReconnect = () => {
  if (reconnectTimer) return;
  console.warn(`[DB Notice] Server running with pending database connection. Auto-retrying every 10 seconds...`);
  
  reconnectTimer = setInterval(async () => {
    dbDiagnosticState.reconnectAttempts += 1;
    const rawUri = process.env.MONGODB_URI;
    const connStr = normalizeConnectionString(rawUri);

    try {
      console.log(`[DB Reconnect] Attempt #${dbDiagnosticState.reconnectAttempts}...`);
      await mongoose.connect(connStr, { serverSelectionTimeoutMS: 6000 });
      clearInterval(reconnectTimer);
      reconnectTimer = null;
      await handleConnectionSuccess(connStr);
    } catch (err) {
      dbDiagnosticState.lastError = err.message;
      console.warn(`[DB Reconnect Failed] #${dbDiagnosticState.reconnectAttempts}: ${err.message}`);
    }
  }, 10000);
};

const getDbDiagnosticInfo = () => {
  const stateMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const currentState = stateMap[mongoose.connection.readyState] || 'unknown';
  return {
    ...dbDiagnosticState,
    state: currentState,
    connected: mongoose.connection.readyState === 1
  };
};

module.exports = connectDB;
module.exports.getDbDiagnosticInfo = getDbDiagnosticInfo;

