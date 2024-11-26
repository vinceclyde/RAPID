const apiBaseUrl = 'http://localhost:5000'; 
const rowsPerPage = 6; 
let currentPage = 1;

// Function to fetch stores and populate the table
async function fetchStores() {
    try {
        // Make a GET request to the '/get-stores' endpoint
        const response = await fetch('/get-stores', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error('Error fetching stores');
        }

        // Parse the response JSON data
        const stores = await response.json();

        // Populate the table with store data
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = ''; // Clear the table body before adding new rows

        stores.forEach(store => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${store.storeName}</td>
                <td>${store.address}</td>
                <td>${store.supplyType}</td>
                <td>${store.workingHours}</td>
                <td>${store.contactNumber}</td>
                <td>${store.supplyStatus}</td>
                <td><button class="editStatusBtn" data-id="${store._id}">Edit</button></td>
            `;

            // Append the new row to the table
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching stores:', error);
        alert('An error occurred while fetching the stores. Please try again.');
    }
}

// Call the fetchStores function when the page loads
document.addEventListener('DOMContentLoaded', fetchStores);


// Update pagination buttons based on the current page
function updatePagination() {
    const totalPages = Math.ceil(stores.length / rowsPerPage);
    const paginationContainer = document.getElementById("pagination-container");
    paginationContainer.innerHTML = ''; // Clear current pagination

    // Generate previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePage(-1);
    paginationContainer.appendChild(prevButton);

    // Generate page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerHTML = i;
        pageButton.classList.add('page-number');        
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.onclick = () => goToPage(i);S
        paginationContainer.appendChild(pageButton);
    }

    // Generate next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePage(1);
    paginationContainer.appendChild(nextButton);
}

// Handle pagination button click
function changePage(direction) {
    currentPage += direction;
    displayStores();
    updatePagination();
}

// Go to a specific page when clicking on page number
function goToPage(page) {
    currentPage = page;
    displayStores();
    updatePagination();
}
