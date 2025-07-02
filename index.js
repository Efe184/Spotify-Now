const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Spotify credentials
const CLIENT_ID = '7098f9afd3614ae088dd4233bb7a8d3b';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://127.0.0.1:3000/callback';

// Store access token globally (in production, use a database)
let SPOTIFY_ACCESS_TOKEN = process.env.SPOTIFY_ACCESS_TOKEN || null;

// Function to escape text for SVG
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Function to truncate text if too long
function truncateText(text, maxLength = 30) {
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

// Function to generate SVG for currently playing track
function generateNowPlayingSVG(trackData) {
  const width = 400;
  const height = 120;
  
  if (!trackData) {
    // No track playing
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#1db954;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#191414;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="10" ry="10"/>
        
        <!-- Spotify icon -->
        <circle cx="30" cy="60" r="16" fill="#1db954"/>
        <path d="M22,55 Q30,50 38,55 M22,58 Q30,53 38,58 M22,61 Q30,56 38,61 M22,64 Q30,59 38,64" 
              stroke="#000" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        
        <!-- Text -->
        <text x="60" y="50" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" 
              font-size="16" font-weight="600" fill="#fff">
          Not Playing
        </text>
        
        <text x="60" y="75" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" 
              font-size="12" fill="#b3b3b3">
          Open Spotify and play music
        </text>
      </svg>
    `;
  }

  const trackName = escapeXml(truncateText(trackData.name, 25));
  const artists = escapeXml(truncateText(trackData.artists.map(artist => artist.name).join(', '), 28));
  
  // Get album cover image (prefer smaller size for faster loading)
  const albumImage = trackData.album.images && trackData.album.images.length > 0 
    ? trackData.album.images[trackData.album.images.length - 1].url  // Smallest image
    : null;
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#1db954;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#191414;stop-opacity:1" />
        </linearGradient>
        <clipPath id="albumClip">
          <rect x="20" y="20" width="60" height="60" rx="6" ry="6"/>
        </clipPath>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="10" ry="10"/>
      
      <!-- Album cover or placeholder -->
      ${albumImage ? `
        <image x="20" y="20" width="60" height="60" href="${albumImage}" clip-path="url(#albumClip)"/>
      ` : `
        <rect x="20" y="20" width="60" height="60" fill="#333" rx="6" ry="6"/>
        <circle cx="50" cy="50" r="15" fill="#1db954"/>
        <path d="M42,45 Q50,40 58,45 M42,48 Q50,43 58,48 M42,51 Q50,46 58,51 M42,54 Q50,49 58,54" 
              stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      `}
      
      <!-- Track info -->
      <text x="95" y="35" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" 
            font-size="15" font-weight="600" fill="#fff">
        ${trackName}
      </text>
      
      <text x="95" y="52" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" 
            font-size="12" fill="#b3b3b3">
        ${artists}
      </text>
      
      <!-- Now playing indicator -->
      <circle cx="95" cy="68" r="2" fill="#1db954">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <text x="105" y="72" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" 
            font-size="9" fill="#1db954">
        Now Playing
      </text>
      
      <!-- Sound bars -->
      <g transform="translate(350, 40)">
        <rect x="0" y="10" width="3" height="8" fill="#1db954" rx="1">
          <animate attributeName="height" values="8;18;8" dur="1.1s" repeatCount="indefinite"/>
          <animate attributeName="y" values="10;5;10" dur="1.1s" repeatCount="indefinite"/>
        </rect>
        <rect x="6" y="5" width="3" height="18" fill="#1db954" rx="1">
          <animate attributeName="height" values="18;25;18" dur="1.3s" repeatCount="indefinite"/>
          <animate attributeName="y" values="5;2;5" dur="1.3s" repeatCount="indefinite"/>
        </rect>
        <rect x="12" y="8" width="3" height="12" fill="#1db954" rx="1">
          <animate attributeName="height" values="12;20;12" dur="0.9s" repeatCount="indefinite"/>
          <animate attributeName="y" values="8;4;8" dur="0.9s" repeatCount="indefinite"/>
        </rect>
        <rect x="18" y="6" width="3" height="16" fill="#1db954" rx="1">
          <animate attributeName="height" values="16;22;16" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="y" values="6;3;6" dur="1.5s" repeatCount="indefinite"/>
        </rect>
      </g>
    </svg>
  `;
}

// SVG endpoint for currently playing track
app.get('/now-playing.svg', async (req, res) => {
  try {
    // Set proper content type for SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Check if token is available
    console.log('🔍 SVG endpoint hit - Token available:', !!SPOTIFY_ACCESS_TOKEN);
    if (!SPOTIFY_ACCESS_TOKEN) {
      console.log('❌ No token available for SVG');
      const svg = generateNowPlayingSVG(null);
      return res.send(svg);
    }
    
    // Call Spotify API
    console.log('🎵 Calling Spotify API with token:', SPOTIFY_ACCESS_TOKEN.substring(0, 20) + '...');
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${SPOTIFY_ACCESS_TOKEN}`
      }
    });
    
    console.log('📡 Spotify API response status:', response.status);
    
    // Handle different response statuses
    if (response.status === 204 || response.status === 404) {
      // No content - nothing playing
      console.log('🔇 Spotify says: No track playing (204/404)');
      const svg = generateNowPlayingSVG(null);
      return res.send(svg);
    }
    
    if (response.status === 401) {
      // Unauthorized - token expired or invalid
      console.log('🔒 Spotify says: Unauthorized - token invalid/expired');
      const svg = generateNowPlayingSVG(null);
      return res.send(svg);
    }
    
    if (!response.ok) {
      console.log('❌ Spotify API error:', response.status);
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🎶 Spotify data received:', {
      item: !!data.item,
      is_playing: data.is_playing,
      track_name: data.item?.name
    });
    
    // Check if there's actually a track playing
    if (data && data.item && data.is_playing) {
      console.log('✅ Track found, generating SVG');
      const svg = generateNowPlayingSVG(data.item);
      res.send(svg);
    } else {
      // Track exists but not playing
      console.log('⏸️ Track exists but not playing or paused');
      const svg = generateNowPlayingSVG(null);
      res.send(svg);
    }
    
  } catch (error) {
    console.error('Error fetching currently playing track:', error);
    
    // Return error SVG
    const errorSvg = `
      <svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="120" fill="#191414" rx="8" ry="8"/>
        <text x="200" y="60" font-family="'Segoe UI', Arial, sans-serif" font-size="14" font-weight="bold" fill="#e22134" text-anchor="middle">
          Error loading track info
        </text>
        <text x="200" y="80" font-family="'Segoe UI', Arial, sans-serif" font-size="12" fill="#b3b3b3" text-anchor="middle">
          Please try again later
        </text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(errorSvg);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    return res.redirect('/?error=' + error);
  }

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange authorization code for access token
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    const data = await response.json();
    
    // Debug: Log the response
    console.log('Spotify token response:', data);
    console.log('Response status:', response.status);

    if (data.access_token) {
      // Store token globally (in production, use proper session management)
      SPOTIFY_ACCESS_TOKEN = data.access_token;
      
      console.log('✅ Token received successfully!');
      
      // Redirect back with success
      return res.redirect('/?success=true&token=' + encodeURIComponent(data.access_token));
    } else {
      console.log('❌ No access token in response:', data);
      return res.redirect('/?error=token_exchange_failed');
    }

  } catch (error) {
    console.error('Token exchange error:', error);
    return res.redirect('/?error=server_error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server port ${PORT} adresinde çalışıyor.`);
});
