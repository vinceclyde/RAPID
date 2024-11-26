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
let approvedRoadsCollection;

// Connect to MongoDB
client.connect()
    .then(() => {
        usersCollection = client.db('RAPID').collection('users'); // 'users' collection
        storesCollection = client.db('RAPID').collection('stores'); // 'stores' collection
        roadClosures = client.db('RAPID').collection('roadClosures');
        approvedRoadsCollection = client.db('RAPID').collection('approvedRoads');
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
        // Special case: Check if the email is admin@email.com and password is 'rapid'
        if (email === 'admin@email.com' && password === 'rapid') {
            // If the email is admin and the password is 'rapid', assign admin role
            const token = jwt.sign(
                { email: 'admin@email.com', role: 'admin' },
                secretKey, 
                { expiresIn: '1h' }
            );
            return res.json({ message: 'Logged in as Admin', token });
        }

        // For other users, fetch user data from the database
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Assign role from the user data or default to 'user' if no role is set
        const role = user.role || 'user';

        // Generate JWT token including the user's role
        const token = jwt.sign(
            { _id: user._id, email: user.email, role: role },
            secretKey, 
            { expiresIn: '1h' }
        );

        // Send the response with the token
        res.json({ message: 'Logged in successfully', token });
    } catch (err) {
        console.error('Login error:', err);
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

app.get('/get-all-stores', authenticate, async (req, res) => {
    try {
        const stores = await storesCollection.find({}).toArray(); // Fetch all stores without filtering
        res.json(stores || []); // Return an empty array if no stores are found
    } catch (err) {
        res.status(500).json({ error: 'Error fetching stores' });
    }
});

app.get('/get-road-closures', authenticate, async (req, res) => {
    try {
        const closures = await roadClosures.find().toArray();
        console.log('Fetched closures:', closures); // Log to see what data is returned
        if (closures.length > 0) {
            res.json(closures); // Return all road closures if any are found
        } else {
            res.status(404).json({ error: 'No road closures found' });
        }
    } catch (err) {
        console.error("Error fetching road closures:", err);
        res.status(500).json({ error: 'Error fetching road closures' });
    }
});

// Fetch specific road closure by ID (requires authentication)
app.get('/get-road-closure/:id', authenticate, async (req, res) => {
    const { id } = req.params; // Get the closureId from the request parameters

    try {
        // Convert the closureId to an ObjectId if it's a MongoDB ObjectId
        const objectId = convertToObjectId(id);

        // Fetch the road closure data from the database using the provided ID
        const closure = await roadClosures.findOne({ _id: objectId });

        if (closure) {
            // Send the road closure data if found
            res.json(closure);
        } else {
            // If no closure is found, return a 404 error
            res.status(404).json({ error: 'Road closure not found' });
        }
    } catch (err) {
        console.error("Error fetching road closure:", err);
        res.status(500).json({ error: 'Error fetching road closure' });
    }
});

app.get('/get-approved-roads', authenticate, async (req, res) => {
    try {
        console.log("Fetching approved roads...");
        const approvedRoads = await approvedRoadsCollection.find().toArray();
        console.log('Fetched approved roads:', approvedRoads);
        if (approvedRoads.length > 0) {
            res.json(approvedRoads);
        } else {
            res.status(404).json({ error: 'No approved roads found' });
        }
    } catch (err) {
        console.error("Error fetching approved roads:", err);
        res.status(500).json({ error: 'Error fetching approved roads' });
    }
});

app.delete('/delete-road/:roadId', authenticate, async (req, res) => {
    const { roadId } = req.params;
    try {
        console.log(`Attempting to delete road with ID: ${roadId}`);
        
        const result = await approvedRoadsCollection.deleteOne({ _id: new ObjectId(roadId) });
        
        if (result.deletedCount === 1) {
            console.log(`Road with ID ${roadId} deleted successfully`);
            res.status(200).json({ message: `Road with ID ${roadId} deleted successfully` });
        } else {
            console.warn(`No road found with ID: ${roadId}`);
            res.status(404).json({ error: `No road found with ID: ${roadId}` });
        }
    } catch (err) {
        console.error("Error deleting road:", err);
        res.status(500).json({ error: 'Error deleting road' });
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

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'HTML/uploads/road-closures')); // Adjusted path for upper-level directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    },
});

app.use('/HTML/uploads', express.static(path.join(__dirname, '../uploads')));

// Multer filter to accept only images
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/;
        const mimeType = fileTypes.test(file.mimetype);
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    },
});

