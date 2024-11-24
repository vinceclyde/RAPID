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
                } else if (file === "admin.html") {
                    fetchStores2(); // Fetch stores for admin page
                    displayStores2(); // Display stores in admin page table
                    document.getElementById("sortby1").addEventListener("change", fetchStores2);
                    document.getElementById("sortby2").addEventListener("change", fetchStores2);
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
        window.open("roads.html", "_blank"); // Opens the page in a new tab
    });
    
    
    document.getElementById("adminDashboard").addEventListener("click", () => {
        loadContent("admin.html");
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
            suggestionsList.style.display = 'none'; // Hide suggestions
            return;
        }

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

        try {
            const response = await fetch(url);
            const suggestions = await response.json();

            suggestionsList.innerHTML = ''; // Clear previous suggestions

            if (suggestions.length > 0) {
                suggestionsList.style.display = 'block'; // Show suggestions if there are any
            } else {
                suggestionsList.style.display = 'none'; // Hide if no suggestions
            }

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
                    suggestionsList.style.display = 'none'; // Hide suggestions list after selection
                });

                suggestionsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            suggestionsList.style.display = 'none'; // Hide suggestions if there's an error
        }
    });
}

function useCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;

            // Reverse geocoding API request
            const apiKey = "AIzaSyBuKitXZZvPXjHXVebv0bVBrEpdj4dFhH8"; // Replace with your API key
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (data.results && data.results[0]) {
                    const address = data.results[0].formatted_address; // Correct property
                    document.getElementById("storeAddress").value = address;

                    // Set map view to current location and add a marker
                    window.map.setView([latitude, longitude], 15);
                    L.marker([latitude, longitude]).addTo(window.map)
                    
                    // Store the selected latitude and longitude
                    selectedLatitude = latitude;
                    selectedLongitude = longitude;
                } else {
                    alert("Unable to fetch address. Please try again.");
                }
            } catch (error) {
                console.error("Error fetching location data:", error);
                alert("An error occurred while retrieving your location.");
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to access location. Please enable location services.");
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}


function useCurrentLocation2() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;

            // Reverse geocoding API request
            const apiKey = "AIzaSyBuKitXZZvPXjHXVebv0bVBrEpdj4dFhH8"; // Replace with your API key
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (data.results && data.results[0]) {
                    const address = data.results[0].formatted_address; // Correct property
                    document.getElementById("roadAddress").value = address;
                } else {
                    alert("Unable to fetch address. Please try again.");
                }
            } catch (error) {
                console.error("Error fetching location data:", error);
                alert("An error occurred while retrieving your location.");
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to access location. Please enable location services.");
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function useCurrentLocation3() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;

            // Reverse geocoding API request
            const apiKey = "AIzaSyBuKitXZZvPXjHXVebv0bVBrEpdj4dFhH8"; // Replace with your API key
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (data.results && data.results[0]) {
                    const address = data.results[0].formatted_address; // Correct property
                    document.getElementById("roadAddress2").value = address;
                } else {
                    alert("Unable to fetch address. Please try again.");
                }
            } catch (error) {
                console.error("Error fetching location data:", error);
                alert("An error occurred while retrieving your location.");
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to access location. Please enable location services.");
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
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

// Store the selected store ID for update purposes
let selectedStoreId = null; 

function toggleButton(isUpdate) {
    const submitButton = document.querySelector(".submitButton");
    if (isUpdate) {
        submitButton.textContent = "UPDATE"; // Change button text to UPDATE
        submitButton.setAttribute("onclick", "updateStore()"); // Attach update function
    } else {
        submitButton.textContent = "REGISTER"; // Change button text to REGISTER
        submitButton.setAttribute("onclick", "registerStore()"); // Attach register function
    }
}

function clearStoreForm() {
    document.getElementById("storeName").value = "";
    document.getElementById("storeAddress").value = "";
    document.getElementById("storeHours").value = "";
    document.getElementById("contactNumber").value = "";


    selectedStoreId = null; // Clear the selected store ID
    toggleButton(false); // Reset button to REGISTER mode
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
    const supplyType = document.querySelector('input[name="supplyType"]:checked')?.value || "";
    const supplyStatus = document.querySelector('input[name="supplyStatus"]:checked')?.value || "";

    if (!storeName || !storeAddress || !storeHours || !contactNumber) {
        alert("Please fill in all the fields.");
        return;
    }

    const store = {
        name: storeName,
        address: storeAddress,
        hours: storeHours,
        contact: contactNumber,
        supplyType,
        supplyStatus,
        latitude: selectedLatitude,
        longitude: selectedLongitude
    };

    try {
        const response = await fetch(`${apiBaseUrl}/register-store`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(store)
        });

        const data = await response.json();
        if (data.message) {
            alert(data.message);

            fetchStores(); // Refresh the store list
            clearStoreForm(); // Reset the form and button to default state
        } else {
            console.error("Error registering store:", data.error || "Unknown error");
        }
    } catch (error) {
        console.error("Error during store registration:", error);
    }
}



