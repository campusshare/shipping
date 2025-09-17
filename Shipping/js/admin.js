import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- CORE APP STATE & ELEMENTS ---
    const body = document.body;
    const allNavTriggers = document.querySelectorAll('#admin-sidebar-nav a, .nav-action-trigger');
    const contentPanels = document.querySelectorAll('.content-panel');
    const mobileHeaderTitle = document.getElementById('admin-header-title');
    let ordersChart = null;

    async function navigateToTab(targetId, filter = {}) {
        document.querySelectorAll('#admin-sidebar-nav a').forEach(l => l.classList.remove('active'));
        const sidebarLink = document.querySelector(`#admin-sidebar-nav a[data-target="${targetId}"]`);
        if (sidebarLink) { sidebarLink.classList.add('active'); if (mobileHeaderTitle) mobileHeaderTitle.textContent = sidebarLink.querySelector('span').textContent; }
        contentPanels.forEach(p => p.classList.remove('active'));
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            if (targetId === 'dashboard-view') { await renderDashboard(); } 
            else if (targetId === 'orders-view') { await renderOrders(); } 
            else if (targetId === 'products-view') { await renderProducts(); } 
            else if (targetId === 'shipments-view') { await renderShipments(); }
            else if (targetId === 'customers-view') { await renderCustomers(); }
            else if (targetId === 'settings-view') { 
                await loadAllSettings();
                const settingsNavLinks = document.querySelectorAll('.settings-nav a');
                const settingsPanels = document.querySelectorAll('.settings-panel');
                settingsNavLinks.forEach(link => { 
                    link.addEventListener('click', e => { 
                        e.preventDefault(); 
                        const subTargetId = link.dataset.target; 
                        settingsNavLinks.forEach(l => l.classList.remove('active')); 
                        link.classList.add('active'); 
                        settingsPanels.forEach(p => p.id === subTargetId ? p.classList.add('active') : p.classList.remove('active')); 
                    }); 
                });
            }
        }
        if (targetId === 'orders-view' && filter.status) {
            const filterDropdown = document.getElementById('order-status-filter');
            if (filterDropdown) filterDropdown.value = filter.status;
            await renderOrders();
        }
        if (targetId === 'shipments-view' && filter.status) {
            const filterDropdown = document.getElementById('shipment-status-filter');
            if(filterDropdown) filterDropdown.value = filter.status;
            await renderShipments();
        }
        closeSidebar();
    }
    const mobileHamburger = document.getElementById('admin-hamburger');
    const mobileOverlay = document.getElementById('mobile-overlay');
    function openSidebar() { body.classList.add('sidebar-open'); }
    function closeSidebar() { body.classList.remove('sidebar-open'); }
    if (mobileHamburger) mobileHamburger.addEventListener('click', openSidebar);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeSidebar);
    allNavTriggers.forEach(link => { 
        link.addEventListener('click', async (e) => { 
            e.preventDefault(); 
            const targetId = link.getAttribute('data-target'); 
            if (link.href && link.href.includes('admin-login.html')) {
                await supabase.auth.signOut();
                window.location.href = 'admin-login.html';
                return;
            }
            if (!targetId) { return; } 
            navigateToTab(targetId); 
        }); 
    });
    function openModal(modal) { if (modal) { modal.classList.add('active'); body.classList.add('modal-open'); } }
    function closeModal(modal) { if (modal) { modal.classList.remove('active'); body.classList.remove('modal-open'); } }

    async function renderDashboard() {
        const [ { data: ordersData }, { data: shipmentsData }, { data: productsData } ] = await Promise.all([
            supabase.from('orders').select('created_at, total, order_status'),
            supabase.from('shipments').select('status'),
            supabase.from('products').select('id, name, sku, stock')
        ]);
        const orders = ordersData || [];
        const shipments = shipmentsData || [];
        const products = productsData || [];
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const newOrdersCount = orders.filter(o => new Date(o.created_at).toDateString() === today.toDateString()).length;
        const monthlyRevenue = orders.filter(o => new Date(o.created_at) >= firstDayOfMonth).reduce((sum, order) => sum + order.total, 0);
        const pendingActionsCount = orders.filter(o => o.order_status === 'pending').length;
        const warehousePackagesCount = shipments.filter(s => s.status === 'in-warehouse').length;
        document.querySelector('[data-stat="new-orders"] .value').textContent = newOrdersCount;
        document.querySelector('[data-stat="pending-actions"] .value').textContent = pendingActionsCount;
        document.querySelector('[data-stat="warehouse-packages"] .value').textContent = warehousePackagesCount;
        document.querySelector('.stat-card:not([data-stat]) .value').textContent = `₵${monthlyRevenue.toLocaleString()}`;
        const LOW_STOCK_THRESHOLD = 10;
        const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < LOW_STOCK_THRESHOLD);
        const alertListContainer = document.querySelector('#dashboard-view .alert-list');
        if (lowStockProducts.length > 0) {
            alertListContainer.innerHTML = lowStockProducts.map(p => `<div class="alert-item"><div class="alert-info"><strong>${p.name}</strong><span class="meta">SKU: ${p.sku}</span></div><div class="alert-stock">${p.stock} left</div><button class="btn btn-secondary btn-sm restock-btn" data-product-id="${p.id}">Restock</button></div>`).join('');
        } else {
            alertListContainer.innerHTML = `<p class="meta" style="text-align: center; padding: 1rem;">No low stock alerts.</p>`;
        }
        document.querySelectorAll('.restock-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.currentTarget.dataset.productId;
                navigateToTab('products-view');
                setTimeout(() => { handleEditProduct(productId); }, 50); 
            });
        });
    }
    document.querySelectorAll('.stat-card[data-stat]').forEach(card => {
        card.addEventListener('click', () => {
            const statType = card.dataset.stat;
            if (statType === 'new-orders') navigateToTab('orders-view');
            if (statType === 'pending-actions') navigateToTab('orders-view', { status: 'pending' });
            if (statType === 'warehouse-packages') navigateToTab('shipments-view', { status: 'in-warehouse' });
        });
    });
    
    // --- ORDERS LOGIC ---
    const ordersTableContainer = document.getElementById('orders-table-container');
    const orderSearchInput = document.getElementById('order-search-input');
    const orderStatusFilter = document.getElementById('order-status-filter');
    const orderTypeFilter = document.getElementById('order-type-filter');
    const orderDetailsModal = document.getElementById('order-details-modal');
    const closeOrderDetailsModalBtn = document.getElementById('close-order-details-modal');
    const orderDetailsContent = document.getElementById('order-details-content');
    async function renderOrders() {
        if (!ordersTableContainer) return;
        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (orderSearchInput.value) { query = query.ilike('customer_name', `%${orderSearchInput.value}%`); }
        if (orderStatusFilter.value !== 'all') { query = query.eq('order_status', orderStatusFilter.value); }
        if (orderTypeFilter.value !== 'all') { query = query.eq('type', orderTypeFilter.value); }
        const { data: orders, error } = await query;
        if (error) { console.error("Error fetching orders:", error); return; }
        const tableHTML = `<div class="table-header"><div>Order ID</div><div>Customer</div><div>Date</div><div>Total</div><div>Payment</div><div>Status</div><div></div></div> ${orders.map(order => `<div class="table-row"><div><span class="order-type-${order.type}">${order.type.toUpperCase()}</span>#${order.id}</div><div>${order.customer_name}</div><div>${new Date(order.created_at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}</div><div>₵${order.total.toFixed(2)}</div><div><span class="payment-badge payment-${order.payment_status}">${order.payment_status}</span></div><div><select class="status-select status-${order.order_status}" data-order-id="${order.id}"><option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option><option value="purchased" ${order.order_status === 'purchased' ? 'selected' : ''}>Purchased</option><option value="in-transit" ${order.order_status === 'in-transit' ? 'selected' : ''}>In Transit</option><option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option></select></div><div><button class="btn btn-secondary btn-sm view-order-details-btn" data-order-id="${order.id}">Details</button></div></div>`).join('') || `<div class="table-row">No orders found.</div>`} `;
        ordersTableContainer.innerHTML = tableHTML;
        document.querySelectorAll('#orders-view .view-order-details-btn').forEach(btn => btn.addEventListener('click', (e) => openOrderDetailsModal(e.currentTarget.dataset.orderId)));
        document.querySelectorAll('#orders-view .status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const newStatus = e.target.value;
                const orderId = e.target.dataset.orderId;
                const { error } = await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId);
                if (error) { alert('Failed to update order status.'); }
                else { e.target.className = `status-select status-${newStatus}`; }
            });
        });
    }
    async function openOrderDetailsModal(orderId) {
        const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (error) { alert('Could not fetch order details'); return; }
        const itemsHTML = (order.items || []).map(item => `<div class="order-item"><div class="item-info"><strong>${item.name}</strong> (x${item.qty}) ${item.link ? `<a href="${item.link}" target="_blank" class="procurement-link">View Link</a>` : ''} ${item.notes ? `<p class="procurement-notes">Notes: ${item.notes}</p>` : ''}</div><div class="item-price">₵${(item.price * item.qty).toFixed(2)}</div></div>`).join('');
        orderDetailsContent.innerHTML = `<div class="order-details-header"><h3>Order Details: #${order.id}</h3></div><div class="order-details-grid"><div class="detail-section"><h4>Customer</h4><p><strong>Name:</strong> ${order.customer_name}</p></div><div class="detail-section"><h4>Financials</h4><p><strong>Total:</strong> ₵${order.total.toFixed(2)}</p><p><strong>Payment:</strong> ${order.payment_status}</p></div><div class="detail-section" style="grid-column: 1 / -1;"><h4>Items</h4><div class="order-items-list">${itemsHTML}</div></div></div>`;
        openModal(orderDetailsModal);
    }
    if (orderSearchInput) orderSearchInput.addEventListener('input', () => renderOrders());
    if (orderStatusFilter) orderStatusFilter.addEventListener('change', () => renderOrders());
    if (orderTypeFilter) orderTypeFilter.addEventListener('change', () => renderOrders());
    if (closeOrderDetailsModalBtn) closeOrderDetailsModalBtn.addEventListener('click', () => closeModal(orderDetailsModal));
    if (orderDetailsModal) orderDetailsModal.addEventListener('click', (e) => { if (e.target === orderDetailsModal) closeModal(orderDetailsModal); });

    // --- PRODUCTS LOGIC ---
    let editingProductId = null;
    const productsTableContainer = document.getElementById('products-table-container');
    const productSearchInput = document.getElementById('product-search-input');
    const productStatusFilter = document.getElementById('product-status-filter');
    const productCategoryFilter = document.getElementById('product-category-filter');
    const addProductModal = document.getElementById('add-product-modal');
    const closeProductModalBtn = document.getElementById('close-product-modal');
    const productForm = document.getElementById('product-form');
    async function renderProducts() {
        if (!productsTableContainer) return;
        let query = supabase.from('products').select('*').order('created_at', { ascending: false });
        if (productSearchInput.value) { query = query.ilike('name', `%${productSearchInput.value}%`); }
        if (productStatusFilter.value !== 'all') { query = query.eq('status', productStatusFilter.value); }
        if (productCategoryFilter.value !== 'all') { query = query.eq('category', productCategoryFilter.value); }
        const { data: products, error } = await query;
        if (error) { console.error("Error fetching products:", error); productsTableContainer.innerHTML = `<p>Error loading products.</p>`; return; }
        const tableHTML = `<div class="table-header"><div>Image</div><div>Name</div><div>SKU</div><div>Price</div><div>Stock</div><div>Status</div><div></div></div> ${products.map(product => `<div class="table-row"><div><img src="${product.image}" alt="${product.name}" class="table-img"></div><div>${product.name}</div><div>${product.sku}</div><div>₵${product.price.toFixed(2)}</div><div>${product.stock} ${product.stock < 10 && product.stock > 0 ? '<span class="attention-icon"><i class="fas fa-exclamation-triangle"></i></span>' : ''}</div><div><span class="status-badge ${product.status === 'active' ? 'status-delivered' : 'status-inactive'}">${product.status.charAt(0).toUpperCase() + product.status.slice(1)}</span></div><div><button class="btn btn-secondary btn-sm edit-product-btn" data-product-id="${product.id}">Edit</button><button class="btn btn-secondary btn-sm delete-product-btn" data-product-id="${product.id}"><i class="fas fa-trash"></i></button></div></div>`).join('') || `<div class="table-row" style="text-align: center; grid-column: 1 / -1;">No products found.</div>`} `;
        productsTableContainer.innerHTML = tableHTML;
        document.querySelectorAll('#products-view .edit-product-btn').forEach(btn => btn.addEventListener('click', (e) => handleEditProduct(e.currentTarget.dataset.productId)));
        document.querySelectorAll('#products-view .delete-product-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteProduct(e.currentTarget.dataset.productId)));
        
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', handleAddProductClick);
        }
    }
    async function handleEditProduct(productId) {
        const { data: product, error } = await supabase.from('products').select('*').eq('id', productId).single();
        if (error) { alert('Could not fetch product details.'); console.error(error); return; }
        editingProductId = productId;
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-name').value = product.name; document.getElementById('product-sku').value = product.sku;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-status').value = product.status;
        document.getElementById('product-image-preview').src = product.image || 'https://placehold.co/150x150/e9ecef/6c757d?text=No+Image';
        document.getElementById('product-name').removeEventListener('input', updateSkuField); document.getElementById('product-category').removeEventListener('change', updateSkuField);
        document.getElementById('regenerate-sku-btn').style.display = 'none';
        openModal(addProductModal);
    }
    async function handleDeleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (error) { alert('Error deleting product: ' + error.message); }
            else { await renderProducts(); }
        }
    }
    async function handleProductFormSubmit(e) {
        e.preventDefault();
        const productData = {
            name: document.getElementById('product-name').value, description: document.getElementById('product-description').value,
            sku: document.getElementById('product-sku').value, category: document.getElementById('product-category').value,
            price: parseFloat(document.getElementById('product-price').value), stock: parseInt(document.getElementById('product-stock').value),
            status: document.getElementById('product-status').value, image: document.getElementById('product-image-preview').src
        };
        let result;
        if (editingProductId) {
            result = await supabase.from('products').update(productData).eq('id', editingProductId);
        } else {
            result = await supabase.from('products').insert([productData]);
        }
        if (result.error) { alert('Error saving product: ' + result.error.message); }
        else { closeModal(addProductModal); await renderProducts(); }
    }
    function generateUniqueSku() {
        const name = document.getElementById('product-name').value.trim(); const category = document.getElementById('product-category').value; if (!name || !category) return "";
        const catPrefix = category.substring(0, 4).toUpperCase(); const namePrefix = name.split(' ')[0].substring(0, 3).toUpperCase();
        const uniquePart = String(Date.now()).slice(-6);
        return `${catPrefix}-${namePrefix}-${uniquePart}`;
    }
    function handleAddProductClick() {
        editingProductId = null; document.getElementById('product-modal-title').textContent = 'Add New Product';
        productForm.reset(); document.getElementById('product-image-preview').src = 'https://placehold.co/150x150/e9ecef/6c757d?text=No+Image';
        document.getElementById('product-name').addEventListener('input', updateSkuField); document.getElementById('product-category').addEventListener('change', updateSkuField);
        document.getElementById('regenerate-sku-btn').style.display = 'inline-flex'; document.getElementById('product-sku').value = 'Enter Name/Category';
        openModal(addProductModal);
    }
    function updateSkuField() { if (editingProductId === null) { document.getElementById('product-sku').value = generateUniqueSku(); } }
    function handleImagePreview(e) { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { document.getElementById('product-image-preview').src = event.target.result; }; reader.readAsDataURL(file); } }
    if (productSearchInput) productSearchInput.addEventListener('input', () => renderProducts());
    if (productStatusFilter) productStatusFilter.addEventListener('change', () => renderProducts());
    if (productCategoryFilter) productCategoryFilter.addEventListener('change', () => renderProducts());
    if (productForm) productForm.addEventListener('submit', handleProductFormSubmit);
    if (document.getElementById('regenerate-sku-btn')) document.getElementById('regenerate-sku-btn').addEventListener('click', updateSkuField);
    if (document.getElementById('product-image')) document.getElementById('product-image').addEventListener('change', handleImagePreview);
    if (closeProductModalBtn) closeProductModalBtn.addEventListener('click', () => closeModal(addProductModal));
    if (addProductModal) addProductModal.addEventListener('click', (e) => { if (e.target === addProductModal) closeModal(addProductModal); });
    
    // --- SHIPMENTS LOGIC ---
    const shipmentsTableContainer = document.getElementById('shipments-table-container');
    const shipmentSearchInput = document.getElementById('shipment-search-input');
    const shipmentStatusFilter = document.getElementById('shipment-status-filter');
    const addShipmentBtn = document.getElementById('add-shipment-btn');
    const shipmentForm = document.getElementById('shipment-form');
    const shipmentFormModal = document.getElementById('shipment-form-modal');
    const closeShipmentFormModalBtn = document.getElementById('close-shipment-form-modal');
    const shipmentDetailsModal = document.getElementById('shipment-details-modal');
    const closeShipmentDetailsModalBtn = document.getElementById('close-shipment-details-modal');
    const shipmentDetailsContent = document.getElementById('shipment-details-content');
    async function renderShipments() {
        if (!shipmentsTableContainer) return;
        let query = supabase.from('shipments').select('*').order('created_at', { ascending: false });
        if (shipmentSearchInput.value) { query = query.or(`tracking_id.ilike.%${shipmentSearchInput.value}%,customer_name.ilike.%${shipmentSearchInput.value}%`); }
        if (shipmentStatusFilter.value !== 'all') { query = query.eq('status', shipmentStatusFilter.value); }
        const { data: shipments, error } = await query;
        if (error) { console.error("Error fetching shipments:", error); return; }
        const tableHTML = `<div class="table-header"><div>Tracking #</div><div>Customer</div><div>Date Booked</div><div>Method</div><div>Weight</div><div>Cost</div><div>Status</div><div></div></div> ${shipments.map(s => `<div class="table-row"><div><strong>${s.tracking_id}</strong></div><div>${s.customer_name}</div><div>${new Date(s.created_at).toLocaleDateString('en-GB')}</div><div><i class="fas fa-${s.method === 'air' ? 'plane' : 'ship'}"></i> ${s.method === 'air' ? 'Air' : 'Sea'}</div><div>${s.weight} kg</div><div>₵${s.shipping_cost.toFixed(2)}</div><div><select class="status-select status-${s.status}" data-shipment-id="${s.id}"><option value="awaiting-arrival" ${s.status === 'awaiting-arrival' ? 'selected' : ''}>Awaiting</option><option value="in-warehouse" ${s.status === 'in-warehouse' ? 'selected' : ''}>Warehouse</option><option value="in-transit" ${s.status === 'in-transit' ? 'selected' : ''}>Transit</option><option value="customs" ${s.status === 'customs' ? 'selected' : ''}>Customs</option><option value="ready-for-pickup" ${s.status === 'ready-for-pickup' ? 'selected' : ''}>Ready</option><option value="delivered" ${s.status === 'delivered' ? 'selected' : ''}>Delivered</option></select></div><div><button class="btn btn-secondary btn-sm view-shipment-details-btn" data-shipment-id="${s.id}">Details</button></div></div>`).join('') || `<div class="table-row">No shipments found.</div>`} `;
        shipmentsTableContainer.innerHTML = tableHTML;
        document.querySelectorAll('#shipments-view .view-shipment-details-btn').forEach(btn => { btn.addEventListener('click', (e) => openShipmentDetailsModal(e.currentTarget.dataset.shipmentId)); });
        document.querySelectorAll('#shipments-view .status-select').forEach(select => { 
            select.addEventListener('change', async (e) => { 
                const newStatus = e.target.value; 
                const shipmentId = e.target.dataset.shipmentId; 
                const { error } = await supabase.from('shipments').update({ status: newStatus }).eq('id', shipmentId); 
                if(error) { 
                    alert('Failed to update status.'); 
                    await renderShipments(); 
                } else { 
                    e.target.className = `status-select status-${newStatus}`; 
                    console.log(`Shipment ID ${shipmentId} updated to ${newStatus}`);
                }
            }); 
        });
    }
    async function handleShipmentFormSubmit(e) {
        e.preventDefault();
        const shipmentData = { tracking_id: document.getElementById('shipment-trackingId').value, customer_name: document.getElementById('shipment-customerName').value, customer_contact: document.getElementById('shipment-customerContact').value, method: document.getElementById('shipment-method').value, weight: parseFloat(document.getElementById('shipment-weight').value), shipping_cost: parseFloat(document.getElementById('shipment-shippingCost').value), description: document.getElementById('shipment-description').value, delivery_address: document.getElementById('shipment-deliveryAddress').value, status: 'awaiting-arrival' };
        const { error } = await supabase.from('shipments').insert([shipmentData]).select();
        if (error) { alert('Error creating shipment: ' + error.message); }
        else { closeModal(shipmentFormModal); await renderShipments(); }
    }
    async function openShipmentDetailsModal(shipmentId) {
        const { data: shipment, error } = await supabase.from('shipments').select('*').eq('id', shipmentId).single();
        if (error) { alert('Could not fetch shipment details.'); return; }
        const detailsHTML = `<div class="order-details-header"><h3>Shipment: ${shipment.tracking_id}</h3><p class="meta">Booked on ${new Date(shipment.created_at).toLocaleDateString('en-GB')}</p></div><div class="order-details-grid"><div class="detail-section"><h4>Customer & Delivery</h4><p><strong>Name:</strong> ${shipment.customer_name}</p><p><strong>Contact:</strong> ${shipment.customer_contact}</p><p><strong>Address:</strong> ${shipment.delivery_address}</p></div><div class="detail-section"><h4>Shipment Info</h4><p><strong>Method:</strong> ${shipment.method === 'air' ? 'Air Freight' : 'Sea Freight'}</p><p><strong>Weight:</strong> ${shipment.weight} kg</p><p><strong>Cost:</strong> ₵${shipment.shipping_cost.toFixed(2)}</p><p><strong>Description:</strong> ${shipment.description}</p></div></div>`;
        shipmentDetailsContent.innerHTML = detailsHTML;
        openModal(shipmentDetailsModal);
    }
    if(shipmentSearchInput) shipmentSearchInput.addEventListener('input', () => renderShipments());
    if(shipmentStatusFilter) shipmentStatusFilter.addEventListener('change', () => renderShipments());
    if(addShipmentBtn) addShipmentBtn.addEventListener('click', () => { document.getElementById('shipment-modal-title').textContent = 'Add New Shipment'; shipmentForm.reset(); document.getElementById('shipment-trackingId').value = `SSW${Date.now().toString().slice(-6)}`; openModal(shipmentFormModal); });
    if(shipmentForm) shipmentForm.addEventListener('submit', handleShipmentFormSubmit);
    if(closeShipmentFormModalBtn) closeShipmentFormModalBtn.addEventListener('click', () => closeModal(shipmentFormModal));
    if(shipmentFormModal) shipmentFormModal.addEventListener('click', e => { if(e.target === shipmentFormModal) closeModal(shipmentFormModal); });
    if(closeShipmentDetailsModalBtn) closeShipmentDetailsModalBtn.addEventListener('click', () => closeModal(shipmentDetailsModal));
    if(shipmentDetailsModal) shipmentDetailsModal.addEventListener('click', e => { if(e.target === shipmentDetailsModal) closeModal(shipmentDetailsModal); });
    
    // --- CUSTOMERS LOGIC ---
    let editingCustomerId = null;
    const customersTableContainer = document.getElementById('customers-table-container');
    const customerSearchInput = document.getElementById('customer-search-input');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const customerFormModal = document.getElementById('customer-form-modal');
    const closeCustomerFormModalBtn = document.getElementById('close-customer-form-modal');
    const customerForm = document.getElementById('customer-form');
    const customerDetailsModal = document.getElementById('customer-details-modal');
    const closeCustomerDetailsModalBtn = document.getElementById('close-customer-details-modal');
    const customerDetailsContent = document.getElementById('customer-details-content');
    async function renderCustomers() {
        if (!customersTableContainer) return;
        let query = supabase.from('customers').select('*', { count: 'exact' });
        if (customerSearchInput.value) { query = query.or(`name.ilike.%${customerSearchInput.value}%,email.ilike.%${customerSearchInput.value}%`); }
        const { data: customers, error } = await query;
        if (error) { console.error("Error fetching customers:", error); return; }
        const tableHTML = `<div class="table-header"><div>Customer</div><div>Date Joined</div><div>Status</div><div></div></div> ${customers.map(customer => `<div class="table-row"><div><strong>${customer.name}</strong><br><span class="meta">${customer.email}</span></div><div>${new Date(customer.created_at).toLocaleDateString('en-GB')}</div><div><span class="status-badge ${customer.status === 'active' ? 'status-delivered' : 'status-inactive'}">${customer.status}</span></div><div><button class="btn btn-secondary btn-sm edit-customer-btn" data-customer-id="${customer.id}">Edit</button><button class="btn btn-secondary btn-sm view-customer-details-btn" data-customer-id="${customer.id}">Profile</button></div></div>`).join('') || `<div class="table-row">No customers found.</div>`} `;
        customersTableContainer.innerHTML = tableHTML;
        document.querySelectorAll('#customers-view .edit-customer-btn').forEach(btn => btn.addEventListener('click', e => handleEditCustomer(e.currentTarget.dataset.customerId)));
        document.querySelectorAll('#customers-view .view-customer-details-btn').forEach(btn => btn.addEventListener('click', e => openCustomerDetailsModal(e.currentTarget.dataset.customerId)));
    }
    async function handleEditCustomer(customerId) {
        const { data: customer, error } = await supabase.from('customers').select('*').eq('id', customerId).single();
        if (error) { alert('Could not fetch customer details'); return; }
        editingCustomerId = customerId;
        document.getElementById('customer-modal-title').textContent = 'Edit Customer';
        document.getElementById('customer-name').value = customer.name; document.getElementById('customer-email').value = customer.email;
        document.getElementById('customer-phone').value = customer.phone; document.getElementById('customer-status').value = customer.status;
        document.getElementById('customer-password').value = ""; document.getElementById('customer-password').placeholder = "Leave blank to keep unchanged";
        openModal(customerFormModal);
    }
    async function openCustomerDetailsModal(customerId) {
        const { data: customer, error: customerError } = await supabase.from('customers').select('*').eq('id', customerId).single();
        if (customerError) { alert('Could not fetch customer details.'); return; }
        
        // We need to fetch orders and shipments related to this customer.
        // This is a placeholder as we don't have an 'orders' table with customer names yet.
        const { data: customerShipments } = await supabase.from('shipments').select('tracking_id, status').eq('customer_name', customer.name);
        
        const ordersHTML = '<li>Order history requires the orders table.</li>';
        const shipmentsHTML = (customerShipments || []).map(s => `<li>${s.tracking_id} - ${s.status}</li>`).join('') || '<li>No shipments found.</li>';
        
        const detailsHTML = `
            <div class="order-details-header"><h3>${customer.name}</h3><p class="meta">Joined on ${new Date(customer.created_at).toLocaleDateString('en-GB')}</p></div>
            <div class="order-details-grid">
                <div class="detail-section"><h4>Contact Information</h4>
                    <p><strong>Email:</strong> ${customer.email}</p>
                    <p><strong>Phone:</strong> ${customer.phone}</p>
                    <p><strong>Status:</strong> ${customer.status}</p>
                </div>
                 <div class="detail-section"><h4>Activity Summary</h4>
                    <p><strong>Total Orders:</strong> 0</p> <!-- Placeholder -->
                    <p><strong>Total Shipments:</strong> ${(customerShipments || []).length}</p>
                </div>
                <div class="detail-section" style="grid-column: 1 / -1;"><h4>Order History</h4><ul class="status-history-list">${ordersHTML}</ul></div>
                <div class="detail-section" style="grid-column: 1 / -1;"><h4>Shipment History</h4><ul class="status-history-list">${shipmentsHTML}</ul></div>
            </div>`;
        customerDetailsContent.innerHTML = detailsHTML;
        openModal(customerDetailsModal);
    }
    async function handleCustomerFormSubmit(e) {
        e.preventDefault();
        const customerData = { name: document.getElementById('customer-name').value, email: document.getElementById('customer-email').value, phone: document.getElementById('customer-phone').value, status: document.getElementById('customer-status').value };
        let result;
        if (editingCustomerId) {
            result = await supabase.from('customers').update(customerData).eq('id', editingCustomerId);
        } else {
            const { data: existingCustomer } = await supabase.from('customers').select('id').eq('email', customerData.email).single();
            if (existingCustomer) { alert('Error: A customer with this email address already exists.'); return; }
            result = await supabase.from('customers').insert([customerData]);
        }
        if (result.error) { alert('Error saving customer: ' + result.error.message); }
        else { closeModal(customerFormModal); await renderCustomers(); }
    }
    if(customerSearchInput) customerSearchInput.addEventListener('input', () => renderCustomers());
    if(addCustomerBtn) addCustomerBtn.addEventListener('click', () => { editingCustomerId = null; document.getElementById('customer-modal-title').textContent = 'Add New Customer'; customerForm.reset(); document.getElementById('customer-password').placeholder = "Set a temporary password"; openModal(customerFormModal); });
    if(customerForm) customerForm.addEventListener('submit', handleCustomerFormSubmit);
    if(closeCustomerFormModalBtn) closeCustomerFormModalBtn.addEventListener('click', () => closeModal(customerFormModal));
    if(customerFormModal) customerFormModal.addEventListener('click', e => { if(e.target === customerFormModal) closeModal(customerFormModal); });
    if(closeCustomerDetailsModalBtn) closeCustomerDetailsModalBtn.addEventListener('click', () => closeModal(customerDetailsModal));
    if(customerDetailsModal) customerDetailsModal.addEventListener('click', e => { if(e.target === customerDetailsModal) closeModal(customerDetailsModal); });

        // --- SETTINGS LOGIC (LIVE FROM SUPABASE W/ EDITABLE RATES) ---
    let isEditingRates = false;
    const settingsNavLinks = document.querySelectorAll('.settings-nav a');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    const shippingRatesTable = document.getElementById('shipping-rates-table');
    const addShippingRateBtn = document.getElementById('add-shipping-rate-btn');

    async function loadAllSettings() {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (error || !data) {
            console.error("Error loading settings:", error);
            alert("Could not load platform settings from the database.");
            return;
        }
        // General
        document.getElementById('setting-store-name').value = data.store_name;
        document.getElementById('setting-public-email').value = data.public_email;
        document.getElementById('setting-public-phone').value = data.public_phone;
        document.getElementById('setting-warehouse-address').value = data.warehouse_address;
        
        // Shipping Rates - Pass the live data to the renderer
        renderShippingRates(data);
        
        // Profile
        document.getElementById('setting-admin-email').value = "admin@c2gmall.com";
        
        // Advanced
        document.getElementById('maintenance-mode-toggle').checked = data.maintenance_mode;
    }

    function renderShippingRates(settingsData) {
        if (!shippingRatesTable) return;
        addShippingRateBtn.style.display = 'none'; // Keep add button hidden
        
        let tableHTML = `<div class="table-header"><div>Method</div><div>Rate per kg (₵)</div><div>Base Fee (₵)</div><div></div></div>`;

        if (isEditingRates) {
            // Render EDITABLE rows
            tableHTML += `
            <div class="table-row">
                <div>Air Freight</div>
                <div><input type="number" id="edit-air-rate" value="${settingsData.air_rate_per_kg.toFixed(2)}" step="0.01"></div>
                <div><input type="number" id="edit-air-fee" value="${settingsData.air_base_fee.toFixed(2)}" step="0.01"></div>
                <td class="inline-actions">
                    <!-- Placeholder, as save is now global -->
                </td>
            </div>
            <div class="table-row">
                <div>Sea Freight</div>
                <div><input type="number" id="edit-sea-rate" value="${settingsData.sea_rate_per_kg.toFixed(2)}" step="0.01"></div>
                <div><input type="number" id="edit-sea-fee" value="${settingsData.sea_base_fee.toFixed(2)}" step="0.01"></div>
                <td class="inline-actions">
                    <!-- Placeholder -->
                </td>
            </div>
            <div style="text-align: right; margin-top: 15px;">
                <button class="btn btn-secondary" id="cancel-rate-edit-btn">Cancel</button>
                <button class="btn btn-primary" id="save-rate-edit-btn">Save Rates</button>
            </div>
            `;
        } else {
            // Render READ-ONLY rows
            tableHTML += `
            <div class="table-row">
                <div>Air Freight</div>
                <div>${settingsData.air_rate_per_kg.toFixed(2)}</div>
                <div>${settingsData.air_base_fee.toFixed(2)}</div>
                <td></td>
            </div>
            <div class="table-row">
                <div>Sea Freight</div>
                <div>${settingsData.sea_rate_per_kg.toFixed(2)}</div>
                <div>${settingsData.sea_base_fee.toFixed(2)}</div>
                <td></td>
            </div>
             <div style="text-align: right; margin-top: 15px;">
                <button class="btn btn-primary" id="edit-rates-btn">Edit Rates</button>
            </div>
            `;
        }

        shippingRatesTable.innerHTML = tableHTML;
        attachShippingRateListeners();
    }

    function attachShippingRateListeners() {
        const editBtn = document.getElementById('edit-rates-btn');
        const cancelBtn = document.getElementById('cancel-rate-edit-btn');
        const saveBtn = document.getElementById('save-rate-edit-btn');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                isEditingRates = true;
                loadAllSettings(); // Reload settings to re-render in edit mode
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                isEditingRates = false;
                loadAllSettings(); // Reload settings to re-render in read-only mode
            });
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const updates = {
                    air_rate_per_kg: parseFloat(document.getElementById('edit-air-rate').value) || 0,
                    air_base_fee: parseFloat(document.getElementById('edit-air-fee').value) || 0,
                    sea_rate_per_kg: parseFloat(document.getElementById('edit-sea-rate').value) || 0,
                    sea_base_fee: parseFloat(document.getElementById('edit-sea-fee').value) || 0
                };

                const { error } = await supabase.from('settings').update(updates).eq('id', 1);

                if (error) {
                    alert('Failed to save shipping rates: ' + error.message);
                } else {
                    alert('Shipping rates saved successfully!');
                    isEditingRates = false;
                    await loadAllSettings(); // Reload settings to show saved data
                }
            });
        }
    }

    settingsNavLinks.forEach(link => { 
        link.addEventListener('click', e => { 
            e.preventDefault(); 
            const targetId = link.dataset.target; 
            settingsNavLinks.forEach(l => l.classList.remove('active')); 
            link.classList.add('active'); 
            settingsPanels.forEach(p => p.id === targetId ? p.classList.add('active') : p.classList.remove('active')); 
        }); 
    });

    document.getElementById('general-settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = {
            store_name: document.getElementById('setting-store-name').value,
            public_email: document.getElementById('setting-public-email').value,
            public_phone: document.getElementById('setting-public-phone').value,
            warehouse_address: document.getElementById('setting-warehouse-address').value,
        };
        const { error } = await supabase.from('settings').update(updates).eq('id', 1);
        if (error) { alert('Failed to save settings: ' + error.message); }
        else { alert('General settings saved!'); }
    });

    document.getElementById('admin-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('setting-new-password').value;
        const confirmPassword = document.getElementById('setting-confirm-password').value;

        // 1. Basic Validation: Check if fields are filled and match
        if (!newPassword || !confirmPassword) {
            alert('Please fill out both new password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match. Please try again.');
            return;
        }
        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }

        // 2. Update the password using Supabase Auth
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            alert('Error updating password: ' + error.message);
        } else {
            alert('Password updated successfully!');
            // Clear the form fields after successful update
            document.getElementById('setting-new-password').value = '';
            document.getElementById('setting-confirm-password').value = '';
        }
    });    
    document.getElementById('save-advanced-settings-btn').addEventListener('click', async () => {
        const updates = { maintenance_mode: document.getElementById('maintenance-mode-toggle').checked };
        const { error } = await supabase.from('settings').update(updates).eq('id', 1);
        if (error) { alert('Failed to save settings: ' + error.message); }
        else { alert('Advanced settings saved!'); }
    });
        // Event listener for the advanced settings save button
    document.getElementById('save-advanced-settings-btn').addEventListener('click', async () => {
        const updates = {
            maintenance_mode: document.getElementById('maintenance-mode-toggle').checked
        };
        // Update the single row in the settings table
        const { error } = await supabase.from('settings').update(updates).eq('id', 1);

        if (error) {
            alert('Failed to save settings: ' + error.message);
        } else {
            alert('Advanced settings saved!');
        }
    });
    // --- INITIAL LOAD ---
    navigateToTab('dashboard-view');
});