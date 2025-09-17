// js/order.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION & ELEMENTS ---
    const form = document.getElementById('procurement-form');
    if (!form) return; // Only run on the order page

    const cnyPriceInput = document.getElementById('cny-price');
    const quantityInput = document.getElementById('quantity');
    const weightInput = document.getElementById('weight');
    const weightUnitSelect = document.getElementById('weight-unit');

    const exchangeRateDisplay = document.getElementById('exchange-rate');
    const subtotalGhsDisplay = document.getElementById('subtotal-ghs');
    const serviceFeeGhsDisplay = document.getElementById('service-fee-ghs');
    const shippingFeeGhsDisplay = document.getElementById('shipping-fee-ghs');
    const totalGhsDisplay = document.getElementById('total-ghs');
    const depositGhsDisplay = document.getElementById('deposit-ghs');

    // --- REAL-TIME CALCULATION RATES ---
    // IMPORTANT: These should be fetched from a backend in a real application
    const CNY_TO_GHS_RATE = 2.15;
    const SERVICE_FEE_PERCENTAGE = 0.10; // 10%
    const DEPOSIT_PERCENTAGE = 0.70;     // 70%
    const AIR_FREIGHT_RATE_PER_KG = 150; // 150 GHS per kg

    // --- CALCULATION FUNCTION ---
    function calculateCosts() {
        const cnyPrice = parseFloat(cnyPriceInput.value) || 0;
        const quantity = parseInt(quantityInput.value) || 0;
        const weight = parseFloat(weightInput.value) || 0;
        const weightUnit = weightUnitSelect.value;

        // Convert weight to KG
        const weightInKg = weightUnit === 'g' ? weight / 1000 : weight;

        // Calculations
        const itemCostGhs = (cnyPrice * quantity) * CNY_TO_GHS_RATE;
        const serviceFeeGhs = itemCostGhs * SERVICE_FEE_PERCENTAGE;
        const shippingFeeGhs = weightInKg * AIR_FREIGHT_RATE_PER_KG;
        const totalGhs = itemCostGhs + serviceFeeGhs + shippingFeeGhs;
        const depositGhs = totalGhs * DEPOSIT_PERCENTAGE;

        // Update Display
        exchangeRateDisplay.textContent = CNY_TO_GHS_RATE.toFixed(2);
        subtotalGhsDisplay.textContent = `₵${itemCostGhs.toFixed(2)}`;
        serviceFeeGhsDisplay.textContent = `₵${serviceFeeGhs.toFixed(2)}`;
        shippingFeeGhsDisplay.textContent = `₵${shippingFeeGhs.toFixed(2)}`;
        totalGhsDisplay.textContent = `₵${totalGhs.toFixed(2)}`;
        depositGhsDisplay.textContent = `₵${depositGhs.toFixed(2)}`;
    }

    // --- EVENT LISTENERS ---
    const inputs = [cnyPriceInput, quantityInput, weightInput, weightUnitSelect];
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', calculateCosts);
        }
    });
    
    // File upload visual feedback
    const fileInput = document.getElementById('screenshot-upload');
    if(fileInput) {
        fileInput.addEventListener('change', () => {
            const fileLabel = document.querySelector('.file-label span');
            if (fileInput.files.length > 0) {
                fileLabel.textContent = fileInput.files[0].name;
            } else {
                fileLabel.textContent = 'Click to browse or drag & drop';
            }
        });
    }

    // Initial calculation on page load
    calculateCosts();
});