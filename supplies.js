const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');

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

// Connect to MongoDB
client.connect()
    .then(() => {
        usersCollection = client.db('RAPID').collection('users'); // 'users' collection
        storesCollection = client.db('RAPID').collection('stores'); // 'stores' collection
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

// Fetch supplies categorized by type (water, food, medical, gas)
// No authentication needed for this endpoint
app.get('/get-supplies', async (req, res) => {
    try {
        const supplies = await storesCollection.aggregate([
            { $group: { _id: "$supplyType", supplies: { $push: { address: "$address", supplyStatus: "$supplyStatus" } } } }
        ]).toArray();
        res.json(supplies);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching supplies' });
    }
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});
