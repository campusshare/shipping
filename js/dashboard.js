// js/dashboard.js - (Fully Updated: Fixes stale cache after payment)

import { supabase, getSession, logoutAndRedirect, signOut } from './auth.js';
import AnnouncementSystem from './announcements.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log(">>> dashboard.js loaded and DOMContentLoaded fired!");

    // --- Centralized Configuration Object ---
    const CONFIG = {
        // !!! IMPORTANT: REPLACE THIS WITH YOUR PAYSTACK PUBLIC KEY !!!
        PAYSTACK_PUBLIC_KEY: 'pk_live_fb16c9cf1258bb468e13c84c51234ef9d293d924', // 👈 ADD YOUR KEY HERE
        SERVICE_FEE_PERCENTAGE: 0.6,
        DEFAULT_EXCHANGE_RATE_CNY_GHS: 1.74,
        DEFAULT_EXCHANGE_RATE_USD_GHS: 15.50,
        WHATSAPP_NUMBER: '233241465282', // Your WhatsApp number
        PAYMENT_RATES: { // Rates for the "Pay Supplier" calculator
            tier1: { limit: 999, rate: 1.92 },
            tier2: { limit: 4999, rate: 1.90 },
            tier3: { limit: 9999, rate: 1.88 },
            tier4: { limit: Infinity, rate: 1.87 }
        }
    };

    // --- State Variables ---
    let currentUserId = null;
    let currentCustomerName = 'User';
    let currentCustomerPhone = 'N/A';
    let currentCustomerEmail = 'user@example.com'; // Added to store email for Paystack
    let currentCustomerUniqueId = null;
    let currentExchangeRate = CONFIG.DEFAULT_EXCHANGE_RATE_CNY_GHS;
    let cache = {
        orders: null,
        shipments: null,
        exchangeRates: null,
        incoming_packages: null
    };

    // --- Element Selectors ---
    const sidebarProfileAvatar = document.getElementById('sidebar-profile-avatar');
    const sidebarProfileName = document.getElementById('sidebar-profile-name');
    const sidebarProfileId = document.getElementById('sidebar-profile-id');
    const welcomeUserName = document.getElementById('welcome-user-name');
    const warehouseName = document.getElementById('warehouse-name');
    const warehousePhone = document.getElementById('warehouse-phone');
    const importantUserId = document.getElementById('important-user-id');
    const settingName = document.getElementById('setting-name');
    const settingEmail = document.getElementById('setting-email');
    const settingPhone = document.getElementById('setting-phone');
    const sidebarNavItems = document.querySelectorAll('.sidebar-nav li a');
    const contentPanels = document.querySelectorAll('.content-panel');
    const mobileHeaderTitle = document.getElementById('mobile-header-title');
    const navActionTriggers = document.querySelectorAll('.nav-action-trigger');
    const mobileHamburger = document.getElementById('mobile-hamburger');
    const dashboardSidebar = document.getElementById('dashboard-sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const copyAddressBtn = document.getElementById('copy-address-btn');
    const userWarehouseAddressDiv = document.getElementById('user-warehouse-address');
    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
    const orderModalOverlay = document.getElementById('order-modal-overlay');
    const openOrderModalBtn = document.getElementById('open-order-modal-btn');
    const orderModalCloseBtn = document.getElementById('order-modal-close');
    const orderDetailsModalOverlay = document.getElementById('order-details-modal-overlay');
    const orderDetailsModalCloseBtn = document.getElementById('order-details-modal-close');
    const orderDetailsModalTitle = document.getElementById('order-details-modal-title');
    const detailOrderId = document.getElementById('detail-order-id');
    const detailDatePlaced = document.getElementById('detail-date-placed');
    const detailProductLink = document.getElementById('detail-product-link');
    const detailCnyPrice = document.getElementById('detail-cny-price');
    const detailQuantity = document.getElementById('detail-quantity');
    const detailShippingMode = document.getElementById('detail-shipping-mode');
    const detailNotes = document.getElementById('detail-notes');
    const detailTotalCost = document.getElementById('detail-total-cost');
    const detailOrderStatus = document.getElementById('detail-order-status');
    const detailPaymentStatus = document.getElementById('detail-payment-status');
    const orderDetailsTrackBtn = document.getElementById('order-details-track-btn');
    const orderDetailsContactBtn = document.getElementById('order-details-contact-btn');
    const profileSettingsForm = document.getElementById('profile-settings-form');
    const passwordSettingsForm = document.getElementById('password-settings-form');
    const newLinkOrderForm = document.getElementById('new-link-order-form');
    const orderProductLinkInput = document.getElementById('order-product-link');
    const orderCnyPriceInput = document.getElementById('order-cny-price');
    const orderQuantityInput = document.getElementById('order-quantity');
    const orderShippingModeSelect = document.getElementById('order-shipping-mode');
    const orderNotesTextarea = document.getElementById('order-notes');
    const orderScreenshotUploadInput = document.getElementById('order-screenshot-upload');
    const screenshotPreview = document.getElementById('screenshot-preview');
    const orderModalSubmitBtn = document.getElementById('order-modal-submit-btn');
    const modalExchangeRateSpan = document.getElementById('modal-exchange-rate');
    const modalSubtotalGhsSpan = document.getElementById('modal-subtotal-ghs');
    const modalServiceFeeGhsSpan = document.getElementById('modal-service-fee-ghs');
    const modalTotalGhsSpan = document.getElementById('modal-total-ghs');
    const linkOrdersTable = document.getElementById('link-orders-table');
    const linkOrdersStatusMessage = document.getElementById('link-orders-status-message');
    const ordersInTransitCount = document.getElementById('orders-in-transit-count');
    const readyForPickupCount = document.getElementById('ready-for-pickup-count');
    const activeShipmentsList = document.getElementById('active-shipments-list');
    const shipmentsStatusMessage = document.getElementById('shipments-status-message');

    // Pay Supplier Calculator Selectors
    const paySupplierCnyInput = document.getElementById('cny-amount');
    const paySupplierRateDisplay = document.getElementById('current-rate');
    const paySupplierGhsDisplay = document.getElementById('ghs-total');
    const paySupplierButton = document.getElementById('pay-supplier-btn');
    const paySupplierForm = document.getElementById('payment-calculator-form');
    const pricingListContainer = document.getElementById('pricing-list-container');

    // Register Package Selectors
    const registerPackageForm = document.getElementById('register-package-form');
    const registerPackageBtn = document.getElementById('register-package-btn');
    const registerPackageMessage = document.getElementById('register-package-message');
    const incomingPackagesTable = document.getElementById('incoming-packages-table');
    const incomingPackagesStatusMessage = document.getElementById('incoming-packages-status-message');

    // My Shipments Table Selectors
    const shipmentsTable = document.getElementById('my-shipments-table');
    const myShipmentsStatusMessage = document.getElementById('my-shipments-status-message');


    // --- Helper Functions ---
    const generateShortId = (uuid) => { if (!uuid) return 'XXXX'; return 'SSW-' + Math.abs(Array.from(uuid).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0) % 10000); };
    const formatCurrency = (amount) => `₵${parseFloat(amount || 0).toFixed(2)}`;
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const closeModal = (modal) => { if (modal) { modal.classList.remove('active'); } };
    const getStatusBadgeClass = (status) => {
        const mappings = {
            'new': 'status-processing',
            'processing': 'status-processing',
            'awaiting_payment': 'status-processing',
            'paid': 'status-delivered', // <-- Added
            'in-transit': 'status-transit',
            'clearing_customs': 'status-transit',
            'ready_for_pickup': 'status-delivered',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled',
            'awaiting_arrival': 'status-processing',
            'in_warehouse': 'status-transit'
        };
        return mappings[status] || 'status-badge';
    };

    // --- Fetch Live Exchange Rates ---
    const fetchExchangeRates = async () => {
        if (cache.exchangeRates) {
            currentExchangeRate = cache.exchangeRates.CNY_GHS;
            return cache.exchangeRates;
        }

        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY');
            const data = await response.json();

            if (data && data.rates && data.rates.GHS) {
                const rates = {
                    CNY_GHS: data.rates.GHS,
                    USD_GHS: data.rates.GHS / data.rates.USD,
                    timestamp: new Date().toISOString()
                };
                cache.exchangeRates = rates;
                currentExchangeRate = rates.CNY_GHS;
                console.log("Live exchange rates fetched:", rates);
                return rates;
            } else {
                throw new Error('Invalid rate data');
            }
        } catch (error) {
            console.error("Error fetching exchange rates, using defaults:", error);
            currentExchangeRate = CONFIG.DEFAULT_EXCHANGE_RATE_CNY_GHS;
            return {
                CNY_GHS: CONFIG.DEFAULT_EXCHANGE_RATE_CNY_GHS,
                USD_GHS: CONFIG.DEFAULT_EXCHANGE_RATE_USD_GHS,
                timestamp: new Date().toISOString()
            };
        }
    };

    // --- Image Preview Handler ---
    if (orderScreenshotUploadInput && screenshotPreview) {
        orderScreenshotUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    screenshotPreview.src = event.target.result;
                    screenshotPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                screenshotPreview.style.display = 'none';
            }
        });
    }

    // --- Cost Calculation Logic (for Link Orders) ---
    const calculateOrderCosts = () => {
        if (!orderCnyPriceInput || !orderQuantityInput || !modalExchangeRateSpan || !modalSubtotalGhsSpan || !modalServiceFeeGhsSpan || !modalTotalGhsSpan) {
            return;
        }

        const cnyPrice = parseFloat(orderCnyPriceInput.value) || 0;
        const quantity = parseInt(orderQuantityInput.value) || 0;
        const itemCostGhs = (cnyPrice * quantity) * currentExchangeRate;
        const serviceFeeGhs = itemCostGhs * CONFIG.SERVICE_FEE_PERCENTAGE;
        const totalEstimatedCostGhs = itemCostGhs + serviceFeeGhs;

        modalExchangeRateSpan.textContent = currentExchangeRate.toFixed(2);
        modalSubtotalGhsSpan.textContent = formatCurrency(itemCostGhs);
        modalServiceFeeGhsSpan.textContent = formatCurrency(serviceFeeGhs);
        modalTotalGhsSpan.textContent = formatCurrency(totalEstimatedCostGhs);
    };


    // --- Pay Supplier Calculator Logic ---
    const getSupplierPaymentRate = (amount) => {
        if (amount >= 10000) return CONFIG.PAYMENT_RATES.tier4.rate;
        if (amount >= 5000) return CONFIG.PAYMENT_RATES.tier3.rate;
        if (amount >= 1000) return CONFIG.PAYMENT_RATES.tier2.rate;
        if (amount >= 1) return CONFIG.PAYMENT_RATES.tier1.rate;
        return CONFIG.PAYMENT_RATES.tier1.rate; // Default for 0 or less
    };

    const populatePricingTable = () => {
        if (!pricingListContainer) return;
        pricingListContainer.innerHTML = `
            <li><span>¥1 – ¥${CONFIG.PAYMENT_RATES.tier1.limit}</span><strong data-rate="${CONFIG.PAYMENT_RATES.tier1.rate}">₵${CONFIG.PAYMENT_RATES.tier1.rate.toFixed(2)} / ¥</strong></li>
            <li><span>¥${CONFIG.PAYMENT_RATES.tier1.limit + 1} – ¥${CONFIG.PAYMENT_RATES.tier2.limit}</span><strong data-rate="${CONFIG.PAYMENT_RATES.tier2.rate}">₵${CONFIG.PAYMENT_RATES.tier2.rate.toFixed(2)} / ¥</strong></li>
            <li><span>¥${CONFIG.PAYMENT_RATES.tier2.limit + 1} – ¥${CONFIG.PAYMENT_RATES.tier3.limit}</span><strong data-rate="${CONFIG.PAYMENT_RATES.tier3.rate}">₵${CONFIG.PAYMENT_RATES.tier3.rate.toFixed(2)} / ¥</strong></li>
            <li><span>¥${CONFIG.PAYMENT_RATES.tier3.limit + 1}+</span><strong data-rate="${CONFIG.PAYMENT_RATES.tier4.rate}">₵${CONFIG.PAYMENT_RATES.tier4.rate.toFixed(2)} / ¥</strong></li>
        `;
    };

    const calculateSupplierPayment = () => {
        if (!paySupplierCnyInput || !paySupplierRateDisplay || !paySupplierGhsDisplay || !paySupplierButton) return;

        const cnyAmount = parseFloat(paySupplierCnyInput.value) || 0;

        if (cnyAmount <= 0) {
            paySupplierRateDisplay.value = '₵ 0.00 / ¥';
            paySupplierGhsDisplay.textContent = '₵0.00';
            paySupplierButton.disabled = true;
            if (pricingListContainer) pricingListContainer.querySelectorAll('li').forEach(li => li.classList.remove('active-rate'));
            return;
        }

        const currentRate = getSupplierPaymentRate(cnyAmount);
        const ghsTotal = cnyAmount * currentRate;

        paySupplierRateDisplay.value = `₵ ${currentRate.toFixed(2)} / ¥`;
        paySupplierGhsDisplay.textContent = formatCurrency(ghsTotal);
        paySupplierButton.disabled = false;

        if (pricingListContainer) {
            pricingListContainer.querySelectorAll('li').forEach(li => {
                const itemRate = parseFloat(li.querySelector('strong').dataset.rate);
                li.classList.toggle('active-rate', itemRate === currentRate);
            });
        }
    };
    // --- End of Pay Supplier Logic ---


    // --- Content Panel Navigation (FIXED) ---
    const showContentPanel = (targetId) => {
        contentPanels.forEach(panel => panel.classList.toggle('active', panel.id === targetId));
        sidebarNavItems.forEach(item => {
            const isActive = item.getAttribute('data-target') === targetId;
            item.classList.toggle('active', isActive);
            if (isActive && mobileHeaderTitle) mobileHeaderTitle.textContent = item.querySelector('span').textContent;
        });
        if (document.body.classList.contains('sidebar-open')) {
            if (dashboardSidebar) dashboardSidebar.classList.remove('sidebar-open');
            document.body.classList.remove('sidebar-open');
        }
        window.history.pushState(null, '', `#${targetId}`);

        // Refresh data based on the panel
        if (targetId === 'link-orders-view') {
            fetchAndDisplayOrders();
        } else if (targetId === 'dashboard-view') {
            fetchDashboardOverviewData();
        } else if (targetId === 'my-shipments-view') {
            fetchAndDisplayShipments();
        } else if (targetId === 'warehouse-address-view') {
            fetchAndDisplayIncomingPackages();
        } else if (targetId === 'pay-supplier-view') {
            calculateSupplierPayment(); // Initialize calculator when view is shown
        }
    };

    // --- Fetch & Display User Information (FIXED) ---
    const fetchAndDisplayUserInfo = async () => {
        const session = await getSession();
        if (!session) {
            console.log("No session found, user should be redirected by auth-guard.");
            return; // Guard should handle redirect
        }
        currentUserId = session.user.id;

        const [customerResponse, settingsResponse] = await Promise.all([
            supabase.from('customers').select('name, email, phone, customer_unique_id').eq('id', currentUserId).single(),
            supabase.from('settings').select('public_phone, warehouse_address').eq('id', 1).single() // Fetch warehouse address too
        ]);

        const { data: customer, error: customerError } = customerResponse;
        const { data: settings, error: settingsError } = settingsResponse;

        // --- START OF FIX ---
        if (customerError) {
            console.error("Error fetching customer data:", customerError);
            alert('Error loading your profile data. Please try logging in again.');
            await logoutAndRedirect('login.html');
            return;
        }

        if (settingsError) {
            console.error("Error fetching settings data:", settingsError);
            alert('Error loading platform settings. Please contact support.');
            // Don't log out, but vital info will be missing
        }

        if (!customer) {
            // This is the critical check. User is authenticated but has no profile.
            console.error("CRITICAL: Auth user exists but no customer profile found for ID:", currentUserId);
            alert('Your user profile is not set up correctly. This can happen if your registration was incomplete. Please contact support.');
            await logoutAndRedirect('login.html');
            return;
        }
        // --- END OF FIX ---

        if (customer && settings) {
            currentCustomerName = customer.name || 'User';
            currentCustomerPhone = customer.phone || 'N/A';
            currentCustomerEmail = customer.email; // Store email
            const displayId = customer.customer_unique_id || generateShortId(currentUserId);
            currentCustomerUniqueId = customer.customer_unique_id;

            if (sidebarProfileAvatar) sidebarProfileAvatar.textContent = currentCustomerName.charAt(0).toUpperCase();
            if (sidebarProfileName) sidebarProfileName.textContent = currentCustomerName;
            if (sidebarProfileId) sidebarProfileId.textContent = `ID: ${displayId}`;
            if (welcomeUserName) welcomeUserName.textContent = currentCustomerName;

            // Populate Warehouse Address
            if (userWarehouseAddressDiv) {
                userWarehouseAddressDiv.innerHTML = `
                    <p><strong>Name:</strong> <span id="warehouse-name">${currentCustomerName} [${displayId}]</span></p>
                    ${settings.warehouse_address ? settings.warehouse_address.replace(/\n/g, '<br>') : '<p>Address not set. Contact admin.</p>'}
                    <p><strong>Phone:</strong> <span id="warehouse-phone">${settings.public_phone || 'Contact Support'}</span></p>
                `;
            }
            if (importantUserId) importantUserId.textContent = `[${displayId}]`;

            // Populate Settings Form
            if (settingName) settingName.value = currentCustomerName;
            if (settingEmail) settingEmail.value = customer.email;
            if (settingPhone) settingPhone.value = currentCustomerPhone;
        }

        // Initialize Announcement System
        try {
            const announcementSystem = new AnnouncementSystem();
            await announcementSystem.init(currentUserId);

            // Optional: Check for new announcements every 5 minutes
            setInterval(async () => {
                await announcementSystem.checkForNew();
            }, 5 * 60 * 1000);
        } catch (annError) {
            console.error("Failed to initialize AnnouncementSystem:", annError);
        }
    };

    // --- Data Display Functions ---
    const displayDashboardOverview = (data) => {
        const { transitCount, pickupCount, shipments } = data;
        if (ordersInTransitCount) ordersInTransitCount.textContent = transitCount || 0;
        if (readyForPickupCount) readyForPickupCount.textContent = pickupCount || 0;
        if (activeShipmentsList) activeShipmentsList.innerHTML = '';
        if (shipmentsStatusMessage) shipmentsStatusMessage.style.display = 'none';

        if (shipments && shipments.length > 0) {
            shipments.forEach(shipment => {
                const shipmentId = `#TR-${shipment.id.toString().slice(-6)}`;
                const statusText = (shipment.status || 'unknown').replace(/_/g, ' ');
                const etaDays = shipment.eta_days ? `~${shipment.eta_days} Days Left` : 'ETA pending';
                const imageUrl = shipment.image_url || 'https://placehold.co/100x100/CCCCCC/FFFFFF?text=Package';
                const shipmentItem = document.createElement('div');
                shipmentItem.classList.add('shipment-item-detailed');
                shipmentItem.innerHTML = `<img src="${imageUrl}" alt="Shipment item" class="shipment-image"><div class="shipment-info"><strong>${shipment.items_description || 'Various Items'}</strong><div class="status">Tracking: ${shipment.tracking_number || shipmentId}</div></div><div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width: ${shipment.progress_percentage || 50}%;"></div></div><span>${statusText}</span></div><div class="eta">${etaDays}</div>`;
                if (activeShipmentsList) activeShipmentsList.appendChild(shipmentItem);
            });
        } else if (shipmentsStatusMessage) {
            shipmentsStatusMessage.textContent = 'No active shipments found.';
            shipmentsStatusMessage.style.display = 'block';
        }
    };

    // --- MODIFIED: displayOrders (with Delete Button) ---
    const displayOrders = (orders) => {
        if (!linkOrdersTable) return;

        // Keep header, clear only rows
        const oldRows = linkOrdersTable.querySelectorAll('.table-row');
        oldRows.forEach(row => row.remove());

        if (linkOrdersStatusMessage) linkOrdersStatusMessage.style.display = 'none';

        if (orders && orders.length > 0) {
            // Ensure header exists if table was cleared
            if (!linkOrdersTable.querySelector('.table-header')) {
                const isMobile = window.innerWidth <= 992;
                const tableHeaderHtml = `<div class="table-header"><div>Order ID</div>${!isMobile ? '<div class="desktop-col">Product</div><div class="desktop-col">Date</div>' : ''}<div>Status</div>${!isMobile ? '<div class="desktop-col text-right">Total</div>' : ''}<div style="text-align: right;">Actions</div></div>`;
                linkOrdersTable.innerHTML = tableHeaderHtml;
            }

            orders.forEach(order => {
                const orderId = `#LO-${order.id.toString().slice(-4)}`;
                let product = 'Link Order';
                try {
                    if (order.product_link) {
                        product = `${new URL(order.product_link).hostname.replace('www.', '').split('.')[0]} product`;
                    }
                } catch (e) { /* ignore invalid URL */ }

                const isMobile = window.innerWidth <= 992;
                const canDelete = ['new', 'awaiting_payment', 'cancelled'].includes(order.order_status);
                const deleteButtonHtml = canDelete
                    ? `<button class="btn-icon btn-danger delete-order-btn" data-order-id="${order.id}" title="Delete Order"><i class="fas fa-trash"></i></button>`
                    : '';

                // --- NEW: Add "Pay Now" button if awaiting_payment ---
                const payButtonHtml = (order.payment_status === 'awaiting_payment')
                    ? `<button class="btn btn-primary btn-sm pay-now-btn" data-order-id="${order.id}" data-amount="${order.total}" data-reference="C2G-ORDER-${order.id}" title="Pay Now">Pay Now</button>`
                    : '';

                const row = document.createElement('div');
                row.classList.add('table-row');
                row.dataset.order = JSON.stringify(order);
                row.innerHTML = `
                    <div>${orderId}</div>
                    ${!isMobile ? `<div class="desktop-col">${product}</div>` : ''}
                    ${!isMobile ? `<div class="desktop-col">${formatDate(order.created_at)}</div>` : ''}
                    <div><span class="status-badge ${getStatusBadgeClass(order.payment_status === 'paid' ? 'paid' : order.order_status)}">${(order.payment_status === 'paid' ? 'Paid' : order.order_status).replace(/_/g, ' ')}</span></div>
                    ${!isMobile ? `<div class="desktop-col text-right">${formatCurrency(order.total)}</div>` : ''}
                    <div class="table-actions">
                        ${payButtonHtml}
                        <button class="btn-icon view-details-btn" data-order-id="${order.id}" title="View Details"><i class="fas fa-ellipsis-h"></i></button>
                        ${deleteButtonHtml}
                    </div>
                `;
                linkOrdersTable.appendChild(row);
            });
        } else if (linkOrdersStatusMessage) {
            if (!linkOrdersTable.querySelector('.table-header')) {
                const isMobile = window.innerWidth <= 992;
                const tableHeaderHtml = `<div class="table-header"><div>Order ID</div>${!isMobile ? '<div class="desktop-col">Product</div><div class="desktop-col">Date</div>' : ''}<div>Status</div>${!isMobile ? '<div class="desktop-col text-right">Total</div>' : ''}<div style="text-align: right;">Actions</div></div>`;
                linkOrdersTable.innerHTML = tableHeaderHtml;
            }
            linkOrdersStatusMessage.textContent = 'You have no link orders yet. Click "New Order".';
            linkOrdersStatusMessage.style.display = 'block';
        }
    };

    // --- Fetch Dashboard Overview Data ---
    const fetchDashboardOverviewData = async (forceRefresh = false) => {
        if (cache.dashboardOverview && !forceRefresh && cache.dashboardOverview.timestamp > (Date.now() - 60000)) { // Cache for 1 min
            displayDashboardOverview(cache.dashboardOverview.data);
            return;
        }
        if (!currentUserId) return;

        const [transitResponse, pickupResponse, shipmentsResponse] = await Promise.all([
            supabase.from('orders').select('id', { count: 'exact' }).eq('customer_id', currentUserId).in('order_status', ['in-transit', 'clearing_customs']),
            supabase.from('orders').select('id', { count: 'exact' }).eq('customer_id', currentUserId).eq('order_status', 'ready_for_pickup'),
            supabase.from('shipments').select('*').eq('customer_id', currentUserId).in('status', ['in-transit', 'clearing_customs', 'ready_for_pickup']).order('created_at', { ascending: false })
        ]);

        const overviewData = { transitCount: transitResponse.count, pickupCount: pickupResponse.count, shipments: shipmentsResponse.data };
        cache.dashboardOverview = { data: overviewData, timestamp: Date.now() };
        displayDashboardOverview(overviewData);
    };

    // --- Fetch and Display Orders ---
    const fetchAndDisplayOrders = async (forceRefresh = false) => {
        console.log("FETCHING ORDERS FOR USER ID:", currentUserId);
        if (cache.orders && !forceRefresh) {
            displayOrders(cache.orders);
            return;
        }
        if (!currentUserId) return;
        if (linkOrdersStatusMessage) { linkOrdersStatusMessage.textContent = 'Loading...'; linkOrdersStatusMessage.style.display = 'block'; }

        const { data: orders, error } = await supabase.from('orders').select('*').eq('customer_id', currentUserId).order('created_at', { ascending: false });
        if (error) { console.error("Error fetching orders:", error); if (linkOrdersStatusMessage) linkOrdersStatusMessage.textContent = "Failed to load orders."; return; }

        cache.orders = orders;
        displayOrders(orders);
    };

    // --- Fetch and Display Shipments ---
    const fetchAndDisplayShipments = async (forceRefresh = false) => {
        console.log("FETCHING SHIPMENTS FOR USER ID:", currentUserId);

        if (!shipmentsTable || !myShipmentsStatusMessage) return;

        if (cache.shipments && !forceRefresh) {
            console.log("Displaying shipments from cache.");
            displayShipments(cache.shipments);
            return;
        }

        if (!currentUserId) {
            myShipmentsStatusMessage.textContent = 'Could not verify user.';
            myShipmentsStatusMessage.style.display = 'block';
            return;
        }

        myShipmentsStatusMessage.textContent = 'Loading your shipments...';
        myShipmentsStatusMessage.style.display = 'block';

        // Clear only rows, keep header
        const oldRows = shipmentsTable.querySelectorAll('.table-row');
        oldRows.forEach(row => row.remove());


        const { data: shipments, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('customer_id', currentUserId)
            .not.in('status', ['awaiting_arrival', 'in_warehouse', 'pending'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching shipments:", error);
            myShipmentsStatusMessage.textContent = 'Failed to load your shipments. Please try again.';
            return;
        }

        cache.shipments = shipments;
        displayShipments(shipments);
    };

    const displayShipments = (shipments) => {
        if (!shipmentsTable || !myShipmentsStatusMessage) return;

        myShipmentsStatusMessage.style.display = 'none';

        // Clear only rows
        const oldRows = shipmentsTable.querySelectorAll('.table-row');
        oldRows.forEach(row => row.remove());

        // Ensure header is present
        if (!shipmentsTable.querySelector('.table-header')) {
            const isMobile = window.innerWidth <= 992;
            const tableHeaderHtml = `
                <div class="table-header">
                    <div>Tracking #</div>
                    ${!isMobile ? '<div class="desktop-col">Description</div>' : ''}
                    ${!isMobile ? '<div class="desktop-col">Method</div>' : ''}
                    <div>Status</div>
                    ${!isMobile ? '<div class="desktop-col text-right">Weight</div>' : ''}
                    <div>Details</div>
                </div>
            `;
            shipmentsTable.innerHTML = tableHeaderHtml;
        }


        if (shipments && shipments.length > 0) {
            const isMobile = window.innerWidth <= 992;
            const rowsHtml = shipments.map(shipment => {
                const description = shipment.items_description || 'N/A';
                const method = shipment.method ? shipment.method.charAt(0).toUpperCase() + shipment.method.slice(1) : 'N/A';
                const status = (shipment.status || 'unknown').replace(/_/g, ' ');
                const weight = shipment.total_weight_kg ? `${shipment.total_weight_kg.toFixed(2)} kg` : 'N/A';

                return `
                    <div class="table-row">
                        <div><strong>${shipment.tracking_number}</strong></div>
                        ${!isMobile ? `<div class="desktop-col">${description}</div>` : ''}
                        ${!isMobile ? `<div class="desktop-col">${method}</div>` : ''}
                        <div><span class="${getStatusBadgeClass(shipment.status)}">${status}</span></div>
                        ${!isMobile ? `<div class="desktop-col text-right">${weight}</div>` : ''}
                        <div class="table-actions">
                           <button class="btn-icon view-shipment-details-btn" data-shipment-id="${shipment.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                           </button>
                        </div>
                    </div>
                `;
            }).join('');

            shipmentsTable.insertAdjacentHTML('beforeend', rowsHtml);
        } else {
            myShipmentsStatusMessage.textContent = 'You have no active shipments yet.';
            myShipmentsStatusMessage.style.display = 'block';
        }
    };

    // --- Fetch and Display Incoming Packages ---
    const fetchAndDisplayIncomingPackages = async (forceRefresh = false) => {
        console.log("FETCHING INCOMING PACKAGES FOR USER ID:", currentUserId);
        if (!incomingPackagesTable || !incomingPackagesStatusMessage) return;

        if (cache.incoming_packages && !forceRefresh) {
            console.log("Displaying incoming packages from cache.");
            displayIncomingPackages(cache.incoming_packages);
            return;
        }

        if (!currentUserId) {
            incomingPackagesStatusMessage.textContent = 'Could not verify user.';
            incomingPackagesStatusMessage.style.display = 'block';
            return;
        }

        incomingPackagesStatusMessage.textContent = 'Loading your packages...';
        incomingPackagesStatusMessage.style.display = 'block';

        // Clear only rows, keep header
        const oldRows = incomingPackagesTable.querySelectorAll('.table-row');
        oldRows.forEach(row => row.remove());
        if (!incomingPackagesTable.querySelector('.table-header')) {
            const isMobile = window.innerWidth <= 992;
            incomingPackagesTable.innerHTML = `<div class="table-header"><div>Tracking #</div>${!isMobile ? '<div class="desktop-col">Description</div>' : ''}${!isMobile ? '<div class="desktop-col">Date Registered</div>' : ''}<div>Status</div></div>`;
        }

        const { data: packages, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('customer_id', currentUserId)
            .in('status', ['awaiting_arrival', 'in_warehouse']) // Only show packages not yet shipped
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching incoming packages:", error);
            incomingPackagesStatusMessage.textContent = 'Failed to load your packages. Please try again.';
            return;
        }

        cache.incoming_packages = packages;
        displayIncomingPackages(packages);
    };

    // --- Display Incoming Packages ---
    const displayIncomingPackages = (packages) => {
        if (!incomingPackagesTable || !incomingPackagesStatusMessage) return;

        // Clear only the rows, not the header
        const rows = incomingPackagesTable.querySelectorAll('.table-row');
        rows.forEach(row => row.remove());

        const isMobile = window.innerWidth <= 992;
        if (!incomingPackagesTable.querySelector('.table-header')) {
            incomingPackagesTable.innerHTML = `<div class="table-header"><div>Tracking #</div>${!isMobile ? '<div class="desktop-col">Description</div>' : ''}${!isMobile ? '<div class="desktop-col">Date Registered</div>' : ''}<div>Status</div></div>`;
        }


        if (packages && packages.length > 0) {
            incomingPackagesStatusMessage.style.display = 'none';
            const rowsHtml = packages.map(pkg => {
                const tracking = pkg.tracking_number || 'N/A';
                const description = pkg.items_description || 'N/A';
                const date = formatDate(pkg.created_at);
                const status = (pkg.status || 'unknown').replace(/_/g, ' ');

                return `
                    <div class="table-row">
                        <div><strong>${tracking}</strong></div>
                        ${!isMobile ? `<div class="desktop-col">${description}</div>` : ''}
                        ${!isMobile ? `<div class="desktop-col">${date}</div>` : ''}
                        <div><span class="${getStatusBadgeClass(pkg.status)}">${status}</span></div>
                    </div>
                `;
            }).join('');

            incomingPackagesTable.insertAdjacentHTML('beforeend', rowsHtml);
        } else {
            incomingPackagesStatusMessage.textContent = 'You have not registered any incoming packages yet.';
            incomingPackagesStatusMessage.style.display = 'block';
        }
    };


    // --- Shipment Details Modal ---
    const openShipmentDetailsModal = async (shipmentId) => {
        console.log("Opening shipment details for:", shipmentId);

        // Try cache first (from 'My Shipments' or 'Incoming Packages')
        let shipment = cache.shipments?.find(s => s.id == shipmentId) || cache.incoming_packages?.find(s => s.id == shipmentId);

        if (!shipment) {
            try {
                const { data, error } = await supabase
                    .from('shipments')
                    .select('*')
                    .eq('id', shipmentId)
                    .single();

                if (error || !data) {
                    throw error || new Error('Shipment not found');
                }
                shipment = data;
            } catch (error) {
                alert('Could not load shipment details. ' + error.message);
                return;
            }
        }

        const shipmentDetailsModalOverlay = document.getElementById('shipment-details-modal-overlay');
        const shipmentDetailsModalTitle = document.getElementById('shipment-details-modal-title');
        const shipmentDetailTrackingNum = document.getElementById('shipment-detail-tracking-num');
        const shipmentDetailStatus = document.getElementById('shipment-detail-status');
        const shipmentDetailLocation = document.getElementById('shipment-detail-location');
        const shipmentDetailEta = document.getElementById('shipment-detail-eta');
        const shipmentDetailMethod = document.getElementById('shipment-detail-method');
        const shipmentDetailWeight = document.getElementById('shipment-detail-weight');
        const shipmentDetailDescription = document.getElementById('shipment-detail-description');
        const shipmentDetailOrders = document.getElementById('shipment-detail-orders');

        if (shipmentDetailsModalTitle) {
            shipmentDetailsModalTitle.textContent = `Shipment Details: ${shipment.tracking_number || 'N/A'}`;
        }
        if (shipmentDetailTrackingNum) {
            shipmentDetailTrackingNum.textContent = shipment.tracking_number || 'N/A';
        }
        if (shipmentDetailStatus) {
            shipmentDetailStatus.textContent = (shipment.status || 'unknown').replace(/_/g, ' ');
            shipmentDetailStatus.className = `status-badge ${getStatusBadgeClass(shipment.status)}`; // Apply badge style
        }
        if (shipmentDetailLocation) {
            shipmentDetailLocation.textContent = shipment.current_location || 'N/A';
        }
        if (shipmentDetailEta) {
            const eta = shipment.eta_days ? `${shipment.eta_days} days` : 'TBD';
            shipmentDetailEta.textContent = eta;
        }
        if (shipmentDetailMethod) {
            const method = shipment.method ? shipment.method.charAt(0).toUpperCase() + shipment.method.slice(1) : 'N/A';
            shipmentDetailMethod.textContent = method;
        }
        if (shipmentDetailWeight) {
            const weight = shipment.total_weight_kg ? `${shipment.total_weight_kg.toFixed(2)} kg` : 'N/A';
            shipmentDetailWeight.textContent = weight;
        }
        if (shipmentDetailDescription) {
            shipmentDetailDescription.textContent = shipment.items_description || 'N/A';
        }
        if (shipmentDetailOrders) {
            // This field name is wrong in your DB, but we'll leave the element ID for now
            shipmentDetailOrders.textContent = shipment.associated_orders || 'N/A';
        }

        const imageContainer = document.getElementById('shipment-detail-image-container');
        if (shipment.image_url && imageContainer) {
            imageContainer.innerHTML = `
                <a href="${shipment.image_url}" id="shipment-detail-image-link" target="_blank">
                    <img src="${shipment.image_url}" alt="Package Image" class="order-screenshot-preview">
                </a>
            `;
        } else if (imageContainer) {
            imageContainer.innerHTML = '<span id="shipment-detail-image-none" class="text-muted">No Image Provided</span>';
        }

        if (shipmentDetailsModalOverlay) {
            shipmentDetailsModalOverlay.classList.add('active');
        }
    };

    // --- Order Details Modal ---
    const openOrderDetailsModal = (orderData) => {
        if (!orderDetailsModalOverlay) return; // Safety check

        orderDetailsModalTitle.textContent = `Order Details: #LO-${orderData.id.toString().slice(-4)}`;
        detailOrderId.textContent = `#LO-${orderData.id.toString().slice(-4)}`;
        detailDatePlaced.textContent = formatDate(orderData.created_at);

        try {
            detailProductLink.href = orderData.product_link;
            detailProductLink.textContent = orderData.product_link ? new URL(orderData.product_link).hostname.replace('www.', '').split('.')[0] : 'View Product';
            detailProductLink.style.display = orderData.product_link ? 'inline-block' : 'none';
        } catch (e) {
            detailProductLink.href = orderData.product_link || '#';
            detailProductLink.textContent = 'View Link';
            detailProductLink.style.display = 'inline-block';
        }

        detailCnyPrice.textContent = `¥${(orderData.cny_price || 0).toFixed(2)}`;
        detailQuantity.textContent = orderData.quantity;

        if (detailShippingMode) {
            const modeLabels = {
                'air_express': 'Air Express (3 days)',
                'air_normal': 'Air Normal (12 days)',
                'sea': 'Sea Freight (35-40 days)'
            };
            detailShippingMode.textContent = modeLabels[orderData.shipping_mode] || orderData.shipping_mode || 'N/A';
        }

        detailNotes.textContent = orderData.notes || 'No notes provided.';
        detailTotalCost.textContent = formatCurrency(orderData.total);
        detailOrderStatus.textContent = (orderData.order_status || 'unknown').replace(/_/g, ' ');
        detailPaymentStatus.textContent = (orderData.payment_status || 'unknown').replace(/_/g, ' ');

        const screenshotContainer = document.getElementById('detail-screenshot-container');
        if (orderData.screenshot_url) {
            if (screenshotContainer) {
                screenshotContainer.innerHTML = `
                    <a href="${orderData.screenshot_url}" target="_blank">
                        <img src="${orderData.screenshot_url}" alt="Order Screenshot" class="order-screenshot-preview">
                    </a>
                `;
            }
        } else {
            if (screenshotContainer) screenshotContainer.innerHTML = '<p class="text-muted" style="font-size: 0.9rem; text-align: right;">No screenshot uploaded</p>';
        }

        orderDetailsModalOverlay.classList.add('active');
    };

    // --- Handle Order Deletion ---
    const handleDeleteOrder = async (orderId) => {
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
            return;
        }

        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);

        if (error) {
            console.error('Error deleting order:', error);
            alert('Failed to delete order: ' + error.message);
        } else {
            alert('Order deleted successfully.');
            cache.orders = null; // Invalidate cache
            fetchAndDisplayOrders(true); // Force refresh
            fetchDashboardOverviewData(true); // Force refresh dashboard stats
        }
    };

    // --- NEW: Handle "Pay Now" for existing orders ---
    const handlePayNow = (orderId, amount, reference) => {
        console.log(`Pay Now clicked for Order ID: ${orderId}, Amount: ${amount}, Ref: ${reference}`);

        const handler = PaystackPop.setup({
            key: CONFIG.PAYSTACK_PUBLIC_KEY,
            email: currentCustomerEmail,
            amount: amount * 100, // Paystack expects amount in kobo/pesewas
            currency: 'GHS',
            ref: reference,
            callback: function (response) {
                // This is called when payment is SUCCESSFUL
                console.log('Paystack payment successful:', response);
                alert('Payment successful! Your order status is being updated.');
                // The webhook will handle the database update.
                // We just refresh the orders list for the user.
                fetchAndDisplayOrders(true);
                fetchDashboardOverviewData(true);
            },
            onClose: function () {
                // This is called when the user closes the popup
                console.log('Paystack popup closed by user.');
                alert('Payment was not completed.');
            }
        });
        handler.openIframe();
    };


    // --- Event Listeners ---
    // (FIXED Sidebar Navigation)
    sidebarNavItems.forEach(item => item.addEventListener('click', (e) => {
        const target = item.getAttribute('data-target');
        if (target) {
            e.preventDefault(); // Only prevent default if it's a tab link
            showContentPanel(target);
        }
        // If no data-target, let the link behave normally (e.g., logout button)
    }));

    navActionTriggers.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); const target = item.getAttribute('data-target'); if (target) showContentPanel(target); }));
    if (mobileHamburger) mobileHamburger.addEventListener('click', () => { if (dashboardSidebar) dashboardSidebar.classList.add('sidebar-open'); document.body.classList.add('sidebar-open'); });
    if (mobileOverlay) mobileOverlay.addEventListener('click', () => { if (dashboardSidebar) dashboardSidebar.classList.remove('sidebar-open'); document.body.classList.remove('sidebar-open'); });

    if (copyAddressBtn) copyAddressBtn.addEventListener('click', () => {
        if (!userWarehouseAddressDiv) return;
        // Reconstruct the text for clean copy
        const name = userWarehouseAddressDiv.querySelector('#warehouse-name')?.innerText || '';
        const phone = userWarehouseAddressDiv.querySelector('#warehouse-phone')?.innerText || '';
        const addressParts = Array.from(userWarehouseAddressDiv.querySelectorAll('p'))
            .map(p => p.innerText)
            .filter(text => !text.startsWith('Name:') && !text.startsWith('Phone:'));

        const textToCopy = `Name: ${name}\n${addressParts.join('\n')}\nPhone: ${phone}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHtml = copyAddressBtn.innerHTML;
            copyAddressBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyAddressBtn.classList.add('copied');
            setTimeout(() => { copyAddressBtn.innerHTML = originalHtml; copyAddressBtn.classList.remove('copied'); }, 2000);
        });
    });

    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', async (e) => { e.preventDefault(); await logoutAndRedirect('index.html'); });

    // --- Event Delegation for Order Table (MODIFIED) ---
    if (linkOrdersTable) {
        linkOrdersTable.addEventListener('click', (e) => {
            const viewButton = e.target.closest('.view-details-btn');
            const deleteButton = e.target.closest('.delete-order-btn');
            const payButton = e.target.closest('.pay-now-btn'); // <-- NEW

            if (viewButton) {
                e.preventDefault();
                const row = viewButton.closest('.table-row');
                if (row && row.dataset.order) {
                    openOrderDetailsModal(JSON.parse(row.dataset.order));
                }
                return;
            }

            if (deleteButton) {
                e.preventDefault();
                const orderId = deleteButton.dataset.orderId;
                if (orderId) {
                    handleDeleteOrder(orderId);
                }
                return;
            }

            if (payButton) { // <-- NEW
                e.preventDefault();
                const orderId = payButton.dataset.orderId;
                const amount = payButton.dataset.amount;
                const reference = payButton.dataset.reference;
                if (orderId && amount && reference) {
                    handlePayNow(orderId, amount, reference);
                }
                return;
            }
        });
    }

    // --- Event Delegation for Shipment Details (FIXED) ---
    if (shipmentsTable) {
        shipmentsTable.addEventListener('click', (e) => {
            const detailsButton = e.target.closest('.view-shipment-details-btn');
            if (detailsButton) {
                e.preventDefault();
                const shipmentId = detailsButton.dataset.shipmentId;
                openShipmentDetailsModal(shipmentId);
            }
        });
    }


    // Order Form Modal Listeners
    if (openOrderModalBtn) openOrderModalBtn.addEventListener('click', () => {
        if (newLinkOrderForm) newLinkOrderForm.reset(); // Clear the form
        if (screenshotPreview) {
            screenshotPreview.style.display = 'none'; // Hide old preview
            screenshotPreview.src = '';
        }
        if (orderModalOverlay) orderModalOverlay.classList.add('active');
        calculateOrderCosts();
    });
    if (orderModalCloseBtn) orderModalCloseBtn.addEventListener('click', () => closeModal(orderModalOverlay));
    if (orderModalOverlay) orderModalOverlay.addEventListener('click', (e) => { if (e.target === orderModalOverlay) closeModal(orderModalOverlay); });

    if (orderCnyPriceInput) orderCnyPriceInput.addEventListener('input', calculateOrderCosts);
    if (orderQuantityInput) orderQuantityInput.addEventListener('input', calculateOrderCosts);

    // Order Details Modal Listeners
    if (orderDetailsModalCloseBtn) orderDetailsModalCloseBtn.addEventListener('click', () => closeModal(orderDetailsModalOverlay));
    if (orderDetailsModalOverlay) orderDetailsModalOverlay.addEventListener('click', (e) => { if (e.target === orderDetailsModalOverlay) closeModal(orderDetailsModalOverlay); });
    if (orderDetailsTrackBtn) orderDetailsTrackBtn.addEventListener('click', () => {
        closeModal(orderDetailsModalOverlay);
        showContentPanel('my-shipments-view');
    });
    if (orderDetailsContactBtn) orderDetailsContactBtn.addEventListener('click', () => window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}`, '_blank'));

    // Shipment Details Modal Listeners
    const shipmentDetailsModalOverlay = document.getElementById('shipment-details-modal-overlay');
    const shipmentDetailsModalClose = document.getElementById('shipment-details-modal-close-btn');
    if (shipmentDetailsModalClose) {
        shipmentDetailsModalClose.addEventListener('click', () => {
            closeModal(shipmentDetailsModalOverlay);
        });
    }
    if (shipmentDetailsModalOverlay) {
        shipmentDetailsModalOverlay.addEventListener('click', (e) => {
            if (e.target === shipmentDetailsModalOverlay) {
                closeModal(shipmentDetailsModalOverlay);
            }
        });
    }
    const shipmentDetailsContactBtn = document.getElementById('shipment-details-contact-btn');
    if (shipmentDetailsContactBtn) {
        shipmentDetailsContactBtn.addEventListener('click', () => window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}`, '_blank'));
    }

    // --- Pay Supplier Form Listeners ---
    if (paySupplierCnyInput) {
        paySupplierCnyInput.addEventListener('input', calculateSupplierPayment);
    }

    if (paySupplierForm) {
        paySupplierForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const ghsTotalText = paySupplierGhsDisplay.textContent; // e.g., "₵6080.00"
            const cnyAmount = parseFloat(paySupplierCnyInput.value) || 0;
            const rateText = paySupplierRateDisplay.value;

            if (cnyAmount < 1) {
                alert("Please enter an amount to send.");
                return;
            }

            const message = `Hello C2G, I would like to pay a supplier.\n\nAmount: ¥${cnyAmount}\nRate: ${rateText}\nTotal GHS: ${ghsTotalText}\n\nPlease provide payment details.`;
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodedMessage}`;

            window.open(whatsappUrl, '_blank');
        });
    }

    // --- Register Package Form Submission (FIXED) ---
    if (registerPackageForm) {
        registerPackageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (registerPackageBtn) {
                registerPackageBtn.textContent = 'Registering...';
                registerPackageBtn.disabled = true;
            }
            if (registerPackageMessage) registerPackageMessage.style.display = 'none';

            const trackingNumber = document.getElementById('reg-tracking-number').value;
            const storeName = document.getElementById('reg-store-name').value;
            const description = document.getElementById('reg-description').value;

            // Check if tracking number already exists for this user
            const { data: existing, error: checkError } = await supabase
                .from('shipments')
                .select('id')
                .eq('customer_id', currentUserId)
                .eq('tracking_number', trackingNumber)
                .single();

            if (existing) {
                if (registerPackageMessage) {
                    registerPackageMessage.textContent = 'Error: You have already registered this tracking number.';
                    registerPackageMessage.className = 'auth-message error';
                    registerPackageMessage.style.display = 'block';
                }
                if (registerPackageBtn) {
                    registerPackageBtn.textContent = 'Register Package';
                    registerPackageBtn.disabled = false;
                }
                return;
            }

            // Insert new shipment
            const { data, error } = await supabase
                .from('shipments')
                .insert([{
                    customer_id: currentUserId,
                    customer_name: currentCustomerName,
                    customer_unique_id: currentCustomerUniqueId, // This column MUST exist in your 'shipments' table
                    tracking_number: trackingNumber,
                    items_description: `${storeName}: ${description}`,
                    status: 'awaiting_arrival',
                    method: 'pending',
                    customer_contact: currentCustomerPhone
                }])
                .select();

            if (error) {
                // Check for the specific error you mentioned
                if (error.message.includes("column \"customer_unique_id\" does not exist")) {
                    if (registerPackageMessage) {
                        registerPackageMessage.textContent = 'Error: A database configuration issue occurred. Please contact support.';
                        registerPackageMessage.className = 'auth-message error';
                        registerPackageMessage.style.display = 'block';
                    }
                    console.error("CRITICAL DB ERROR: 'customer_unique_id' column is missing from 'shipments' table. Please add it in Supabase.");
                } else {
                    console.error("Error registering package:", error);
                    if (registerPackageMessage) {
                        registerPackageMessage.textContent = 'Error: ' + error.message;
                        registerPackageMessage.className = 'auth-message error';
                        registerPackageMessage.style.display = 'block';
                    }
                }
                if (registerPackageBtn) {
                    registerPackageBtn.textContent = 'Register Package';
                    registerPackageBtn.disabled = false;
                }
            } else {
                console.log("Package registered:", data);
                if (registerPackageMessage) {
                    registerPackageMessage.textContent = 'Package registered successfully!';
                    registerPackageMessage.className = 'auth-message success';
                    registerPackageMessage.style.display = 'block';
                }
                if (registerPackageForm) registerPackageForm.reset();
                if (registerPackageBtn) {
                    registerPackageBtn.textContent = 'Register Package';
                    registerPackageBtn.disabled = false;
                }

                // Invalidate cache and refresh table
                cache.incoming_packages = null;
                fetchAndDisplayIncomingPackages(true); // Force refresh

                // Hide success message after 3 seconds
                setTimeout(() => {
                    if (registerPackageMessage) registerPackageMessage.style.display = 'none';
                }, 3000);
            }
        });
    }

    // --- Order Form Submission (MODIFIED FOR PAYSTACK INLINE & CACHE) ---
    if (newLinkOrderForm) {
        newLinkOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (orderModalSubmitBtn) {
                orderModalSubmitBtn.textContent = 'Processing...';
                orderModalSubmitBtn.disabled = true;
            }

            // 1. Screenshot Upload Logic
            let screenshotUrl = null;
            if (orderScreenshotUploadInput && orderScreenshotUploadInput.files.length > 0) {
                const file = orderScreenshotUploadInput.files[0];
                const filePath = `${currentUserId}/orders/${Date.now()}_${file.name}`;
                const { error: uploadError } = await supabase.storage.from('order-screenshots').upload(filePath, file);

                if (uploadError) {
                    alert('Failed to upload screenshot: ' + uploadError.message);
                    if (orderModalSubmitBtn) {
                        orderModalSubmitBtn.disabled = false;
                        orderModalSubmitBtn.textContent = 'Proceed to Payment';
                    }
                    return;
                }
                screenshotUrl = supabase.storage.from('order-screenshots').getPublicUrl(filePath).data.publicUrl;
            } else {
                alert('Screenshot is mandatory. Please upload one to proceed.');
                if (orderModalSubmitBtn) {
                    orderModalSubmitBtn.disabled = false;
                    orderModalSubmitBtn.textContent = 'Proceed to Payment';
                }
                return;
            }

            // 2. Save the order to database
            const orderDetails = {
                customer_id: currentUserId,
                customer_name: currentCustomerName,
                customer_unique_id: currentCustomerUniqueId,
                type: 'link_order',
                product_link: orderProductLinkInput.value,
                cny_price: parseFloat(orderCnyPriceInput.value),
                quantity: parseInt(orderQuantityInput.value),
                shipping_mode: orderShippingModeSelect.value,
                notes: orderNotesTextarea.value || null,
                screenshot_url: screenshotUrl,
                total: parseFloat(modalTotalGhsSpan.textContent.replace('₵', '')),
                payment_status: 'awaiting_payment',
                order_status: 'new',
            };

            const { data: newOrderData, error: insertError } = await supabase
                .from('orders')
                .insert([orderDetails])
                .select()
                .single();

            if (insertError || !newOrderData) {
                console.error('Order insertion error:', insertError);
                alert('Failed to save your order: ' + (insertError?.message || 'Unknown database error.'));
                if (orderModalSubmitBtn) {
                    orderModalSubmitBtn.disabled = false;
                    orderModalSubmitBtn.textContent = 'Proceed to Payment';
                }
                return;
            }

            console.log("Order saved successfully with ID:", newOrderData.id);

            // 3. Launch Paystack Popup
            const handler = PaystackPop.setup({
                key: CONFIG.PAYSTACK_PUBLIC_KEY,
                email: currentCustomerEmail,
                amount: newOrderData.total * 100, // Paystack expects amount in kobo/pesewas
                currency: 'GHS',
                ref: `C2G-ORDER-${newOrderData.id}`,
                callback: function (response) {
                    // This is called when payment is SUCCESSFUL
                    console.log('Paystack payment successful:', response);
                    closeModal(orderModalOverlay);
                    alert('Payment successful! Your order status is being updated.');

                    // --- THIS IS THE FIX ---
                    // Invalidate caches so the dashboard refreshes with new data
                    cache.orders = null;
                    cache.dashboardOverview = null;
                    fetchAndDisplayOrders(true);
                    fetchDashboardOverviewData(true);
                    // --- END OF FIX ---
                },
                onClose: function () {
                    // This is called when the user closes the popup
                    console.log('Paystack popup closed by user.');
                    alert('Payment was not completed. Your order is saved as "Awaiting Payment".');
                    // Re-enable the button
                    if (orderModalSubmitBtn) {
                        orderModalSubmitBtn.disabled = false;
                        orderModalSubmitBtn.textContent = 'Proceed to Payment';
                    }
                    // --- THIS IS THE FIX ---
                    // Refresh orders to show the new 'awaiting_payment' order
                    cache.orders = null;
                    fetchAndDisplayOrders(true);
                    // --- END OF FIX ---
                }
            });
            handler.openIframe();
        });
    }

    // --- Settings Forms Submissions ---
    if (profileSettingsForm) profileSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('customers').update({ name: settingName.value, phone: settingPhone.value }).eq('id', currentUserId);
        if (error) { alert('Failed to update profile: ' + error.message); }
        else { alert('Profile updated successfully!'); await fetchAndDisplayUserInfo(); }
    });

    if (passwordSettingsForm) passwordSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        if (newPassword !== document.getElementById('confirm-password').value) { alert('Passwords do not match.'); return; }
        if (newPassword.length < 6) { alert('Password must be at least 6 characters.'); return; }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) { alert('Failed to change password: ' + error.message); }
        else { alert('Password updated successfully! You will be logged out.'); await signOut(); }
    });

    // --- INITIAL LOAD ---
    (async () => {
        if (typeof AOS !== 'undefined') AOS.init({ duration: 800, once: true });

        // Run fetches that don't depend on user info
        await fetchExchangeRates();
        populatePricingTable(); // Populate the pricing table

        // Fetch user info. This is critical and will redirect if it fails.
        await fetchAndDisplayUserInfo();

        // If fetchAndDisplayUserInfo fails, currentUserId will be null and it will have redirected.
        // This check prevents the rest of the code from running on a user that is about to be logged out.
        if (!currentUserId) {
            console.log("Halting dashboard init; user info failed to load or user is not logged in.");
            return;
        }

        const initialHash = window.location.hash.substring(1) || 'dashboard-view';
        showContentPanel(initialHash);

        calculateOrderCosts(); // Initialize link order modal calculator
        calculateSupplierPayment(); // Initialize pay supplier calculator

        console.log(">>> Dashboard initialization complete.");
    })();
});