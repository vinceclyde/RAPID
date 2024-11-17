const jwt = require('jsonwebtoken');
const secretKey = 'yourSecretKey'; 

// Middleware to authenticate users
// authenticate middleware
function authenticate(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded;  // Attach user to request object
        console.log('User authenticated:', req.user);  // Log the authenticated user
        next();
    } catch (err) {
        console.error('Authentication error:', err);  // Log authentication errors
        res.status(401).json({ error: 'Invalid token' });
    }
}


module.exports = authenticate;
