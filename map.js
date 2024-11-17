console.log('map.js loaded');

// Initialize Leaflet map
const map = L.map('map').setView([13.7565, 121.0583], 13); // Centered on the Philippines

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Get DOM elements
const storeAddress = document.getElementById('storeAddress');
const suggestionsList = document.getElementById('suggestions');

// Add CSS for suggestions (optional, can move to a CSS file)
const style = document.createElement('style');
style.textContent = `
    #suggestions {
        list-style: none;
        padding: 0;
        margin: 0;
        position: absolute;
        background: white;
        border: 1px solid #ccc;
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
        width: 300px;
    }
    #suggestions li {
        padding: 5px;
        cursor: pointer;
    }
    #suggestions li:hover {
        background: #f0f0f0;
    }
`;
document.head.appendChild(style);

// Function to fetch suggestions from Nominatim API
storeAddress.addEventListener('input', async () => {
    const query = storeAddress.value.trim();

    if (query.length < 3) {
        suggestionsList.innerHTML = ''; // Clear suggestions if input is too short
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const suggestions = await response.json();

        // Clear the previous suggestions
        suggestionsList.innerHTML = '';

        suggestions.forEach((item) => {
            const listItem = document.createElement('li');
            listItem.textContent = item.display_name;

            // Click event: zoom the map to the selected location
            listItem.addEventListener('click', () => {
                map.setView([item.lat, item.lon], 15); // Zoom to the location
                L.marker([item.lat, item.lon]).addTo(map); // Add a marker

                storeAddress.value = item.display_name; // Set the selected address
                suggestionsList.innerHTML = ''; // Clear suggestions
            });

            suggestionsList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
});