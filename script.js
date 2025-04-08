document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.getElementById('booking-form');
    const submitButton = document.getElementById('submit-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const confirmationMessage = document.getElementById('confirmation-message');
    const serverMessage = document.getElementById('server-message'); // Get the new message element

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default browser submission

            // Get form data
            const formData = new FormData(bookingForm);
            const data = {
                name: formData.get('name'),
                company: formData.get('company'),
                email: formData.get('email'),
                phone: formData.get('phone'),
            };

            // Hide form, messages and show spinner
            bookingForm.classList.add('hidden');
            confirmationMessage.classList.add('hidden'); // Ensure confirmation is hidden initially
            serverMessage.classList.add('hidden'); // Ensure server message is hidden initially
            serverMessage.textContent = ''; // Clear previous messages
            loadingSpinner.classList.remove('hidden');

            // Wait for 4 seconds
            await new Promise(resolve => setTimeout(resolve, 4000));

            try {
                // Send data to the backend server
                const response = await fetch('/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                // Always hide spinner after response or error
                loadingSpinner.classList.add('hidden');

                if (response.status === 200) {
                    // Success: Show original confirmation message
                    confirmationMessage.classList.remove('hidden');
                } else if (response.status === 409) {
                    // Duplicate Email: Show specific message from server
                    const messageText = await response.text();
                    serverMessage.textContent = messageText;
                    serverMessage.classList.remove('hidden');
                } else {
                    // Other server error
                    console.error('Server error:', response.status, response.statusText);
                    const messageText = await response.text(); // Try to get error text
                    serverMessage.textContent = `Error: ${messageText || response.statusText || 'Could not submit form.'}`;
                    serverMessage.classList.remove('hidden');
                }

            } catch (error) {
                // Network or other fetch error
                console.error('Error submitting form:', error);
                loadingSpinner.classList.add('hidden');
                serverMessage.textContent = 'Network error. Please try again later.';
                serverMessage.classList.remove('hidden');
            }
        });
    } else {
        console.error('Booking form not found!');
    }
});
