const apiBaseUrl = 'http://localhost:5000';
const token = localStorage.getItem('authToken'); // Retrieve the JWT token


// Call fetchUserData when the page loads
document.addEventListener('DOMContentLoaded', function () {
    const contentArea = document.getElementById("contentArea");
    const navItems = document.querySelectorAll(".navBarText");

    // Function to load HTML content from a file
    function loadContent(file) {
        fetch(file)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Could not load ${file}`);
                }
                return response.text();
            })
            .then(data => {
                contentArea.innerHTML = data;
                if (file === "register-store.html") {
                    initializeMap(); // Initialize map
                    setupAddressInput(); // Setup address suggestions
                    fetchStores(); // Fetch and display stores only for the register-store page
                }
            })
            .catch(error => {
                console.error("Error loading content:", error);
                contentArea.innerHTML = "<p>Content not available.</p>";
            });
    }

    // Load "Dashboard" by default
    loadContent("supplies.html");

    // Event listeners for nav items
    document.getElementById("dashboard").addEventListener("click", () => {
        loadContent("supplies.html");
        fetchSupplies();  
    });

    document.getElementById("storeRegistration").addEventListener("click", () => {
        loadContent("register-store.html");
    });

    document.getElementById("alertCenter").addEventListener("click", () => {
        loadContent("alert-center.html");
    });

    document.getElementById("locatorMap").addEventListener("click", () => {
        loadContent("locator.html");
    });

    document.getElementById("roadClosure").addEventListener("click", () => {
        loadContent("road-closure.html");
    });
});


// Initialize the Leaflet map for Store Registration
function initializeMap() {
    const map = L.map('map').setView([13.7565, 121.0583], 13); // Default center (Philippines)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    window.map = map; // Store map reference globally
}

let selectedLatitude = null;
let selectedLongitude = null;

function setupAddressInput() {
    const storeAddress = document.getElementById('storeAddress');
    const suggestionsList = document.getElementById('suggestions');

    storeAddress.addEventListener('input', async () => {
        const query = storeAddress.value.trim();

        if (query.length < 3) {
            suggestionsList.innerHTML = ''; // Clear suggestions if input is too short
            return;
        }

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

        try {
            const response = await fetch(url);
            const suggestions = await response.json();

            suggestionsList.innerHTML = ''; // Clear previous suggestions

            suggestions.forEach((item) => {
                const listItem = document.createElement('li');
                listItem.textContent = item.display_name;

                listItem.addEventListener('click', () => {
                    window.map.setView([item.lat, item.lon], 15); // Zoom to the location
                    L.marker([item.lat, item.lon]).addTo(window.map); // Add a marker
                    storeAddress.value = item.display_name; // Set the selected address
                    selectedLatitude = item.lat; // Store latitude
                    selectedLongitude = item.lon; // Store longitude
                    suggestionsList.innerHTML = ''; // Clear suggestions
                });

                suggestionsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    });
}


// Fetch stores from the database and display them immediately upon page load
async function fetchStores() {
    if (!token) {
        alert("Please log in first.");
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/get-stores`, {
            headers: {
                'Authorization': `Bearer ${token}` // Send token in the header
            }
        });

        const stores = await response.json();

        if (Array.isArray(stores)) {
            displayStores(stores);
        } else {
            console.error("Invalid response format:", stores);
        }
    } catch (error) {
        console.error("Error fetching stores:", error);
    }
}

// Display stores in the UI
function displayStores(stores) {
    const storeList = document.getElementById("storeList");
    storeList.innerHTML = ""; // Clear the existing list
    stores.forEach(store => {
        const storeInfo = document.createElement("div");
        storeInfo.innerHTML = `
            <input type="radio" name="selectedStore" value="${store._id}" id="store-${store._id}">
            <label for="store-${store._id}">
                <strong>${store.name}</strong><br>
                Address: ${store.address}<br>
                Hours: ${store.hours}<br>
                Contact: ${store.contact}<br>
                Supply Type: ${store.supplyType}<br>
                Supply Status: ${store.supplyStatus}<br>
            </label>
            <hr>
        `;
        storeList.appendChild(storeInfo);
    });
}

// Call fetchStores immediately when the page loads
document.addEventListener('DOMContentLoaded', function () {
    fetchStores();  // Fetch stores when the page loads
});


// Display stores in the UI
function displayStores(stores) {
    const storeList = document.getElementById("storeList");
    storeList.innerHTML = ""; // Clear the existing list
    stores.forEach(store => {
        const storeInfo = document.createElement("div");
        storeInfo.innerHTML = `
            <input type="radio" name="selectedStore" value="${store._id}" id="store-${store._id}">
            <label for="store-${store._id}">
                <strong>${store.name}</strong><br>
                Address: ${store.address}<br>
                Hours: ${store.hours}<br>
                Contact: ${store.contact}<br>
                Supply Type: ${store.supplyType}<br>
                Supply Status: ${store.supplyStatus}<br>
            </label>
            <hr>
        `;
        storeList.appendChild(storeInfo);
    });
}

