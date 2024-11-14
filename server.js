const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();

// Use CORS middleware
app.use(cors()); // This allows all origins, you can configure it further

// Middleware to parse JSON requests
app.use(bodyParser.json());

const uri = "mongodb+srv://mimikyow:rapid@rapid.5uvhi.mongodb.net/?retryWrites=true&w=majority&appName=RAPID";
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let usersCollection; // This will hold the reference to the users collection

// Connect to MongoDB
client.connect()
    .then(() => {
        usersCollection = client.db('RAPID').collection('users'); // Use 'users' as the collection name
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

// Sign-up endpoint
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Validate password strength (simple example, adjust as needed)
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if the user already exists
        const userExists = await usersCollection.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new user
        const newUser = { name, email, password: hashedPassword };

        // Insert the user into the database
        const result = await usersCollection.insertOne(newUser);

        if (result.acknowledged) {
            res.json({ message: 'User registered successfully' });
        } else {
            res.status(500).json({ error: 'Error registering user' });
        }
    } catch (err) {
        console.error('Error during user registration:', err);
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Sign-in endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Success message (you may want to add a token or session here)
        res.json({ message: 'Logged in successfully' });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Set up the server to listen on port 5000
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
