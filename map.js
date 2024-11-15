// Include Leaflet and Geocoder JS
const leafletScript = document.createElement('script');
leafletScript.src = "https://unpkg.com/leaflet/dist/leaflet.js";
document.head.appendChild(leafletScript);

const geocoderScript = document.createElement('script');
geocoderScript.src = "https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js";
document.head.appendChild(geocoderScript);

// Ensure scripts load before initializing the map
geocoderScript.onload = () => {
    // Initialize Leaflet map
    const map = L.map('map').setView([13.7565, 121.0583], 13); // Centered on Manila, Philippines

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const storeAddress = document.getElementById('storeAddress');
    const suggestionsList = document.getElementById('suggestions');

    // Function to fetch suggestions from Nominatim API
    storeAddress.addEventListener('input', async () => {
        const query = storeAddress.value;

        if (query.length < 3) {
            suggestionsList.innerHTML = ''; // Clear suggestions if input is too short
            return;
        }

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

        try {
            const response = await fetch(url);
            const suggestions = await response.json();

            // Clear the previous suggestions
            suggestionsList.innerHTML = '';

            suggestions.forEach((item) => {
                const listItem = document.createElement('li');
                listItem.textContent = item.display_name;
                listItem.style.cursor = 'pointer';

                // Add click event to zoom the map to the selected location
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
};