// Register store function
async function registerStore() {
    if (!token) {
        alert("Please log in first.");
        return;
    }

    const storeName = document.getElementById("storeName").value;
    const storeAddress = document.getElementById("storeAddress").value;
    const storeHours = document.getElementById("storeHours").value;
    const contactNumber = document.getElementById("contactNumber").value;
    const supplyType = document.querySelector('input[name="supplyType"]:checked').value || "";
    const supplyStatus = document.querySelector('input[name="supplyStatus"]:checked').value || "";

    if (!selectedLatitude || !selectedLongitude) {
        alert("Please select a valid address from the suggestions.");
        return;
    }

    const store = {
        name: storeName,
        address: storeAddress,
        hours: storeHours,
        contact: contactNumber,
        supplyType,
        supplyStatus,
        latitude: selectedLatitude, // Send latitude
        longitude: selectedLongitude // Send longitude
    };

    try {
        const response = await fetch(`${apiBaseUrl}/register-store`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(store)
        });

        const data = await response.json();
        if (data.message) {
            alert(data.message);
            fetchStores(); // Refresh the stores list
            clearStoreForm(); // Clear the form after submission
        } else {
            console.error('Error registering store:', data);
        }
    } catch (error) {
        console.error('Error during store registration:', error);
    }
}


function clearStoreForm() {
    document.getElementById("storeName").value = "";
    document.getElementById("storeAddress").value = "";
    document.getElementById("storeHours").value = "";
    document.getElementById("contactNumber").value = "";

}

window.onload = fetchStores;
document.addEventListener('DOMContentLoaded', function () {
    fetchStores();  // Fetch stores when the page loads
});
// Store the selected store ID for update purposes
let selectedStoreId = null;

async function deleteStore() {
    const selectedStoreId = document.querySelector('input[name="selectedStore"]:checked')?.value;
    if (!selectedStoreId) {
        alert("Please select a store to delete.");
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/delete-store/${selectedStoreId}`, {
            method: "DELETE",
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.message) {
            alert(data.message);
            fetchStores();  // Refresh the stores after deletion
        } else {
            console.error("Error deleting store:", data.error || "Unknown error");
        }
    } catch (error) {
        console.error("Error during store deletion:", error);
    }
}



async function prepareUpdate() {
    let selectedStoreId = document.querySelector('input[name="selectedStore"]:checked')?.value;
    if (!selectedStoreId) {
        alert("Please select a store to update.");
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/get-store/${selectedStoreId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });   
        const store = await response.json();

        if (store) {
            // Pre-fill the form with store details for update
            document.getElementById("storeName").value = store.name;
            document.getElementById("storeAddress").value = store.address;
            document.getElementById("storeHours").value = store.hours;
            document.getElementById("contactNumber").value = store.contact;

            document.querySelector(`input[name="supplyType"][value="${store.supplyType}"]`).checked = true;
            document.querySelector(`input[name="supplyStatus"][value="${store.supplyStatus}"]`).checked = true;

            // Store the selected store's ID globally
            selectedStoreId = store._id;
        } else {
            console.error("Store not found for update.");
        }
    } catch (error) {
        console.error("Error fetching store details:", error);
    }
}


async function updateStore() {
    const selectedStoreId = document.querySelector('input[name="selectedStore"]:checked')?.value;
    if (!selectedStoreId) {
        alert("Please select a store to update.");
        return;
    }

    const storeName = document.getElementById("storeName").value;
    const storeAddress = document.getElementById("storeAddress").value;
    const storeHours = document.getElementById("storeHours").value;
    const contactNumber = document.getElementById("contactNumber").value;
    const supplyType = document.querySelector('input[name="supplyType"]:checked').value || "";
    const supplyStatus = document.querySelector('input[name="supplyStatus"]:checked').value || "";

    const store = {
        name: storeName,
        address: storeAddress,
        hours: storeHours,
        contact: contactNumber,
        supplyType,
        supplyStatus,
        latitude: selectedLatitude, // Updated latitude
        longitude: selectedLongitude // Updated longitude
    };

    try {
        const response = await fetch(`${apiBaseUrl}/update-store/${selectedStoreId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(store)
        });

        const data = await response.json();
        if (data.message) {
            alert(data.message);

            // Remove existing map instance
            if (window.map) {
                window.map.remove();
            }

            // Reinitialize map
            initializeMap();

            // Fetch and display updated stores
            fetchStores();

            // Clear the form
            clearStoreForm();
        } else {
            console.error('Error updating store:', data);
        }
    } catch (error) {
        console.error('Error during store update:', error);
    }
}


