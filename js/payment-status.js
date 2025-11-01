// js/payment-status.js

document.addEventListener('DOMContentLoaded', () => {
    const heading = document.getElementById('status-heading');
    const message = document.getElementById('status-message');
    const icon = document.getElementById('status-icon');
    const returnBtn = document.getElementById('return-btn');

    const params = new URLSearchParams(window.location.search);
    const status = params.get('trxref') ? 'success' : 'failure';

    if (status === 'success') {
        heading.textContent = 'Payment Successful!';
        message.textContent = 'Your order has been confirmed. You can track its progress in your dashboard.';
        icon.innerHTML = '<i class="fas fa-check-circle" style="color: #28a745;"></i>';
    } else {
        heading.textContent = 'Payment Failed or Cancelled';
        message.textContent = 'Your order was saved, but the payment was not completed. You can try paying again from your dashboard.';
        icon.innerHTML = '<i class="fas fa-times-circle" style="color: #dc3545;"></i>';
    }

    returnBtn.style.display = 'inline-block';
});