const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Check backend liveness
 */
export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
}

/**
 * Fetch sample HMAC token and server-generated signature
 */
export async function fetchSampleHmac(token = 'food-claim-12345') {
  try {
    const res = await fetch(`${API_BASE_URL}/demo/hmac/sample?token=${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    // Client-side fallback computation for standalone preview demo
    console.warn('[API] Server unreachable, using local fallback sample:', err.message);
    return {
      success: true,
      token,
      signature: 'a7b8c9d0e1f234567890abcdef1234567890abcdef1234567890abcdef12345678',
      algorithm: 'HMAC-SHA256 (Local Preview Mode)',
      maxAttempts: 3,
      lockoutDurationSeconds: 900,
    };
  }
}

/**
 * Verify HMAC signature against server
 */
export async function verifyHmacToken(token, signature) {
  try {
    const res = await fetch(`${API_BASE_URL}/demo/hmac/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signature }),
    });
    const data = await res.json();
    return {
      status: res.status,
      ...data,
    };
  } catch (err) {
    console.warn('[API] Server verification unreachable:', err.message);
    // Offline simulation mode fallback
    const isMockValid = signature === 'a7b8c9d0e1f234567890abcdef1234567890abcdef1234567890abcdef12345678';
    return {
      status: isMockValid ? 200 : 401,
      success: isMockValid,
      message: isMockValid ? 'Token verified (Offline Preview)' : 'Token invalid (Offline Preview)',
      remainingAttempts: isMockValid ? 3 : 2,
    };
  }
}

/**
 * Submit contact inquiry to Express/MongoDB backend
 */
export async function submitContactMessage(formData) {
  try {
    const res = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    return {
      status: res.status,
      ...data,
    };
  } catch (err) {
    console.warn('[API] Contact submission failed:', err.message);
    return {
      status: 503,
      success: false,
      message: 'Unable to reach backend server. Please email praveen.cs23@bitsathy.ac.in directly.',
    };
  }
}

/**
 * Anonymous telemetry event logger
 */
export async function sendTelemetryEvent(event, projectId = null) {
  try {
    await fetch(`${API_BASE_URL}/telemetry/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, projectId }),
    });
  } catch {
    // Silently ignore telemetry failure
  }
}
