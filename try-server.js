const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();

// Use CORS middleware
app.use(cors());

// Middleware to parse JSON requests
app.use(bodyParser.json());

const uri = "mongodb+srv://mimikyow:rapid@rapid.5uvhi.mongodb.net/?retryWrites=true&w=majority&appName=RAPID";
const client = new MongoClient(uri);

let storesCollection;

// Initialize the database connection
async function initializeDatabase() {
    try {
        await client.connect(); // Connect to the MongoDB server
        console.log('Connected to MongoDB');
        storesCollection = client.db('RAPID').collection('stores'); // Reference the collection
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1); // Exit if the database connection fails
    }
}

initializeDatabase();

// Endpoint to register a new store
app.post('/register-store', async (req, res) => {
    const { name, address, hours, contact, supplyType, supplyStatus } = req.body;

    try {
        // Validate the required fields
        if (!name || !address || !hours || !contact || !supplyType || !supplyStatus) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Create the store object
        const newStore = { name, address, hours, contact, supplyType, supplyStatus };

        // Insert the store into the database
        const result = await storesCollection.insertOne(newStore);

        if (result.acknowledged) {
            res.json({ message: 'Store registered successfully' });
        } else {
            res.status(500).json({ error: 'Error registering store' });
        }
    } catch (err) {
        console.error('Error during store registration:', err);
        res.status(500).json({ error: 'Error registering store' });
    }
});

// Endpoint to get all registered stores
app.get('/get-stores', async (req, res) => {
    try {
        if (!storesCollection) {
            throw new Error('Database not initialized');
        }

        const stores = await storesCollection.find({}).toArray();
        res.json(stores);
    } catch (err) {
        console.error('Error fetching stores:', err);
        res.status(500).json({ error: 'Error fetching stores' });
    }
});

// Endpoint to update an existing store
app.put('/update-store/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, hours, contact, supplyType, supplyStatus } = req.body;

    try {
        // Validate the required fields
        if (!name || !address || !hours || !contact || !supplyType || !supplyStatus) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const updatedStore = { name, address, hours, contact, supplyType, supplyStatus };

        const result = await storesCollection.updateOne(
            { _id: new MongoClient.ObjectId(id) },
            { $set: updatedStore }
        );

        if (result.modifiedCount > 0) {
            res.json({ message: 'Store updated successfully' });
        } else {
            res.status(404).json({ error: 'Store not found' });
        }
    } catch (err) {
        console.error('Error updating store:', err);
        res.status(500).json({ error: 'Error updating store' });
    }
});

// Endpoint to delete a store
app.delete('/delete-store/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await storesCollection.deleteOne({ _id: new MongoClient.ObjectId(id) });

        if (result.deletedCount > 0) {
            res.json({ message: 'Store deleted successfully' });
        } else {
            res.status(404).json({ error: 'Store not found' });
        }
    } catch (err) {
        console.error('Error deleting store:', err);
        res.status(500).json({ error: 'Error deleting store' });
    }
});



// Start the server on port 5000
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
