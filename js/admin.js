// js/admin.js (Fully Updated: All features + fixes for associated_orders)

import { supabase } from './supabase-client.js';
import { getSession, logoutAndRedirect } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("admin.js: Script loaded and DOMContentLoaded fired!");

    // --- CORE APP STATE & ELEMENTS ---
    const body = document.body;
    const adminHeaderTitle = document.getElementById('admin-header-title');
    let ordersChart = null; // Chart.js instance
    let allCustomers = [], allProducts = [], allOrders = [], allShipments = [], allAnnouncements = [];
    let editingProductId = null;
    let editingShipmentId = null;
    let isEditingRates = false;

    // --- HELPER FUNCTIONS ---
    const openModal = (modal) => {
        if (modal) {
            modal.classList.add('active');
            body.classList.add('modal-open');
            console.log("Modal opened:", modal.id);
        }
    };

    const closeModal = (modal) => {
        if (modal) {
            modal.classList.remove('active');
            body.classList.remove('modal-open');
            console.log("Modal closed:", modal.id);
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const formatCurrency = (amount) => `₵${parseFloat(amount || 0).toFixed(2)}`;

    const generateCustomerUniqueId = (fullName) => {
        let initials = 'XX';
        if (fullName && fullName.trim() !== '') {
            const name_parts = fullName.trim().split(' ').filter(n => n);
            if (name_parts.length === 1) {
                initials = name_parts[0].substring(0, 2).toUpperCase();
            } else if (name_parts.length > 1) {
                initials = (name_parts[0][0] + name_parts[name_parts.length - 1][0]).toUpperCase();
            }
        }
        const randomPart = Math.floor(100000 + Math.random() * 900000);
        return `${initials}-${randomPart}`;
    };

    const getStatusBadgeClass = (status) => {
        const mappings = {
            'pending': 'payment-deposit', 'awaiting_payment': 'payment-deposit',
            'awaiting_arrival': 'status-processing', 'in_warehouse': 'status-transit',
            'new': 'status-processing', 'purchased': 'status-processing', 'processing': 'status-processing',
            'in-transit': 'status-transit', 'clearing_customs': 'status-transit',
            'ready_for_pickup': 'status-delivered', 'delivered': 'status-delivered', 'active': 'status-delivered',
            'inactive': 'status-cancelled', 'suspended': 'status-cancelled', 'cancelled': 'status-cancelled',
            'paid': 'status-delivered', 'refunded': 'status-cancelled'
        };
        // Distinguish between payment and order status styling
        if (['awaiting_payment', 'paid', 'refunded'].includes(status)) {
            return `payment-badge ${mappings[status] || 'status-badge'}`;
        }
        return `status-badge ${mappings[status] || 'status-badge'}`;
    };

    // --- NAVIGATION ---
    const navigateToTab = async (targetId, filter = {}) => {
        console.log("Navigating to tab:", targetId);
        document.querySelectorAll('#admin-sidebar-nav a').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));

        const sidebarLink = document.querySelector(`#admin-sidebar-nav a[data-target="${targetId}"]`);
        if (sidebarLink) {
            sidebarLink.classList.add('active');
            if (adminHeaderTitle) adminHeaderTitle.textContent = sidebarLink.querySelector('span').textContent;
        }

        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            // Load data for the activated tab
            if (targetId === 'dashboard-view') await renderDashboard();
            else if (targetId === 'orders-view') await renderOrders(filter);
            else if (targetId === 'products-view') await renderProducts();
            else if (targetId === 'shipments-view') await renderShipments(filter);
            else if (targetId === 'customers-view') await renderCustomers();
            else if (targetId === 'announcements-view') await renderAnnouncements();
            else if (targetId === 'settings-view') {
                await loadAllSettings();
                // Handle settings sub-tabs
                const initialSettingsPanel = window.location.hash.includes('settings-') ? window.location.hash.substring(1) : 'general-settings-panel';
                document.querySelectorAll('.settings-nav a').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                document.querySelector(`.settings-nav a[data-target="${initialSettingsPanel}"]`)?.classList.add('active');
                document.getElementById(initialSettingsPanel)?.classList.add('active');
            }
        }
        closeSidebar();
    };

    const openSidebar = () => body.classList.add('sidebar-open');
    const closeSidebar = () => body.classList.remove('sidebar-open');

    // --- DASHBOARD RENDERING ---
    const renderDashboard = async () => {
        const [{ data: ordersData, count: newOrderCount }, { count: warehouseCount }, { data: productsData }] = await Promise.all([
            supabase.from('orders').select('created_at, total, order_status', { count: 'exact' }).in('order_status', ['new', 'awaiting_payment']),
            supabase.from('shipments').select('status', { count: 'exact' }).eq('status', 'in_warehouse'),
            supabase.from('products').select('id, name, sku, stock')
        ]);

        // Recalculate monthly revenue
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: revenueData, error: revenueError } = await supabase
            .from('orders')
            .select('total')
            .gte('created_at', firstDayOfMonth)
            .eq('payment_status', 'paid'); // Only count paid orders

        const orders = ordersData || [];
        const products = productsData || [];

        const newOrdersStat = document.querySelector('[data-stat="new-orders"] .value');
        if (newOrdersStat) newOrdersStat.textContent = (orders.filter(o => o.order_status === 'new').length) || 0;

        const revenueStat = document.querySelector('.stat-card:nth-child(2) .value');
        if (revenueStat && !revenueError) {
            revenueStat.textContent = formatCurrency(revenueData.reduce((sum, o) => sum + (o.total || 0), 0));
        }

        const pendingStat = document.querySelector('[data-stat="pending-actions"] .value');
        if (pendingStat) pendingStat.textContent = newOrderCount || 0;

        const warehouseStat = document.querySelector('[data-stat="warehouse-packages"] .value');
        if (warehouseStat) warehouseStat.textContent = warehouseCount || 0;

        const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < 10);
        const alertListContainer = document.querySelector('#dashboard-view .alert-list');
        if (alertListContainer) {
            alertListContainer.innerHTML = lowStockProducts.length > 0
                ? lowStockProducts.map(p => `<div class="alert-item"><div class="alert-info"><strong>${p.name}</strong><span class="meta">SKU: ${p.sku}</span></div><div class="alert-stock">${p.stock} left</div><button class="btn btn-secondary btn-sm restock-btn" data-product-id="${p.id}">Restock</button></div>`).join('')
                : `<p class="meta" style="text-align: center; padding: 1rem;">No low stock alerts.</p>`;
        }
    };

    // --- ORDERS RENDERING (with Delete Button) ---
    const renderOrders = async (filter = {}) => {
        const container = document.getElementById('orders-table-container');
        if (!container) return;
        container.innerHTML = `<p class="meta">Loading orders...</p>`;

        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) {
            container.innerHTML = `<p class="meta">Error loading orders.</p>`;
            return;
        }
        allOrders = data;
        displayOrders(filter);
    };

    const displayOrders = (filter = {}) => {
        const container = document.getElementById('orders-table-container');
        if (!container) return;

        const searchInput = document.getElementById('order-search-input');
        const statusFilter = filter.status || document.getElementById('order-status-filter')?.value || 'all';
        const typeFilter = document.getElementById('order-type-filter')?.value || 'all';
        const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';

        const filtered = allOrders.filter(order => {
            const searchNum = searchValue.replace(/\D/g, '');
            const searchMatch = !searchValue ||
                (order.customer_name && order.customer_name.toLowerCase().includes(searchValue)) ||
                (order.customer_unique_id && order.customer_unique_id.toLowerCase().includes(searchValue)) ||
                (searchNum && order.id.toString().includes(searchNum));
            const statusMatch = statusFilter === 'all' || order.order_status === statusFilter;
            const typeMatch = typeFilter === 'all' || order.type === typeFilter;
            return searchMatch && statusMatch && typeMatch;
        });

        const formatShippingMode = (mode) => {
            if (!mode) return '<span class="meta">N/A</span>';
            const modeMap = {
                'air_express': '✈️ Express',
                'air_normal': '✈️ Normal',
                'sea': '🚢 Sea'
            };
            return modeMap[mode] || mode;
        };

        // Note: The grid-template-columns for this is in admin.css
        container.innerHTML = `
            <div class="table-header">
                <div>Order ID</div><div>Customer</div><div>Date</div><div>Shipping</div><div>Total</div><div>Payment</div><div>Status</div><div>Actions</div>
            </div>
            ${filtered.map(order => `
                <div class="table-row">
                    <div><span class="order-type-${order.type || 'link_order'}">${(order.type || 'link_order').replace('_', ' ').toUpperCase()}</span> #${order.id}</div>
                    <div>${order.customer_name}<br><span class="meta">${order.customer_unique_id || 'N/A'}</span></div>
                    <div>${formatDate(order.created_at)}</div>
                    <div>${formatShippingMode(order.shipping_mode)}</div>
                    <div>${formatCurrency(order.total)}</div>
                    <div>
                        <select class="status-select ${getStatusBadgeClass(order.payment_status)}" data-order-id="${order.id}" data-type="payment_status">
                            <option value="awaiting_payment" ${order.payment_status === 'awaiting_payment' ? 'selected' : ''}>Awaiting</option>
                            <option value="paid" ${order.payment_status === 'paid' ? 'selected' : ''}>Paid</option>
                            <option value="refunded" ${order.payment_status === 'refunded' ? 'selected' : ''}>Refunded</option>
                        </select>
                    </div>
                    <div>
                        <select class="status-select ${getStatusBadgeClass(order.order_status)}" data-order-id="${order.id}" data-type="order_status">
                            <option value="new" ${order.order_status === 'new' ? 'selected' : ''}>New</option>
                            <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="purchased" ${order.order_status === 'purchased' ? 'selected' : ''}>Purchased</option>
                            <option value="in-transit" ${order.order_status === 'in-transit' ? 'selected' : ''}>In Transit</option>
                            <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm view-order-details-btn" data-order-id="${order.id}" title="View Details"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-danger btn-sm delete-order-btn" data-order-id="${order.id}" title="Delete Order"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('') || `<p class="meta" style="text-align:center; padding: 1rem;">No orders found.</p>`}`;
    };

    // --- ORDER DETAILS MODAL (with Screenshot) ---
    const openOrderDetailsModal = async (orderId) => {
        console.log("Opening order details for:", orderId);
        const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (error) {
            alert('Could not fetch order details');
            return;
        }

        let customerPhone = 'N/A';
        if (order.customer_id) {
            const { data: customer } = await supabase.from('customers').select('phone').eq('id', order.customer_id).single();
            if (customer && customer.phone) {
                customerPhone = customer.phone;
            }
        }

        const shippingModeLabels = {
            'air_express': 'Air Express (3 days) - ₵450/kg',
            'air_normal': 'Air Normal (12 days) - $16/kg',
            'sea': 'Sea Freight (35-40 days) - $250/CBM'
        };

        const shippingModeDisplay = order.shipping_mode
            ? shippingModeLabels[order.shipping_mode] || order.shipping_mode
            : 'Not specified';

        let productLinkDisplay = 'N/A';
        if (order.product_link) {
            try {
                const hostname = new URL(order.product_link).hostname;
                productLinkDisplay = `<a href="${order.product_link}" target="_blank">${hostname}</a>`;
            } catch (e) {
                productLinkDisplay = `<a href="${order.product_link}" target="_blank">View Link (invalid URL)</a>`;
            }
        }

        const detailsHTML = `
            <div class="order-details-header">
                <h3>Order Details: #${order.id}</h3>
                <p class="meta">Placed on ${formatDate(order.created_at)}</p>
            </div>
            <div class="order-details-grid">
                <div class="detail-section">
                    <h4>Customer</h4>
                    <p><strong>Name:</strong> ${order.customer_name}</p>
                    <p><strong>ID:</strong> ${order.customer_unique_id || 'N/A'}</p>
                    <p><strong>Phone:</strong> <a href="tel:${customerPhone}">${customerPhone}</a></p>
                </div>
                <div class="detail-section">
                    <h4>Financials</h4>
                    <p><strong>Total Cost:</strong> ${formatCurrency(order.total)}</p>
                    <p><strong>Payment:</strong> <span class="status-badge ${getStatusBadgeClass(order.payment_status)}">${order.payment_status}</span></p>
                    <p><strong>Order Status:</strong> <span class="status-badge ${getStatusBadgeClass(order.order_status)}">${order.order_status}</span></p>
                </div>
                <div class="detail-section full-width">
                    <h4>Product Details</h4>
                    <p><strong>Link:</strong> ${productLinkDisplay}</p>
                    <p><strong>Price (CNY):</strong> ¥${(order.cny_price || 0).toFixed(2)}</p>
                    <p><strong>Quantity:</strong> ${order.quantity}</p>
                    <p><strong>Shipping Mode:</strong> <span class="shipping-mode-badge">${shippingModeDisplay}</span></p>
                    <p><strong>Notes:</strong> ${order.notes || 'N/A'}</p>
                </div>
                ${order.screenshot_url ? `
                <div class="detail-section full-width">
                    <h4>Screenshot</h4>
                    <div class="screenshot-display">
                        <a href="${order.screenshot_url}" target="_blank">
                             <img src="${order.screenshot_url}" alt="Order Screenshot" class="order-screenshot-preview">
                        </a>
                    </div>
                </div>` : '<div class="detail-section full-width"><h4>Screenshot</h4><p>No screenshot provided.</p></div>'}
            </div>`;

        const orderDetailsContent = document.getElementById('order-details-content');
        if (orderDetailsContent) {
            orderDetailsContent.innerHTML = detailsHTML;
            openModal(document.getElementById('order-details-modal'));
        }
    };

    // --- PRODUCTS RENDERING ---
    const renderProducts = async (forceRefresh = false) => {
        const container = document.getElementById('products-table-container');
        if (!container) return;

        if (!forceRefresh && allProducts.length > 0) {
            displayProducts();
            return;
        }

        container.innerHTML = `<p class="meta">Loading products...</p>`;

        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) {
            container.innerHTML = `<p class="meta">Error loading products.</p>`;
            return;
        }
        allProducts = data;
        displayProducts();
    };

    const displayProducts = () => {
        const container = document.getElementById('products-table-container');
        if (!container) return;

        const searchInput = document.getElementById('product-search-input');
        const statusFilter = document.getElementById('product-status-filter')?.value || 'all';
        const categoryFilter = document.getElementById('product-category-filter')?.value || 'all';
        const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';

        const filtered = allProducts.filter(p => {
            const searchMatch = !searchValue || p.name?.toLowerCase().includes(searchValue) || p.sku?.toLowerCase().includes(searchValue);
            const statusMatch = statusFilter === 'all' || p.status === statusFilter;
            const categoryMatch = categoryFilter === 'all' || p.category === categoryFilter;
            return searchMatch && statusMatch && categoryMatch;
        });

        container.innerHTML = `
            <div class="table-header">
                <div>Image</div><div>Name</div><div>SKU</div><div>Price</div><div>Stock</div><div>Status</div><div>Actions</div>
            </div>
            ${filtered.map(p => `
                <div class="table-row">
                    <div><img src="${p.image || 'https_placehold.co/150x150/e9ecef/6c757d?text=No+Image'}" alt="${p.name}" class="table-img"></div>
                    <div>${p.name}</div>
                    <div>${p.sku}</div>
                    <div>${formatCurrency(p.price)}</div>
                    <div>${p.stock} ${p.stock < 10 && p.stock > 0 ? '<span class="attention-icon"><i class="fas fa-exclamation-triangle"></i></span>' : ''}</div>
                    <div><span class="status-badge ${getStatusBadgeClass(p.status)}">${p.status}</span></div>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm edit-product-btn" data-product-id="${p.id}" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm delete-product-btn" data-product-id="${p.id}" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('') || `<p class="meta" style="text-align:center;">No products found.</p>`}`;
    };

    // --- SHIPMENTS RENDERING (with Delete Button & Fixed Filter) ---
    const renderShipments = async (filter = {}) => {
        const container = document.getElementById('shipments-table-container');
        if (!container) return;
        container.innerHTML = `<p class="meta">Loading shipments...</p>`;

        const { data, error } = await supabase.from('shipments').select('*').order('created_at', { ascending: false });
        if (error) {
            container.innerHTML = `<p class="meta">Error loading shipments.</p>`;
            return;
        }
        allShipments = data;
        displayShipments(filter);
    };

    const displayShipments = (filter = {}) => {
        const container = document.getElementById('shipments-table-container');
        if (!container) return;

        const searchInput = document.getElementById('shipment-search-input');
        const statusFilter = filter.status || document.getElementById('shipment-status-filter')?.value || 'all';
        const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';

        const filtered = allShipments.filter(s => {
            const searchMatch = !searchValue ||
                (s.tracking_number && s.tracking_number.toLowerCase().includes(searchValue)) ||
                (s.customer_name && s.customer_name.toLowerCase().includes(searchValue)) ||
                (s.customer_unique_id && s.customer_unique_id.toLowerCase().includes(searchValue));
            const statusMatch = statusFilter === 'all' || s.status === statusFilter;
            return searchMatch && statusMatch;
        });

        container.innerHTML = `
            <div class="table-header">
                <div>Tracking #</div><div>Customer</div><div>Date Booked</div><div>Method</div><div>Status</div><div>Actions</div>
            </div>
            ${filtered.map(s => `
                <div class="table-row">
                    <div><strong>${s.tracking_number || 'N/A'}</strong></div>
                    <div>${s.customer_name || 'N/A'}<br><span class="meta">${s.customer_unique_id || s.customer_contact || ''}</span></div>
                    <div>${formatDate(s.created_at)}</div>
                    <div>${s.method || 'N/A'}</div>
                    <div>
                        <select class="status-select ${getStatusBadgeClass(s.status)}" data-shipment-id="${s.id}" data-type="status">
                            <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="awaiting_arrival" ${s.status === 'awaiting_arrival' ? 'selected' : ''}>Awaiting Arrival</option>
                            <option value="in_warehouse" ${s.status === 'in_warehouse' ? 'selected' : ''}>In Warehouse</option>
                            <option value="in_transit" ${s.status === 'in_transit' ? 'selected' : ''}>In Transit</option>
                            <option value="clearing_customs" ${s.status === 'clearing_customs' ? 'selected' : ''}>Customs</option>
                            <option value="ready_for_pickup" ${s.status === 'ready_for_pickup' ? 'selected' : ''}>Ready for Pickup</option>
                            <option value="delivered" ${s.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${s.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm edit-shipment-btn" data-shipment-id="${s.id}" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-sm delete-shipment-btn" data-shipment-id="${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('') || `<p class="meta" style="text-align:center; padding: 1rem;">No shipments found.</p>`}`;
    };

    // --- ANNOUNCEMENTS RENDERING ---
    const renderAnnouncements = async () => {
        const container = document.getElementById('announcements-admin-table');
        if (!container) return;
        container.innerHTML = `<p class="meta">Loading announcements...</p>`;

        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            container.innerHTML = `<p class="meta">Error loading announcements</p>`;
            return;
        }

        allAnnouncements = data || [];

        if (allAnnouncements.length === 0) {
            container.innerHTML = `<p class="meta" style="text-align:center; padding:2rem;">No announcements yet. Create your first one!</p>`;
            return;
        }

        container.innerHTML = `
            <div class="table-header">
                <div style="width: 30%;">Title</div>
                <div style="width: 15%;">Type</div>
                <div style="width: 10%;">Priority</div>
                <div style="width: 15%;">Status</div>
                <div style="width: 15%;">Created</div>
                <div style="width: 15%;">Actions</div>
            </div>
            ${allAnnouncements.map(ann => `
                <div class="table-row">
                    <div style="width: 30%;"><strong>${ann.title}</strong></div>
                    <div style="width: 15%;"><span class="status-badge type-${ann.type}">${ann.type}</span></div>
                    <div style="width: 10%;">${ann.priority}</div>
                    <div style="width: 15%;">
                        <span class="status-badge ${ann.is_active ? 'status-delivered' : 'status-cancelled'}">
                            ${ann.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div style="width: 15%;">${formatDate(ann.created_at)}</div>
                    <div style="width: 15%;" class="table-actions">
                        <button class="btn btn-secondary btn-sm toggle-announcement-btn" data-id="${ann.id}" data-active="${ann.is_active}">
                            ${ann.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                </div>
            `).join('')}
        `;
    };

    // --- ANNOUNCEMENT MODAL ---
    const openAnnouncementModal = () => {
        let modal = document.getElementById('announcement-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'announcement-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content large">
                    <button class="modal-close-btn" id="close-announcement-modal">&times;</button>
                    <h3>Create New Announcement</h3>
                    <form id="announcement-form" class="modal-form">
                        <div class="form-group">
                            <label for="ann-title">Title <span style="color: red;">*</span></label>
                            <input type="text" id="ann-title" required placeholder="e.g., Holiday Closure Notice">
                        </div>
                        
                        <div class="form-group">
                            <label for="ann-message">Message <span style="color: red;">*</span></label>
                            <textarea id="ann-message" rows="4" required placeholder="Enter announcement details..."></textarea>
                        </div>
                        
                        <div class="form-group-grid">
                            <div class="form-group">
                                <label for="ann-type">Type</label>
                                <select id="ann-type">
                                    <option value="info">Info</option>
                                    <option value="success">Success</option>
                                    <option value="warning">Warning</option>
                                    <option value="critical">Critical</option>
                                    <option value="promo">Promo</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="ann-priority">Priority (0-10)</label>
                                <input type="number" id="ann-priority" min="0" max="10" value="5">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="ann-icon">Icon</label>
                            <select id="ann-icon">
                                <option value="bell">Bell 🔔</option>
                                <option value="party-popper">Party Popper 🎉</option>
                                <option value="trending-up">Trending Up 📈</option>
                                <option value="alert-triangle">Alert Triangle ⚠️</option>
                                <option value="megaphone">Megaphone 📢</option>
                                <option value="gift">Gift 🎁</option>
                                <option value="star">Star ⭐</option>
                                <option value="fire">Fire 🔥</option>
                                <option value="rocket">Rocket 🚀</option>
                                <option value="sparkles">Sparkles ✨</option>
                            </select>
                        </div>
                        
                        <div class="form-group-grid">
                            <div class="form-group">
                                <label for="ann-action-label">Action Button Text (Optional)</label>
                                <input type="text" id="ann-action-label" placeholder="e.g., Learn More">
                            </div>
                            
                            <div class="form-group">
                                <label for="ann-action-url">Action Button URL (Optional)</label>
                                <input type="url" id="ann-action-url" placeholder="https://...">
                            </div>
                        </div>
                        
                        <div class="form-group-grid">
                            <div class="form-group">
                                <label for="ann-start-date">Start Date (Optional)</label>
                                <input type="datetime-local" id="ann-start-date">
                            </div>
                            
                            <div class="form-group">
                                <label for="ann-end-date">End Date (Optional)</label>
                                <input type="datetime-local" id="ann-end-date">
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">Create Announcement</button>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('close-announcement-modal').addEventListener('click', () => {
                closeModal(modal);
            });

            document.getElementById('announcement-form').addEventListener('submit', async (e) => {
                e.preventDefault();

                const announcementData = {
                    title: document.getElementById('ann-title').value,
                    message: document.getElementById('ann-message').value,
                    type: document.getElementById('ann-type').value,
                    icon: document.getElementById('ann-icon').value,
                    priority: parseInt(document.getElementById('ann-priority').value) || 5,
                    action_label: document.getElementById('ann-action-label').value || null,
                    action_url: document.getElementById('ann-action-url').value || null,
                    start_date: document.getElementById('ann-start-date').value || new Date().toISOString(),
                    end_date: document.getElementById('ann-end-date').value || null,
                    is_active: true,
                    target_audience: 'all'
                };

                const { error } = await supabase
                    .from('announcements')
                    .insert([announcementData]);

                if (error) {
                    alert('Failed to create announcement: ' + error.message);
                } else {
                    alert('Announcement created successfully!');
                    closeModal(modal);
                    await renderAnnouncements();
                    document.getElementById('announcement-form').reset();
                }
            });
        }

        openModal(modal);
    };

    // --- SHIPMENT HANDLERS (FIXED) ---
    const handleShipmentFormSubmit = async (e) => {
        e.preventDefault();
        console.log("Shipment form submitted, editingShipmentId:", editingShipmentId);

        const customerUuid = document.getElementById('shipment-customer-uuid')?.value;
        const customerName = document.getElementById('shipment-customerName')?.value;
        const customerUniqueId = document.getElementById('shipment-customer-unique-id')?.value;

        if (!customerUuid) {
            alert('Customer not found. Please verify the Customer Unique ID.');
            return;
        }

        const shipmentData = {
            tracking_number: document.getElementById('shipment-trackingId')?.value,
            customer_id: customerUuid,
            customer_name: customerName,
            customer_unique_id: customerUniqueId,
            customer_contact: document.getElementById('shipment-customerContact')?.value,
            method: document.getElementById('shipment-method')?.value,
            shipping_cost: parseFloat(document.getElementById('shipment-shippingCost')?.value) || null,
            items_description: document.getElementById('shipment-description')?.value || null,
            current_location: document.getElementById('shipment-current-location')?.value || null,
            eta_days: parseInt(document.getElementById('shipment-eta-days')?.value) || null,
            image_url: document.getElementById('shipment-image-url')?.value || null,
            destination: document.getElementById('shipment-deliveryAddress')?.value || null,
            // associated_orders: document.getElementById('shipment-associated-orders')?.value || null, // <-- REMOVED THIS
        };

        const weightInput = document.getElementById('shipment-weight');
        if (weightInput?.value) {
            shipmentData.total_weight_kg = parseFloat(weightInput.value);
        }

        try {
            const { error } = editingShipmentId ?
                await supabase.from('shipments').update(shipmentData).eq('id', editingShipmentId) :
                await supabase.from('shipments').insert([shipmentData]);

            if (error) throw error;

            closeModal(document.getElementById('shipment-form-modal'));
            await renderShipments();
            alert(editingShipmentId ? 'Shipment updated successfully!' : 'Shipment created successfully!');

        } catch (error) {
            console.error("Error saving shipment:", error);
            alert('Error saving shipment: ' + error.message);
        }
    };

    const handleEditShipment = async (shipmentId) => {
        console.log("Edit shipment clicked:", shipmentId);
        const { data: shipment, error } = await supabase.from('shipments').select('*').eq('id', shipmentId).single();
        if (error) {
            alert('Could not fetch shipment details.');
            return;
        }

        editingShipmentId = shipmentId;
        const shipmentModal = document.getElementById('shipment-form-modal');
        const shipmentForm = document.getElementById('shipment-form');

        if (!shipmentForm || !shipmentModal) {
            console.error("Shipment form or modal not found!");
            return;
        }

        shipmentForm.reset();
        document.getElementById('shipment-modal-title').textContent = 'Edit Shipment';
        document.getElementById('shipment-trackingId').value = shipment.tracking_number;
        document.getElementById('shipment-method').value = shipment.method;

        if (document.getElementById('shipment-weight')) document.getElementById('shipment-weight').value = shipment.total_weight_kg || '';
        if (document.getElementById('shipment-shippingCost')) document.getElementById('shipment-shippingCost').value = shipment.shipping_cost || '';
        if (document.getElementById('shipment-description')) document.getElementById('shipment-description').value = shipment.items_description || '';
        if (document.getElementById('shipment-current-location')) document.getElementById('shipment-current-location').value = shipment.current_location || '';
        if (document.getElementById('shipment-eta-days')) document.getElementById('shipment-eta-days').value = shipment.eta_days || '';
        if (document.getElementById('shipment-image-url')) document.getElementById('shipment-image-url').value = shipment.image_url || '';
        if (document.getElementById('shipment-deliveryAddress')) document.getElementById('shipment-deliveryAddress').value = shipment.destination || '';

        // if (document.getElementById('shipment-associated-orders')) document.getElementById('shipment-associated-orders').value = shipment.associated_orders || ''; // <-- REMOVED THIS

        document.getElementById('shipment-customer-uuid').value = shipment.customer_id;

        if (shipment.customer_unique_id) {
            if (document.getElementById('shipment-customer-unique-id')) document.getElementById('shipment-customer-unique-id').value = shipment.customer_unique_id;
            if (document.getElementById('shipment-customerName')) document.getElementById('shipment-customerName').value = shipment.customer_name;
            if (document.getElementById('shipment-customerContact')) document.getElementById('shipment-customerContact').value = shipment.customer_contact || '';
            const lookupStatus = document.getElementById('customer-lookup-status');
            if (lookupStatus) {
                lookupStatus.textContent = `✓ Customer Found: ${shipment.customer_name}`;
                lookupStatus.className = 'lookup-status success';
            }
        } else if (shipment.customer_id) {
            const { data: customer } = await supabase.from('customers').select('customer_unique_id, name, phone, email').eq('id', shipment.customer_id).single();
            if (customer) {
                if (document.getElementById('shipment-customer-unique-id')) document.getElementById('shipment-customer-unique-id').value = customer.customer_unique_id;
                if (document.getElementById('shipment-customerName')) document.getElementById('shipment-customerName').value = customer.name;
                if (document.getElementById('shipment-customerContact')) document.getElementById('shipment-customerContact').value = customer.phone || customer.email || '';

                const lookupStatus = document.getElementById('customer-lookup-status');
                if (lookupStatus) {
                    lookupStatus.textContent = `✓ Customer Found: ${customer.name}`;
                    lookupStatus.className = 'lookup-status success';
                }
            }
        }

        openModal(shipmentModal);
    };

    // --- Handle Deletion for Admin ---
    const handleDeleteOrder = async (orderId) => {
        if (!confirm(`Are you sure you want to permanently delete Order #${orderId}? This cannot be undone.`)) {
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
            await renderOrders(); // Force refresh
            await renderDashboard(); // Update stats
        }
    };

    const handleDeleteShipment = async (shipmentId) => {
        if (!confirm(`Are you sure you want to permanently delete Shipment #${shipmentId}? This cannot be undone.`)) {
            return;
        }

        const { error } = await supabase
            .from('shipments')
            .delete()
            .eq('id', shipmentId);

        if (error) {
            console.error('Error deleting shipment:', error);
            alert('Failed to delete shipment: ' + error.message);
        } else {
            alert('Shipment deleted successfully.');
            await renderShipments(); // Force refresh
            await renderDashboard(); // Update stats
        }
    };

    // --- CUSTOMERS RENDERING ---
    const renderCustomers = async (forceRefresh = false) => {
        const container = document.getElementById('customers-table-container');
        if (!container) return;

        if (!forceRefresh && allCustomers.length > 0) {
            displayCustomers();
            return;
        }

        container.innerHTML = `<p class="meta">Loading customers...</p>`;

        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) {
            container.innerHTML = `<p class="meta">Error: ${error.message}</p>`;
            return;
        }
        allCustomers = data;
        displayCustomers();
    };

    const displayCustomers = () => {
        const container = document.getElementById('customers-table-container');
        if (!container) return;

        const searchInput = document.getElementById('customer-search-input');
        const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';

        const filtered = allCustomers.filter(c => !searchValue ||
            (c.name && c.name.toLowerCase().includes(searchValue)) ||
            (c.email && c.email.toLowerCase().includes(searchValue)) ||
            (c.customer_unique_id && c.customer_unique_id.toLowerCase().includes(searchValue))
        );

        container.innerHTML = `
            <div class="table-header">
                <div>Customer ID</div><div>Name</div><div>Date Joined</div><div>Status</div><div>Actions</div>
            </div>
            ${filtered.map(c => `
                <div class="table-row">
                    <div><strong>${c.customer_unique_id || 'N/A'}</strong></div>
                    <div>${c.name}<br><span class="meta">${c.email}</span></div>
                    <div>${formatDate(c.created_at)}</div>
                    <div>
                        <select class="status-select ${getStatusBadgeClass(c.status)}" data-customer-id="${c.id}" data-type="status">
                            <option value="active" ${c.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="suspended" ${c.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                        </select>
                    </div>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm edit-customer-btn" data-customer-id="${c.id}" title="Edit"><i class="fas fa-user-edit"></i></button>
                        <button class="btn btn-secondary btn-sm view-customer-details-btn" data-customer-id="${c.id}" title="View Profile"><i class="fas fa-eye"></i></button>
                    </div>
                </div>
            `).join('') || `<p class="meta" style="text-align:center;">No customers found.</p>`}`;
    };

    // --- CUSTOMER HANDLERS ---
    const handleAddCustomerClick = () => {
        const customerForm = document.getElementById('customer-form');
        const customerModal = document.getElementById('customer-form-modal');
        if (!customerForm || !customerModal) return;

        customerForm.reset();
        customerForm.dataset.editingId = ""; // Clear editing ID
        document.getElementById('customer-modal-title').textContent = 'Add New Customer';
        document.getElementById('customer-password').closest('.form-group').style.display = 'block'; // Show password field
        document.getElementById('customer-password').required = true;
        document.getElementById('customer-unique-id').readOnly = false;
        document.getElementById('customer-unique-id').value = generateCustomerUniqueId(""); // Suggest a new ID

        openModal(customerModal);
    };

    const handleEditCustomer = async (customerId) => {
        const { data: customer, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
        if (error) {
            alert('Could not fetch customer details.');
            return;
        }

        const customerForm = document.getElementById('customer-form');
        const customerModal = document.getElementById('customer-form-modal');

        if (!customerForm || !customerModal) return;

        customerForm.reset();
        customerForm.dataset.editingId = customerId;
        document.getElementById('customer-modal-title').textContent = 'Edit Customer';
        document.getElementById('customer-name').value = customer.name;
        document.getElementById('customer-email').value = customer.email;
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-status').value = customer.status || 'active';

        const passwordField = document.getElementById('customer-password');
        if (passwordField) {
            passwordField.closest('.form-group').style.display = 'block'; // Keep it visible
            passwordField.placeholder = "Leave blank to keep unchanged";
            passwordField.required = false; // Not required on edit
        }

        const uniqueIdInput = document.getElementById('customer-unique-id');
        uniqueIdInput.value = customer.customer_unique_id;
        uniqueIdInput.readOnly = true; // Don't allow editing existing ID

        openModal(customerModal);
    };

    const handleCustomerFormSubmit = async (e) => {
        e.preventDefault();
        const customerForm = document.getElementById('customer-form');
        const saveButton = document.getElementById('save-customer-btn');
        const editingCustomerId = customerForm.dataset.editingId;

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        const name = document.getElementById('customer-name').value;
        const email = document.getElementById('customer-email').value;
        const phone = document.getElementById('customer-phone').value || null;
        const status = document.getElementById('customer-status').value;
        const password = document.getElementById('customer-password').value;
        const uniqueId = document.getElementById('customer-unique-id').value;

        try {
            if (editingCustomerId) {
                // --- UPDATE EXISTING CUSTOMER ---
                const updates = { name, email, phone, status };

                // 1. Update auth user if password changed
                if (password) {
                    if (password.length < 6) {
                        alert('Password must be at least 6 characters.');
                        throw new Error('Password too short');
                    }
                    const { error: authError } = await supabase.auth.admin.updateUserById(editingCustomerId, { password: password });
                    if (authError) throw authError;
                }

                // 2. Update 'customers' table
                const { error: dbError } = await supabase.from('customers').update(updates).eq('id', editingCustomerId);
                if (dbError) throw dbError;

                alert('Customer updated successfully!');
            } else {
                // --- CREATE NEW CUSTOMER ---
                if (!password || password.length < 6) {
                    alert('A password of at least 6 characters is required for new users.');
                    throw new Error('Password required');
                }

                // 1. Create auth user
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: email,
                    password: password,
                    email_confirm: true // Auto-confirm email
                });
                if (authError) throw authError;

                // 2. Create 'customers' profile
                const customerData = {
                    id: authData.user.id,
                    name: name,
                    email: email,
                    phone: phone,
                    status: status,
                    customer_unique_id: uniqueId
                };
                const { error: dbError } = await supabase.from('customers').insert(customerData);
                if (dbError) {
                    // If DB insert fails, delete the auth user to prevent orphans
                    await supabase.auth.admin.deleteUser(authData.user.id);
                    throw dbError;
                }

                alert('Customer created successfully!');
            }

            closeModal(document.getElementById('customer-form-modal'));
            await renderCustomers(true); // Force refresh

        } catch (error) {
            console.error("Error saving customer:", error);
            alert('Error saving customer: ' + error.message);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Customer";
        }
    };

    const openCustomerDetailsModal = async (customerId) => {
        const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
        if (!customer) {
            alert('Could not fetch customer details.');
            return;
        }

        const { data: orders } = await supabase.from('orders').select('id, product_link, order_status, total, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(5);
        const { data: shipments } = await supabase.from('shipments').select('tracking_number, status, total_weight_kg, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(5);

        const ordersHTML = (orders || []).map(o => {
            let product = 'Link Order';
            try { if (o.product_link) product = new URL(o.product_link).hostname.split('.')[0]; } catch (e) { }
            return `<li>#LO-${o.id.toString().slice(-4)} (${formatDate(o.created_at)}) - ${product} - <span class="status-badge ${getStatusBadgeClass(o.order_status)}">${o.order_status.replace(/_/g, ' ')}</span> - ${formatCurrency(o.total)}</li>`;
        }).join('') || '<li>No recent orders found.</li>';

        const shipmentsHTML = (shipments || []).map(s => `<li>${s.tracking_number} (${formatDate(s.created_at)}) - <span class="status-badge ${getStatusBadgeClass(s.status)}">${s.status.replace(/_/g, ' ')}</span> - ${s.total_weight_kg ? `${s.total_weight_kg.toFixed(2)} kg` : 'N/A'}</li>`).join('') || '<li>No recent shipments found.</li>';

        document.getElementById('customer-details-content').innerHTML = `
            <div class="order-details-header">
                <h3>${customer.name} <span class="meta">(ID: ${customer.customer_unique_id})</span></h3>
                <p class="meta">Joined on ${formatDate(customer.created_at)}</p>
            </div>
            <div class="order-details-grid">
                <div class="detail-section">
                    <h4>Contact</h4>
                    <p><strong>Email:</strong> ${customer.email}</p>
                    <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${getStatusBadgeClass(customer.status)}">${customer.status}</span></p>
                </div>
                <div class="detail-section">
                    <h4>Activity</h4>
                    <p><strong>Total Orders:</strong> ${(orders || []).length} (showing recent 5)</p>
                    <p><strong>Total Shipments:</strong> ${(shipments || []).length} (showing recent 5)</p>
                </div>
                <div class="detail-section full-width">
                    <h4>Recent Order History</h4>
                    <ul class="status-history-list">${ordersHTML}</ul>
                </div>
                <div class="detail-section full-width">
                    <h4>Recent Shipment History</h4>
                    <ul class="status-history-list">${shipmentsHTML}</ul>
                </div>
            </div>`;
        openModal(document.getElementById('customer-details-modal'));
    };

    // --- SETTINGS ---
    const loadAllSettings = async () => {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (error) {
            alert("Could not load platform settings.");
            return;
        }

        if (document.getElementById('setting-store-name')) document.getElementById('setting-store-name').value = data.store_name || '';
        if (document.getElementById('setting-public-email')) document.getElementById('setting-public-email').value = data.public_email || '';
        if (document.getElementById('setting-public-phone')) document.getElementById('setting-public-phone').value = data.public_phone || '';
        if (document.getElementById('setting-warehouse-address')) document.getElementById('setting-warehouse-address').value = data.warehouse_address || '';

        const session = await getSession();
        if (document.getElementById('setting-admin-email')) document.getElementById('setting-admin-email').value = session?.user?.email || "";
        if (document.getElementById('maintenance-mode-toggle')) document.getElementById('maintenance-mode-toggle').checked = data.maintenance_mode;
    };

    // --- EVENT LISTENERS ---

    // Main Click Handler for Navigation & Modals
    document.addEventListener('click', async (e) => {
        const target = e.target;

        // Mobile Sidebar
        if (target.closest('#admin-hamburger')) openSidebar();
        if (target.closest('#mobile-overlay')) closeSidebar();

        // All Modal Close Buttons
        if (target.closest('.modal-close-btn')) closeModal(target.closest('.modal-overlay'));
        if (target.classList.contains('modal-overlay')) closeModal(target);

        // Sidebar Navigation
        const navLink = target.closest('#admin-sidebar-nav a, .nav-action-trigger');
        if (navLink && navLink.id !== 'admin-logout-btn') {
            const targetId = navLink.getAttribute('data-target');
            if (targetId) {
                e.preventDefault();
                navigateToTab(targetId);
            }
        }

        // Logout Button
        if (target.closest('#admin-logout-btn')) {
            e.preventDefault();
            await logoutAndRedirect('admin-login.html');
            return;
        }

        // Settings Sub-tabs Navigation
        const settingsLink = target.closest('.settings-nav a');
        if (settingsLink) {
            e.preventDefault();
            const targetId = settingsLink.dataset.target;
            document.querySelectorAll('.settings-nav a').forEach(l => l.classList.remove('active'));
            settingsLink.classList.add('active');
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(targetId)?.classList.add('active');
            window.history.pushState(null, '', `#${targetId}`);
        }

        // Customer buttons
        if (target.closest('#add-customer-btn')) { // This button is not in the HTML, but listener is here.
            e.preventDefault();
            handleAddCustomerClick();
        }
        if (target.closest('.edit-customer-btn')) {
            e.preventDefault();
            handleEditCustomer(target.closest('.edit-customer-btn').dataset.customerId);
        }
        if (target.closest('.view-customer-details-btn')) {
            e.preventDefault();
            openCustomerDetailsModal(target.closest('.view-customer-details-btn').dataset.customerId);
        }

        // Order Details Button
        if (target.closest('.view-order-details-btn')) {
            e.preventDefault();
            const orderId = target.closest('.view-order-details-btn').dataset.orderId;
            openOrderDetailsModal(orderId);
        }

        // Order Delete Button
        if (target.closest('.delete-order-btn')) {
            e.preventDefault();
            const orderId = target.closest('.delete-order-btn').dataset.orderId;
            handleDeleteOrder(orderId);
        }

        // Shipment buttons
        if (target.closest('.edit-shipment-btn')) {
            e.preventDefault();
            handleEditShipment(target.closest('.edit-shipment-btn').dataset.shipmentId);
        }

        // Shipment Delete Button
        if (target.closest('.delete-shipment-btn')) {
            e.preventDefault();
            const shipmentId = target.closest('.delete-shipment-btn').dataset.shipmentId;
            handleDeleteShipment(shipmentId);
        }

        // Announcement button
        if (target.closest('#add-announcement-btn')) {
            e.preventDefault();
            openAnnouncementModal();
        }

        // Announcement Toggle Button
        if (target.closest('.toggle-announcement-btn')) {
            e.preventDefault();
            const id = e.target.closest('.toggle-announcement-btn').dataset.id;
            const isActive = e.target.closest('.toggle-announcement-btn').dataset.active === 'true';

            const { error } = await supabase
                .from('announcements')
                .update({ is_active: !isActive })
                .eq('id', id);

            if (!error) {
                await renderAnnouncements();
                alert(`Announcement ${!isActive ? 'activated' : 'deactivated'} successfully!`);
            } else {
                alert('Failed to update announcement: ' + error.message);
            }
        }

        // Product Delete Button
        if (target.closest('.delete-product-btn')) {
            e.preventDefault();
            const productId = target.closest('.delete-product-btn').dataset.productId;
            if (confirm(`Are you sure you want to delete Product #${productId}? This cannot be undone.`)) {
                const { error } = await supabase.from('products').delete().eq('id', productId);
                if (error) {
                    alert("Error deleting product: " + error.message);
                } else {
                    alert("Product deleted.");
                    await renderProducts(true); // Force refresh
                }
            }
        }

        // Product Edit Button
        if (target.closest('.edit-product-btn')) {
            e.preventDefault();
            const productId = target.closest('.edit-product-btn').dataset.productId;
            // This is a placeholder, as the product modal logic is not fully implemented
            alert("Edit product functionality not fully implemented in this script.");
            // Example of what would go here:
            // await handleEditProduct(productId); 
        }
    });

    // Search/Filter Listeners
    document.getElementById('customer-search-input')?.addEventListener('input', displayCustomers);
    document.getElementById('order-search-input')?.addEventListener('input', displayOrders);
    document.getElementById('order-status-filter')?.addEventListener('change', displayOrders);
    document.getElementById('order-type-filter')?.addEventListener('change', displayOrders);
    document.getElementById('product-search-input')?.addEventListener('input', displayProducts);
    document.getElementById('product-status-filter')?.addEventListener('change', displayProducts);
    document.getElementById('product-category-filter')?.addEventListener('change', displayProducts);
    document.getElementById('shipment-search-input')?.addEventListener('input', displayShipments);
    document.getElementById('shipment-status-filter')?.addEventListener('change', displayShipments);

    // Table Status Change Listeners (using event delegation on the containers)
    document.getElementById('orders-table-container')?.addEventListener('change', async (e) => {
        const target = e.target;
        if (target.matches('.status-select, .payment-status-select')) {
            const orderId = target.dataset.orderId;
            const updateType = target.dataset.type; // 'order_status' or 'payment_status'
            if (!orderId || !updateType) return;

            const { error } = await supabase
                .from('orders')
                .update({ [updateType]: target.value })
                .eq('id', orderId);

            if (error) {
                alert('Failed to update status.');
                await renderOrders();
            } else {
                const cachedOrder = allOrders.find(o => o.id == orderId);
                if (cachedOrder) cachedOrder[updateType] = target.value;
                target.className = `status-select ${getStatusBadgeClass(target.value)}`;
            }
        }
    });

    document.getElementById('shipments-table-container')?.addEventListener('change', async (e) => {
        const target = e.target;
        if (target.matches('.status-select')) {
            const shipmentId = target.dataset.shipmentId;
            const updateType = target.dataset.type; // 'status'
            if (!shipmentId || !updateType) return;

            const { error } = await supabase.from('shipments').update({ [updateType]: target.value }).eq('id', shipmentId);
            if (error) {
                alert('Failed to update shipment status.');
                await renderShipments();
            } else {
                const cachedShipment = allShipments.find(s => s.id == shipmentId);
                if (cachedShipment) cachedShipment[updateType] = target.value;
                target.className = `status-select ${getStatusBadgeClass(target.value)}`;
            }
        }
    });

    document.getElementById('customers-table-container')?.addEventListener('change', async (e) => {
        const target = e.target;
        if (target.matches('.status-select') && target.dataset.customerId) {
            const customerId = target.dataset.customerId;
            const newStatus = target.value;

            const { error } = await supabase
                .from('customers')
                .update({ status: newStatus })
                .eq('id', customerId);

            if (error) {
                alert('Failed to update customer status: ' + error.message);
                await renderCustomers(true); // Force refresh on error
            } else {
                const cachedCustomer = allCustomers.find(c => c.id == customerId);
                if (cachedCustomer) cachedCustomer.status = newStatus;
                target.className = `status-select ${getStatusBadgeClass(newStatus)}`;
            }
        }
    });

    // Form Submissions
    document.getElementById('customer-form')?.addEventListener('submit', handleCustomerFormSubmit);
    document.getElementById('shipment-form')?.addEventListener('submit', handleShipmentFormSubmit);

    // Customer lookup for shipments
    document.getElementById('shipment-customer-unique-id')?.addEventListener('blur', async () => {
        const customerUniqueIdInput = document.getElementById('shipment-customer-unique-id');
        const uniqueId = customerUniqueIdInput.value.trim();
        const nameInput = document.getElementById('shipment-customerName');
        const contactInput = document.getElementById('shipment-customerContact');
        const uuidInput = document.getElementById('shipment-customer-uuid');
        const lookupStatus = document.getElementById('customer-lookup-status');

        nameInput.value = '';
        contactInput.value = '';
        uuidInput.value = '';
        lookupStatus.className = 'lookup-status';
        lookupStatus.textContent = '';

        if (!uniqueId) return;

        lookupStatus.textContent = 'Searching...';

        const { data: customer, error } = await supabase
            .from('customers')
            .select('id, name, email, phone')
            .eq('customer_unique_id', uniqueId)
            .single();

        if (customer) {
            lookupStatus.textContent = `✓ Customer Found: ${customer.name}`;
            lookupStatus.className = 'lookup-status success';
            nameInput.value = customer.name;
            contactInput.value = customer.phone || customer.email || 'N/A';
            uuidInput.value = customer.id;
        } else {
            lookupStatus.textContent = '✗ Customer not found.';
            lookupStatus.className = 'lookup-status error';
        }
    });

    // Settings form submissions
    document.getElementById('general-settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = {
            store_name: document.getElementById('setting-store-name').value,
            public_email: document.getElementById('setting-public-email').value,
            public_phone: document.getElementById('setting-public-phone').value,
            warehouse_address: document.getElementById('setting-warehouse-address').value
        };
        const { error } = await supabase.from('settings').update(updates).eq('id', 1);
        if (error) alert('Failed to save settings: ' + error.message);
        else alert('Settings saved!');
    });

    document.getElementById('admin-profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('setting-new-password').value;
        const confirmPassword = document.getElementById('setting-confirm-password').value;

        if (newPassword && newPassword !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        if (newPassword && newPassword.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        if (newPassword) {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                alert('Failed to change password: ' + error.message);
            } else {
                alert('Password updated! You will be logged out.');
                await logoutAndRedirect('admin-login.html');
            }
        } else {
            alert('No password entered. No changes made.');
        }
    });

    document.getElementById('save-advanced-settings-btn')?.addEventListener('click', async () => {
        const updates = {
            maintenance_mode: document.getElementById('maintenance-mode-toggle').checked
        };
        const { error } = await supabase.from('settings').update(updates).eq('id', 1);
        if (error) alert('Failed to save settings: ' + error.message);
        else alert('Settings saved!');
    });

    // --- Add Shipment Button Click ---
    const addShipmentBtn = document.getElementById('add-shipment-btn');
    if (addShipmentBtn) {
        addShipmentBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log("Add Shipment clicked!");

            editingShipmentId = null; // Ensure we are in "add" mode

            const modal = document.getElementById('shipment-form-modal');
            if (modal) {
                console.log("Opening modal...");

                const form = document.getElementById('shipment-form');
                if (form) form.reset();

                document.getElementById('shipment-modal-title').textContent = 'Add New Shipment';
                document.getElementById('shipment-trackingId').value = `TRK-${Date.now().toString().slice(-6)}`;
                document.getElementById('shipment-customer-uuid').value = '';

                const lookupStatus = document.getElementById('customer-lookup-status');
                if (lookupStatus) {
                    lookupStatus.textContent = '';
                    lookupStatus.className = 'lookup-status';
                }

                openModal(modal);
            } else {
                console.error("Modal not found!");
            }
        });
    }

    // --- Add Product Button Click ---
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', (e) => {
            e.preventDefault();
            editingProductId = null;
            document.getElementById('product-form').reset();
            document.getElementById('product-modal-title').textContent = 'Add New Product';
            document.getElementById('product-sku').value = `SKU-${Date.now().toString().slice(-8)}`;
            document.getElementById('product-image-preview').src = 'https://placehold.co/150x150/e9ecef/6c757d?text=No+Image';
            openModal(document.getElementById('add-product-modal'));
        });
    }

    // --- Product Form Submission (Add/Edit) ---
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // This is a placeholder
            alert('Product saving logic not fully implemented in this example.');
            // Implement save logic here
            // ...
            // After saving:
            // closeModal(document.getElementById('add-product-modal'));
            // await renderProducts(true);
        });
    }

    // --- INITIAL PAGE LOAD ---
    (async () => {
        console.log("Admin.js initialization starting...");
        // Check hash on load to go to the correct tab
        const initialAdminHash = window.location.hash.substring(1).split('-panel')[0];
        const tabName = initialAdminHash.replace("#", "");
        let targetTab = 'dashboard-view'; // Default

        if (tabName) {
            if (tabName.includes('settings')) {
                targetTab = 'settings-view';
            } else if (document.getElementById(tabName)) {
                targetTab = tabName;
            } else if (document.getElementById(`${tabName}-view`)) {
                targetTab = `${tabName}-view`;
            }
        }

        await navigateToTab(targetTab);
        console.log("Admin.js initialization complete.");
    })();
});