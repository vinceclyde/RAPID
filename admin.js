const apiBaseUrl = 'http://localhost:5000'; 
const rowsPerPage = 6; 
let currentPage = 1;

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
