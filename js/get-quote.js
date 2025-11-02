let RATES = {
    EXPRESS_GHS_PER_KG: 480,
    NORMAL_USD_PER_KG: 17,
    SEA_USD_PER_CBM: 250,
    USD_TO_GHS: 15.50
};

// --- NEW: Function to fetch live rates ---
async function fetchLiveRates() {
    try {
        console.log("Fetching live USD to GHS rate...");
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        if (data && data.rates && data.rates.GHS) {
            RATES.USD_TO_GHS = parseFloat(data.rates.GHS) * 1.01;
            console.log("Live USD to GHS rate updated to:", RATES.USD_TO_GHS);
        } else {
            throw new Error('Invalid rate data returned');
        }
    } catch (error) {
        console.error("Error fetching live exchange rates:", error);
        console.warn(`Using fallback rate: 1 USD = ${RATES.USD_TO_GHS} GHS`);
    }
}

document.addEventListener('DOMContentLoaded', async () => {


    const calculateBtn = document.getElementById('calculate-shipping-btn');
    if (calculateBtn) {
        calculateBtn.textContent = 'Loading live rates...';
        calculateBtn.disabled = true;
    }

    await fetchLiveRates();

    if (calculateBtn) {
        calculateBtn.textContent = 'Calculate Estimate';
        calculateBtn.disabled = false;
    }

    // --- Shipping Calculator Logic ---
    const airTabBtn = document.querySelector('.calculator-tab-btn[data-target="air-panel"]');
    const seaTabBtn = document.querySelector('.calculator-tab-btn[data-target="sea-panel"]');
    const airPanel = document.getElementById('air-panel');
    const seaPanel = document.getElementById('sea-panel');
    const resultDisplay = document.getElementById('calculator-result-display');
    const estimatedCostSpan = document.getElementById('estimated-cost');
    const estimatedTimeSpan = document.getElementById('estimated-time');

    // Air freight inputs
    const airWeightInput = document.getElementById('air-weight');
    const airShippingMode = document.getElementById('air-shipping-mode');
    const isElectronicCheckbox = document.getElementById('air-is-electronic');

    // Sea freight inputs
    const seaLengthInput = document.getElementById('sea-length');
    const seaWidthInput = document.getElementById('sea-width');
    const seaHeightInput = document.getElementById('sea-height');

    // Tab switching
    airTabBtn?.addEventListener('click', () => {
        airTabBtn.classList.add('active');
        seaTabBtn.classList.remove('active');
        airPanel.classList.add('active');
        seaPanel.classList.remove('active');
        resultDisplay.style.display = 'none';
    });

    seaTabBtn?.addEventListener('click', () => {
        seaTabBtn.classList.add('active');
        airTabBtn.classList.remove('active');
        seaPanel.classList.add('active');
        airPanel.classList.remove('active');
        resultDisplay.style.display = 'none';
    });

    // Logic for "compulsory express"
    isElectronicCheckbox?.addEventListener('change', () => {
        if (isElectronicCheckbox.checked) {
            airShippingMode.value = 'express';
            airShippingMode.disabled = true;
        } else {
            airShippingMode.disabled = false;
        }
    });

    // Calculation logic
    calculateBtn?.addEventListener('click', () => {
        let cost = 0;
        let time = '';
        let finalCostString = '';

        if (airPanel.classList.contains('active')) {
            // --- Air Freight Calculation ---
            const weight = parseFloat(airWeightInput.value) || 0;
            if (weight <= 0) {
                alert('Please enter a valid weight.');
                return;
            }

            const isExpress = airShippingMode.value === 'express' || isElectronicCheckbox.checked;

            if (isExpress) {
                cost = weight * RATES.EXPRESS_GHS_PER_KG;
                time = '3-7 Business Days';
                finalCostString = `₵${cost.toFixed(2)} GHS`;
            } else { // Air Normal
                const costUSD = weight * RATES.NORMAL_USD_PER_KG;
                cost = costUSD * RATES.USD_TO_GHS;
                time = '12-16 Business Days';
                finalCostString = `₵${cost.toFixed(2)} GHS (Approx. $${costUSD.toFixed(2)} USD)`;
            }

        } else {
            // --- Sea Freight Calculation ---
            const length = parseFloat(seaLengthInput.value) || 0;
            const width = parseFloat(seaWidthInput.value) || 0;
            const height = parseFloat(seaHeightInput.value) || 0;

            if (length <= 0 || width <= 0 || height <= 0) {
                alert('Please enter valid dimensions (Length, Width, and Height) in cm.');
                return;
            }

            // Calculate CBM (cubic meters) from cm
            const cbm = (length * width * height) / 1000000;

            const costUSD = cbm * RATES.SEA_USD_PER_CBM;
            cost = costUSD * RATES.USD_TO_GHS;
            time = '35-45 Days';
            // Show CBM in the result
            finalCostString = `₵${cost.toFixed(2)} GHS (Approx. $${costUSD.toFixed(2)} USD for ${cbm.toFixed(4)} CBM)`;
        }

        estimatedCostSpan.textContent = finalCostString;
        estimatedTimeSpan.textContent = time;
        resultDisplay.style.display = 'block';
    });

    // Initialize AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
        });
    }
});