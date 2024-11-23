const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const authenticate = require('./middleware/auth'); // Import the authentication middleware
const multer = require('multer');
const path = require('path');

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

let usersCollection;
let storesCollection;
let roadClosures;

// Connect to MongoDB
client.connect()
    .then(() => {
        usersCollection = client.db('RAPID').collection('users'); // 'users' collection
        storesCollection = client.db('RAPID').collection('stores'); // 'stores' collection
        roadClosures = client.db('RAPID').collection('roadClosures');
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

// Secret key for JWT
const secretKey = 'yourSecretKey';

// Utility function to convert an ID to ObjectId
function convertToObjectId(id) {
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId');
    }
    return new ObjectId(id);
}

// Utility function to process store data
async function processStore(storeData, userId) {
    const { name, address, hours, contact, supplyType, supplyStatus, latitude, longitude } = storeData;
    return {
        name,
        address,
        hours,
        contact,
        supplyType,
        supplyStatus,
        userId,
        location: { type: 'Point', coordinates: [longitude, latitude] } // Store location as GeoJSON
    };
}


// Public route to fetch supplies (authentication required but returns all supplies)
app.get('/get-supplies', authenticate, async (req, res) => {
    console.log("Fetching supplies...");
    try {
        const supplies = await storesCollection.aggregate([
            {
                $group: {
                    _id: "$supplyType", // Group by supplyType
                    supplies: {
                        $push: {
                            name: "$name",      // Push the address of the store
                            supplyStatus: "$supplyStatus", // Push the supply status
                            latitude: { $arrayElemAt: ["$location.coordinates", 1] }, // Extract latitude from GeoJSON
                            longitude: { $arrayElemAt: ["$location.coordinates", 0] } // Extract longitude from GeoJSON
                        }
                    }
                }
            }
        ]).toArray();
        

        console.log("Supplies fetched:", supplies);
        // Debugging line
        res.json(supplies); // Return the supplies data
    } catch (err) {
        console.error("Error fetching supplies:", err); // Debugging line
        res.status(500).json({ error: 'Error fetching supplies' });
    }
});


// Sign-up endpoint
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const userExists = await usersCollection.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = { name, email, password: hashedPassword };
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

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ _id: user._id }, secretKey, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token });
    } catch (err) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Middleware to authenticate the user (verify JWT token)
// Apply authenticate middleware only to routes that need authentication
// app.use(authenticate); // Do not use this globally, only on protected routes

// Register Store endpoint (requires authentication)
app.post('/register-store', authenticate, async (req, res) => {
    try {
        const { name, address, hours, contact, supplyType, supplyStatus, latitude, longitude } = req.body;

        // Validate and process the store data
        const newStore = {
            name,
            address,
            hours,
            contact,
            supplyType,
            supplyStatus,
            location: { type: 'Point', coordinates: [longitude, latitude] }, // Store location as GeoJSON
            userId: req.user._id
        };

        const result = await storesCollection.insertOne(newStore);
        if (result.acknowledged) {
            res.json({ message: 'Store registered successfully' });
        } else {
            res.status(500).json({ error: 'Error registering store' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error registering store' });
    }
});


// Fetch stores for the authenticated user (requires authentication)
app.get('/get-stores', authenticate, async (req, res) => {
    try {
        const stores = await storesCollection.find({ userId: req.user._id }).toArray();
        res.json(stores || []); // Return an empty array if no stores are found
    } catch (err) {
        res.status(500).json({ error: 'Error fetching stores' });
    }
});

// Get store details by ID (requires authentication)
app.get('/get-store/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    console.log("Fetching store with ID:", id);

    try {
        const objectId = convertToObjectId(id); // Convert id to ObjectId
        const store = await storesCollection.findOne({ _id: objectId, userId: req.user._id });

        if (store) {
            res.json(store); // Send store data
        } else {
            console.log("Store not found or unauthorized access:", id);
            res.status(404).json({ error: 'Store not found or not authorized' });
        }
    } catch (err) {
        console.error("Error in /get-store:", err);
        res.status(500).json({ error: 'Error fetching store' });
    }
});

// Update store endpoint (requires authentication)
app.put('/update-store/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const objectId = convertToObjectId(id); // Convert id to ObjectId
        const updatedStore = await processStore(req.body, req.user._id);

        const result = await storesCollection.updateOne(
            { _id: objectId, userId: req.user._id }, // Ensure only the store owner can update
            { $set: updatedStore }
        );

        if (result.modifiedCount > 0) {
            res.json({ message: 'Store updated successfully' });
        } else {
            res.status(400).json({ error: 'Store not found or you are not authorized to update it' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error updating store' });
    }
});

// Delete store endpoint (requires authentication)
app.delete('/delete-store/:id', authenticate, async (req, res) => {
    const { id } = req.params;

    try {
        const objectId = convertToObjectId(id); // Convert id to ObjectId

        const result = await storesCollection.deleteOne(
            { _id: objectId, userId: req.user._id } // Ensure only the store owner can delete
        );

        if (result.deletedCount > 0) {
            res.json({ message: 'Store deleted successfully' });
        } else {
            res.status(400).json({ error: 'Store not found or you are not authorized to delete it' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error deleting store' });
    }
});

app.post('/api/report-road-closure', async (req, res) => {
    console.log('Request Body:', req.body);

    const { reporterName, roadAddress, roadAddress2, roadReason, startCoordinates, endCoordinates } = req.body;

    if (!reporterName || !roadAddress || !roadReason || !startCoordinates || !endCoordinates) {
        return res.status(400).json({ error: 'All fields, including coordinates, are required.' });
    }

    try {
        const reportData = {
            reporterName,
            roadAddress,
            roadAddress2,
            roadReason,
            startCoordinates,
            endCoordinates,
            createdAt: new Date(),
        };

        const result = await client.db('RAPID').collection('roadClosures').insertOne(reportData);

        if (result.acknowledged) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to submit road closure report.' });
        }
    } catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).json({ error: 'An error occurred while submitting the report.' });
    }
});


// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
