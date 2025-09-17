// js/shipping.js

document.addEventListener('DOMContentLoaded', () => {
    const calculatorForm = document.getElementById('shipping-calculator-form');
    if (!calculatorForm) return; // Only run on the shipping page

    // --- ELEMENTS ---
    const weightInput = document.getElementById('calc-weight');
    const lengthInput = document.getElementById('calc-length');
    const widthInput = document.getElementById('calc-width');
    const heightInput = document.getElementById('calc-height');
    const airFreightResultEl = document.getElementById('air-freight-result');
    const seaFreightResultEl = document.getElementById('sea-freight-result');

    // --- CALCULATION RATES & CONSTANTS ---
    // IMPORTANT: These are business logic values and should be accurate.
    const AIR_FREIGHT_RATE_PER_KG = 150;    // GHS per chargeable kg
    const AIR_VOLUMETRIC_DIVISOR = 6000;    // Standard for air freight (cm^3/kg)
    const SEA_FREIGHT_RATE_PER_CBM = 2500;  // GHS per cubic meter (CBM)
    const CBM_CONVERSION_FACTOR = 1000000;  // cm^3 to m^3

    function calculateShippingCosts() {
        const actualWeight = parseFloat(weightInput.value) || 0;
        const length = parseFloat(lengthInput.value) || 0;
        const width = parseFloat(widthInput.value) || 0;
        const height = parseFloat(heightInput.value) || 0;

        // --- Air Freight Calculation ---
        let airCost = 0;
        if (actualWeight > 0) {
            // Calculate volumetric weight
            const volume = length * width * height;
            const volumetricWeight = volume / AIR_VOLUMETRIC_DIVISOR;

            // Chargeable weight is the GREATER of actual vs. volumetric
            const chargeableWeight = Math.max(actualWeight, volumetricWeight);
            airCost = chargeableWeight * AIR_FREIGHT_RATE_PER_KG;
        }
        airFreightResultEl.textContent = `₵${airCost.toFixed(2)}`;

        // --- Sea Freight Calculation ---
        let seaCost = 0;
        if (length > 0 && width > 0 && height > 0) {
            // Sea freight is calculated by volume (CBM)
            const volumeInCBM = (length * width * height) / CBM_CONVERSION_FACTOR;
            seaCost = volumeInCBM * SEA_FREIGHT_RATE_PER_CBM;
        }
        seaFreightResultEl.textContent = `₵${seaCost.toFixed(2)}`;
    }

    // --- EVENT LISTENERS ---
    const inputs = [weightInput, lengthInput, widthInput, heightInput];
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', calculateShippingCosts);
        }
    });

    // Initial calculation on page load in case of saved form values
    calculateShippingCosts();
});