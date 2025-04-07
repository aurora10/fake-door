document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.getElementById('booking-form');
    const submitButton = document.getElementById('submit-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const confirmationMessage = document.getElementById('confirmation-message');

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

            // Hide form and show spinner
            bookingForm.classList.add('hidden');
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

                if (!response.ok) {
                    // Handle server errors if needed, though for a fake door,
                    // we might just proceed to the confirmation message regardless.
                    console.error('Server error:', response.statusText);
                    // Optionally display a different error message to the user
                }

                // Hide spinner and show confirmation message
                loadingSpinner.classList.add('hidden');
                confirmationMessage.classList.remove('hidden');

            } catch (error) {
                console.error('Error submitting form:', error);
                // Handle network errors etc.
                // Fallback: still show the confirmation message?
                loadingSpinner.classList.add('hidden');
                confirmationMessage.classList.remove('hidden'); // Decide if you want to show this even on error
            }
        });
    } else {
        console.error('Booking form not found!');
    }
});
