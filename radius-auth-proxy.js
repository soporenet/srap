const express = require('express');
const radius = require('radius');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

// Load the configuration file
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'radius-auth-proxy-config.json'), 'utf8'));

const app = express();
const port = config.listenPort || 2812; // Default to 2812 if not specified in the config file
const RADIUS_SECRET = config.RADIUS_SECRET;
const RADIUS_SERVER = config.RADIUS_SERVER; // e.g., 'rad-auth' or '192.168.1.1'
const RADIUS_PORT = config.RADIUS_PORT || 1812; // Default to port 1812 if not specified
const USERNAME_FIELD = config.usernameField || 'username'; // Default to 'username' if not specified
const PASSWORD_FIELD = config.passwordField || 'password'; // Default to 'password' if not specified

const server = dgram.createSocket('udp4');

// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// POST route to authenticate users
app.post('/auth', (req, res) => {
  const { [USERNAME_FIELD]: username, [PASSWORD_FIELD]: password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  console.log('radius.AccessRequest', radius.AccessRequest); 
  console.log('username', username); 
  console.log('password', password); 
  const packet = radius.encode({
    //code: radius.AccessRequest,
    code: 1,
    secret: Buffer.from(RADIUS_SECRET),
    identifier: 1,
    attributes: [
      ['User-Name', username],
      ['User-Password', password]
    ]
  });

  server.send(packet, 0, packet.length, RADIUS_PORT, RADIUS_SERVER, (err) => {
    if (err) {
      console.error('Error sending packet to RADIUS server:', err);
      return res.status(500).json({ message: 'Error contacting RADIUS server' });
    }

    // Wait for RADIUS response
    server.once('message', (msg) => {
      const response = radius.decode({ packet: msg, secret: Buffer.from(RADIUS_SECRET) });

      if (response.code === radius.AccessAccept) {
        res.status(200).cookie('authenticated', 'true', {
        httpOnly: true,    // Secure the cookie (optional, can be adjusted based on your needs)
        secure: true,      // Use 'true' if you want cookies only over HTTPS
        maxAge: 900000,   // Cookie expiration time (1 hour in this case, adjust as needed)
        sameSite: 'Strict', // Prevent cross-site requests (adjust as needed)a
	path: '/'
        });
		
        return res.json({ message: 'Authentication successful' });
      } else {
        return res.status(401).json({ message: 'Authentication failed' });
      }
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`RADIUS auth proxy listening on port ${port}`);
});