window.onload = fetchStores;
document.addEventListener('DOMContentLoaded', function () {
    fetchStores();  // Fetch stores when the page loads
});


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
    const selectedId = document.querySelector('input[name="selectedStore"]:checked')?.value;
    if (!selectedId) {
        alert("Please select a store to edit.");
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/get-store/${selectedId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        const store = await response.json();

        if (store) {
            // Pre-fill form fields
            document.getElementById("storeName").value = store.name;
            document.getElementById("storeAddress").value = store.address;
            document.getElementById("storeHours").value = store.hours;
            document.getElementById("contactNumber").value = store.contact;
            document.querySelector(`input[name="supplyType"][value="${store.supplyType}"]`).checked = true;
            document.querySelector(`input[name="supplyStatus"][value="${store.supplyStatus}"]`).checked = true;

            selectedStoreId = store._id; // Set the selected store ID globally

            // Toggle button to UPDATE mode
            toggleButton(true);
        } else {
            console.error("Store not found.");
        }
    } catch (error) {
        console.error("Error fetching store details:", error);
    }
}

async function updateStore() {
    if (!selectedStoreId) {
        alert("No store selected for update.");
        return;
    }

    // Collect store details
    const storeName = document.getElementById("storeName").value;
    const storeAddress = document.getElementById("storeAddress").value;
    const storeHours = document.getElementById("storeHours").value;
    const contactNumber = document.getElementById("contactNumber").value;
    const supplyType = document.querySelector('input[name="supplyType"]:checked')?.value || "";
    const supplyStatus = document.querySelector('input[name="supplyStatus"]:checked')?.value || "";

    if (!storeName || !storeAddress || !storeHours || !contactNumber) {
        alert("Please fill in all the fields.");
        return;
    }

    const store = {
        name: storeName,
        address: storeAddress,
        hours: storeHours,
        contact: contactNumber,
        supplyType,
        supplyStatus,
        latitude: selectedLatitude,
        longitude: selectedLongitude
    };

    try {
        const response = await fetch(`${apiBaseUrl}/update-store/${selectedStoreId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(store)
        });

        const data = await response.json();
        if (data.message) {
            alert(data.message);
            fetchStores(); // Refresh the store list
            clearStoreForm(); // Reset the form and button
        } else {
            console.error("Error updating store:", data.error || "Unknown error");
        }
    } catch (error) {
        console.error("Error during store update:", error);
    }
}


// Display stores with radio buttons for selection
function displayStores(stores) {
    const storeList = document.getElementById("storeList");
    storeList.innerHTML = ""; // Clear the existing list

    if (stores.length === 0) {
        storeList.innerHTML = "<p>No registered stores available.</p>";
        return;
    }

    // Create table and headers
    const table = document.createElement("table");
    table.classList.add("store-table");

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
        <th>Select</th>
        <th>Store Name</th>
        <th>Address</th>
        <th>Hours</th>
        <th>Contact</th>
        <th>Supply Type</th>
        <th>Supply Status</th>
    `;
    
    table.appendChild(headerRow);

    stores.forEach(store => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><input type="radio" name="selectedStore" value="${store._id}" id="store-${store._id}"></td>
            <td>${store.name}</td>
            <td>${store.address}</td>
            <td>${store.hours}</td>
            <td>${store.contact}</td>
            <td>${store.supplyType}</td>
            <td>${store.supplyStatus}</td>
        `;

        table.appendChild(row);
    });

    storeList.appendChild(table);
}

async function fetchSupplies() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('No token found, please log in again.');
        return;
    }

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
        iconSize: [40, 40], 
        iconAnchor: [20, 40],  
        popupAnchor: [0, -40],  // Adjust for the popup positio
    });
}



function clearClosure() {
    document.getElementById("reporterName").value = "";
    document.getElementById("roadAddress").value = "";
}

async function submitRoadClosure(event) {
    event.preventDefault();

    const reporterName = document.getElementById('reporterName').value;
    const roadAddress = document.getElementById('roadAddress').value;
    const roadReason = document.querySelector('input[name="roadReason"]:checked')?.value;

    if (!reporterName || !roadAddress || !roadReason) {
        alert('Please fill out all fields!');
        return;
    }

    // Ensure you have the token before proceeding
    if (!token) {
        alert("Please log in first.");
        return;
    }

    // Prepare the data to be sent to the server
    const reportData = {
        reporterName,
        roadAddress,
        roadReason
    };

    try {
        const response = await fetch(`${apiBaseUrl}/api/report-road-closure`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });

        const data = await response.json();

        if (data.success) {
            alert('Road closure report submitted successfully!');
            clearClosure();
        } 
    } catch (error) {
        console.error('Error submitting road closure report:', error);
        alert('There was an error submitting your report');
    }
}

const rowsPerPage = 4; 
        let currentPage = 1;
        let filteredStores = [];
        // Fetch stores from the database and display them in the table
        async function fetchStores2() {
            const token = localStorage.getItem('authToken'); 
    try {
        const response = await fetch(`${apiBaseUrl}/get-all-stores`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Add the Bearer token
                'Content-Type': 'application/json'
            }
        });
        const stores = await response.json();
        if (Array.isArray(stores)) {
            // Get selected filter values
            const supplyTypeFilter = document.getElementById("sortby1").value;
            const supplyStatusFilter = document.getElementById("sortby2").value;
            // Filter stores based on selected options
            filteredStores = stores.filter(store => {
                const matchesSupplyType = supplyTypeFilter ? store.supplyType === supplyTypeFilter : true;
                const matchesSupplyStatus = supplyStatusFilter ? store.supplyStatus === supplyStatusFilter : true;
                return matchesSupplyType && matchesSupplyStatus;
            });
            displayStores2();
            updatePagination();
        } else {
            console.error("Invalid response format:", stores);
        }
    } catch (error) {
        console.error("Error fetching stores:", error);
    }
}

        // Display stores in the table
        function displayStores2() {
            const tableBody = document.getElementById("table-body");
            tableBody.innerHTML = ''; // Clear previous rows
            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(currentPage * rowsPerPage, filteredStores.length);
            for (let i = startIndex; i < endIndex; i++) {
                const store = filteredStores[i];
                const row = ` 
                    <tr>
                        <td>${store.name}</td>
                        <td>${store.address}</td>
                        <td>${store.supplyType}</td>
                        <td>${store.hours}</td>
                        <td>${store.contact}</td>
                        <td><span class="supply-status">${store.supplyStatus}</span></td>
                <td><button class="delete-button" onclick="deleteStoreAdmin('${store._id}')">DELETE</button></td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            }
        }
        // Update pagination buttons based on the current page
        function updatePagination() {
    const totalPages = Math.ceil(filteredStores.length / rowsPerPage);
    const paginationContainer = document.getElementById("pagination-container");
    paginationContainer.innerHTML = ''; // Clear current pagination

    // Show previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePage(-1);
    paginationContainer.appendChild(prevButton);

    // Calculate the range of page numbers to display (2 pages at a time)
    let startPage = Math.max(1, currentPage);
    let endPage = Math.min(totalPages, currentPage + 1);

    // Display the page numbers (current and next one)
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerHTML = i;
        pageButton.classList.add('page-number');
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.onclick = () => goToPage(i);
        paginationContainer.appendChild(pageButton);
    }

    // Show next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePage(1);
    paginationContainer.appendChild(nextButton);
}

// Handle pagination button click
function changePage(direction) {
    currentPage += direction;
    displayStores2();
    updatePagination();
}

// Go to a specific page when clicking on a page number
function goToPage(page) {
    currentPage = page;
    displayStores2();
    updatePagination();
}
async function deleteStoreAdmin(storeId) {
    const token = localStorage.getItem('authToken');  // JWT token or empty for admin credentials
    const email = 'admin@email.com';  // Admin email (hardcoded)
    const password = 'rapidrapid';  // Admin password (hardcoded)

    try {
        const response = await fetch(`${apiBaseUrl}/delete-store-admin/${storeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,  // Use token if present
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })  // Send email and password if using hardcoded credentials
        });

        const data = await response.json();
        if (response.ok) {
            alert('Store deleted successfully!');
            fetchStores2();  // Refresh the list after deletion
        } else {
            alert(data.error || 'Failed to delete store');
        }
    } catch (error) {
        console.error('Error deleting store:', error);
        alert('An error occurred while deleting the store.');
    }
}

        

window.onload = fetchSupplies();