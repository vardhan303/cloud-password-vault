// API Configuration
window.__api_config = {
  // Auto-detect API URL based on environment
  baseURL: window.location.hostname === 'localhost' 
    ? 'http://localhost:4000'
    : `${window.location.protocol}//${window.location.host}/api`,
  
  // Allowed origins for OAuth popup
  allowedOrigins: [
    'http://localhost:4000',
    'http://localhost:5173',
    window.location.origin,
    ...(window.location.hostname.includes('vercel.app') 
      ? [`${window.location.protocol}//${window.location.host}`] 
      : [])
  ]
};
