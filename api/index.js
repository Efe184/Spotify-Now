const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

// Spotify API credentials
const CLIENT_ID = '7098f9afd3614ae088dd4233bb7a8d3b';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/callback';

app.use(express.static('.'));

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// OAuth callback
app.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.redirect('/?error=' + error);
  }
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Store tokens (in production, use secure storage)
    global.spotifyTokens = {
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in * 1000)
    };

    res.redirect('/?success=true');
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.redirect('/?error=token_exchange_failed');
  }
});

// SVG endpoint for now playing
app.get('/now-playing.svg', async (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  try {
    if (!global.spotifyTokens || !global.spotifyTokens.access_token) {
      return res.send(generateNotPlayingSVG());
    }

    // Check if token is expired
    if (Date.now() >= global.spotifyTokens.expires_at) {
      return res.send(generateNotPlayingSVG());
    }

    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${global.spotifyTokens.access_token}`
      }
    });

    if (!response.data || !response.data.is_playing) {
      return res.send(generateNotPlayingSVG());
    }

    const track = response.data.item;
    const artist = track.artists[0].name;
    const songName = track.name;
    const albumImage = track.album.images[0]?.url || '';

    res.send(generateNowPlayingSVG(songName, artist, albumImage));
  } catch (error) {
    console.error('Spotify API error:', error.response?.data || error.message);
    res.send(generateNotPlayingSVG());
  }
});

function generateNotPlayingSVG() {
  return `
    <svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1DB954"/>
          <stop offset="100%" style="stop-color:#191414"/>
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#gradient)" rx="8"/>
      <text x="200" y="50" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">Not Playing</text>
      <text x="200" y="75" text-anchor="middle" fill="#b3b3b3" font-family="Arial, sans-serif" font-size="14">Connect Spotify to see current track</text>
    </svg>
  `;
}

function generateNowPlayingSVG(songName, artist, albumImage) {
  const truncatedSong = songName.length > 30 ? songName.substring(0, 30) + '...' : songName;
  const truncatedArtist = artist.length > 25 ? artist.substring(0, 25) + '...' : artist;
  
  return `
    <svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1DB954"/>
          <stop offset="100%" style="stop-color:#191414"/>
        </linearGradient>
        <style>
          .bar {
            animation: wave 1.5s ease-in-out infinite;
          }
          .bar:nth-child(2) { animation-delay: 0.1s; }
          .bar:nth-child(3) { animation-delay: 0.2s; }
          .bar:nth-child(4) { animation-delay: 0.3s; }
          @keyframes wave {
            0%, 100% { height: 8px; y: 46px; }
            50% { height: 20px; y: 40px; }
          }
        </style>
      </defs>
      <rect width="400" height="120" fill="url(#gradient)" rx="8"/>
      
      <!-- Album Cover -->
      <rect x="15" y="15" width="90" height="90" fill="#333" rx="4"/>
      ${albumImage ? `<image x="15" y="15" width="90" height="90" href="${albumImage}" clip-path="inset(0 round 4px)"/>` : ''}
      
      <!-- Spotify Logo -->
      <circle cx="385" cy="15" r="8" fill="#1DB954"/>
      <path d="M381 12c3 0 5 1 5 3s-2 3-5 3-5-1-5-3 2-3 5-3z" fill="white"/>
      
      <!-- Now Playing Text -->
      <text x="120" y="28" fill="#1DB954" font-family="Arial, sans-serif" font-size="12" font-weight="bold">NOW PLAYING</text>
      
      <!-- Song Name -->
      <text x="120" y="50" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">${truncatedSong}</text>
      
      <!-- Artist -->
      <text x="120" y="70" fill="#b3b3b3" font-family="Arial, sans-serif" font-size="14">${truncatedArtist}</text>
      
      <!-- Animated Sound Bars -->
      <g transform="translate(120, 80)">
        <rect class="bar" x="0" y="46" width="3" height="8" fill="#1DB954"/>
        <rect class="bar" x="5" y="44" width="3" height="12" fill="#1DB954"/>
        <rect class="bar" x="10" y="42" width="3" height="16" fill="#1DB954"/>
        <rect class="bar" x="15" y="46" width="3" height="8" fill="#1DB954"/>
      </g>
    </svg>
  `;
}

// Export for Vercel
module.exports = app; 