app.post('/api/report-road-closure', upload.array('closureImages'), async (req, res) => {
    try {
        const { reporterName, roadAddress, roadAddress2, roadReason, startCoordinates, endCoordinates } = req.body;
        const imagePaths = req.files
            ? req.files.map(file => `/HTML/uploads/road-closures/${path.basename(file.path)}`)
            : []; // Store web-accessible paths

        // Validate fields
        if (!reporterName || !roadAddress || !roadReason || !startCoordinates || !endCoordinates) {
            return res.status(400).json({ error: 'All fields, including coordinates, are required.' });
        }

        // Prepare data for insertion
        const reportData = {
            reporterName,
            roadAddress,
            roadAddress2,
            roadReason,
            startCoordinates: JSON.parse(startCoordinates),
            endCoordinates: JSON.parse(endCoordinates),
            imagePaths, // Store paths for serving via the static route
            createdAt: new Date(),
        };

        const result = await roadClosures.insertOne(reportData);

        if (result.acknowledged) {
            res.json({ success: true, imagePaths });
        } else {
            res.status(500).json({ error: 'Failed to submit road closure report.' });
        }
    } catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).json({ error: 'An error occurred while submitting the report.' });
    }
});

app.post('/api/road-closure/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid road closure ID format.' });
        }

        // Find the road closure by ID
        const roadClosure = await roadClosures.findOne({ _id: new ObjectId(id) });
        if (!roadClosure) {
            return res.status(404).json({ error: 'Road closure not found.' });
        }

        // Insert into approvedRoads
        const approvedResult = await approvedRoadsCollection.insertOne({
            ...roadClosure,
            approvedAt: new Date(),
        });

        if (!approvedResult.acknowledged) {
            return res.status(500).json({ error: 'Failed to approve road closure.' });
        }

        // Remove from roadClosures
        const deleteResult = await roadClosures.deleteOne({ _id: new ObjectId(id) });
        if (deleteResult.deletedCount === 0) {
            return res.status(500).json({ error: 'Failed to remove the road closure from the original collection.' });
        }

        res.json({ success: true, message: 'Road closure approved successfully.' });
    } catch (err) {
        console.error('Error approving road closure:', err);
        res.status(500).json({ error: 'An error occurred while approving the road closure.' });
    }
});

// Reject a road closure
app.post('/api/road-closure/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete the road closure by ID
        const deleteResult = await roadClosures.deleteOne({ _id: new ObjectId(id) });
        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ error: 'Road closure not found or already deleted.' });
        }

        res.json({ success: true, message: 'Road closure rejected and removed successfully.' });
    } catch (err) {
        console.error('Error rejecting road closure:', err);
        res.status(500).json({ error: 'An error occurred while rejecting the road closure.' });
    }
});


app.delete('/delete-store-admin/:id', authenticate, async (req, res) => {
    const storeId = req.params.id;
    const { user } = req;  // Access the authenticated user

    try {
        // Ensure storesCollection is available
        if (!storesCollection) {
            return res.status(500).json({ error: 'Stores collection is not initialized' });
        }

        // Use findOne to get the store by _id
        const store = await storesCollection.findOne({ _id: convertToObjectId(storeId) });
        
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // If the user is an admin, they can delete any store
        if (user.role === 'admin') {
            console.log('Admin user detected');
            await storesCollection.deleteOne({ _id: convertToObjectId(storeId) });
            return res.status(200).json({ message: 'Store deleted successfully' });
        }

        // If the user is not an admin, check if they are the owner of the store
        if (store.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ error: 'You can only delete your own stores' });
        }

        await storesCollection.deleteOne({ _id: convertToObjectId(storeId) });
        res.status(200).json({ message: 'Store deleted successfully' });
    } catch (err) {
        console.error('Error deleting store:', err);
        res.status(500).json({ error: 'An error occurred while deleting the store' });
    }
});


// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
