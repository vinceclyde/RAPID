const jwt = require('jsonwebtoken');
const secretKey = 'yourSecretKey';  // Store secret key securely

// Middleware to authenticate users
function authenticate(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded; // Attach user info to the request object

        // Log user info for debugging
        console.log('Authenticated User:', req.user);

        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}



module.exports = authenticate;