// Display stores with radio buttons for selection
function displayStores(stores) {
    const storeList = document.getElementById("storeList");
    storeList.innerHTML = ""; // Clear the existing list
    stores.forEach(store => {
        const storeInfo = document.createElement("div");
        storeInfo.innerHTML = `
            <input type="radio" name="selectedStore" value="${store._id}" id="store-${store._id}">
            <label for="store-${store._id}">
                <strong>${store.name}</strong><br>
                Address: ${store.address}<br>
                Hours: ${store.hours}<br>
                Contact: ${store.contact}<br>
                Supply Type: ${store.supplyType}<br>
                Supply Status: ${store.supplyStatus}<br>
            </label>
            <hr>
        `;
        storeList.appendChild(storeInfo);
    });
}
async function fetchSupplies() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('No token found, please log in again.');
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/get-supplies`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        const data = await response.json();

        if (response.ok) {
            const map = L.map('map').setView([13.7565, 121.0583], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const suppliesList = document.getElementById('supplies-list');
            suppliesList.innerHTML = '';

            const markerMap = {}; // Map to store markers by supply ID or some unique property

                        // Define icons for each supply type
                        const iconMap = {
                            Food: 'styles/assets/food_icon.png',
                            Medical: 'styles/assets/medic_icon.png',
                            Gas: 'styles/assets/gas_icon.png',
                            Water: 'styles/assets/water_icon.png',
                        };


            data.forEach(supplyType => {
                const supplyContainer = document.createElement('div');
                supplyContainer.classList.add('supply-container');

                // Create a container for the header and image
                const headerContainer = document.createElement('div');
                headerContainer.classList.add('header-container');

                // Create the image element
                const typeImage = document.createElement('img');
                typeImage.src = iconMap[supplyType._id] || 'assets/icons/default.png'; // Use default icon if not found
                typeImage.alt = `${supplyType._id} Icon`;
                typeImage.classList.add('supply-type-icon');

                // Create the header
                const typeHeader = document.createElement('h2');
                typeHeader.textContent = `${supplyType._id} Supply`;

                // Append the image and header to the container
                headerContainer.appendChild(typeImage);
                headerContainer.appendChild(typeHeader);

                // Append the header container to the supply container
                supplyContainer.appendChild(headerContainer);

                // Sort supplies by name
                supplyType.supplies.sort((a, b) => {
                    const nameA = a.name || ''; // Handle missing names
                    const nameB = b.name || '';
                    return nameA.localeCompare(nameB);
                });

                supplyType.supplies.forEach(supply => {
                    const supplyItem = document.createElement('div');
                    supplyItem.classList.add('supply-item');

                    const name = document.createElement('div');
                    name.classList.add('address-column');
                    name.textContent = supply.name || "No Name Available";

                    const availability = document.createElement('div');
                    availability.classList.add('availability-column');

                    switch (supply.supplyStatus) {
                        case 'Available':
                            availability.textContent = supply.supplyStatus;
                            availability.style.color = 'green';
                            break;
                        case 'Limited':
                            availability.textContent = supply.supplyStatus;
                            availability.style.color = 'orange';
                            break;
                        case 'Out Of Stock':
                            availability.textContent = supply.supplyStatus;
                            availability.style.color = 'red';
                            break;
                        default:
                            availability.textContent = 'Status Unknown';
                            availability.style.color = 'gray';
                            break;
                    }

                    supplyItem.appendChild(name);
                    supplyItem.appendChild(availability);
                    supplyContainer.appendChild(supplyItem);

                    if (supply.latitude && supply.longitude) {
                        const latLng = [supply.latitude, supply.longitude];
                        const markerIcon = createCustomMarker(supplyType._id);

                        const marker = L.marker(latLng, { icon: markerIcon }).addTo(map);

                        const popupContent = `
                            <div class="popup-content">
                                <b>Store Name:</b> ${supply.name || "No Name Available"}<br>
                                <b>Status:</b> ${supply.supplyStatus}<br>
                                <b>Location:</b> Latitude: ${supply.latitude}, Longitude: ${supply.longitude}<br>
                                <b>Supply Type:</b> ${supplyType._id}
                            </div>
                        `;
                        marker.bindPopup(popupContent);

                        // Save marker reference
                        markerMap[supply.name] = marker;

                        // Add click event to supply item
                        supplyItem.addEventListener('click', () => {
                            map.setView(latLng, 15); // Pan and zoom to marker
                            marker.openPopup(); // Open the popup
                        });
                    }
                });

                suppliesList.appendChild(supplyContainer);
            });

        } else {
            alert('Failed to fetch supplies: ' + (data.error || 'Unknown error.'));
        }
    } catch (err) {
        console.error('Error fetching supplies:', err);
        alert('Error fetching supplies. Please try again.');
    }
}

//Dashboard map markers
function createCustomMarker(status) {
    let iconUrl;

    switch (status) {
        case 'Food':
            iconUrl = 'styles/assets/food_icon.png';  
            break;
        case 'Medical':
            iconUrl = 'styles/assets/medic_icon.png';  
            break;
        case 'Gas':
            iconUrl = 'styles/assets/gas_icon.png';  
            break;
        case 'Water':
            iconUrl = 'styles/assets/water_icon.png';  
            break;
        default:
            iconUrl = 'styles/assets/black.png';  
            break;
    }

    return new L.Icon({
        iconUrl: iconUrl,
        iconSize: [50, 50], 
        iconAnchor: [20, 40],  
        popupAnchor: [0, -40],  // Adjust for the popup positio
    });
}


window.onload = fetchSupplies();