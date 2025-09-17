import { supabase } from './supabase-client.js';

// --- STATE & CART (SHARED) ---
export let cart = JSON.parse(localStorage.getItem('c2gmall_cart')) || [];
export let allProducts = [];
let filters = { category: 'all', brands: [], priceRange: null, includeOOS: false, sort: 'default' };

// --- SHARED CART FUNCTIONS ---
export const saveCart = () => {
    localStorage.setItem('c2gmall_cart', JSON.stringify(cart));
    updateCartCount();
    if (document.getElementById('cart-items-container')) {
        renderCartPage();
        renderOrderSummary();
    }
};
export const updateCartCount = () => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'flex' : 'none';
    });
};
const addToCart = (productId, quantity = 1) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        supabase.from('products').select('*').eq('id', productId).single().then(({ data }) => {
            if (data) { allProducts.push(data); _performAddToCart(productId, quantity, data); }
        });
    } else { _performAddToCart(productId, quantity, product); }
};
const _performAddToCart = (productId, quantity, product) => {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) { existingItem.quantity += quantity; }
    else { cart.push({ id: productId, quantity: quantity, name: product.name, price: product.price, image: product.image }); }
    saveCart();
    showAddedToCartNotification(product.name);
};
const updateQuantity = (productId, newQuantity) => {
    const item = cart.find(item => item.id === productId);
    if (item) { item.quantity = newQuantity; if (item.quantity <= 0) { removeFromCart(productId); } else { saveCart(); } }
};
const removeFromCart = (productId) => { cart = cart.filter(item => item.id !== productId); saveCart(); };
const showAddedToCartNotification = (productName) => {
    const notification = document.getElementById('added-to-cart-notification');
    if (!notification) return;
    notification.textContent = `"${productName}" was added to your cart!`;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
};

// --- ROBUST FETCH FUNCTION WITH RETRY ---
async function fetchProductsWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      if (data && data.length) return data;
    } catch (err) {
      console.warn(`Fetch attempt ${i + 1} failed`, err);
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // exponential backoff
      }
    }
  }
  return null; // Return null if all retries fail
}

// --- PAGE INITIALIZERS ---
export async function initHomePage() {
    const featuredGrid = document.getElementById('featured-product-grid');
    if (!featuredGrid) return;
    const products = await fetchProductsWithRetry();
    if (!products) { featuredGrid.innerHTML = `<p>Could not load featured products.</p>`; return; }
    allProducts = products;
    const featuredProducts = products.slice(0, 4);
    applyFiltersAndRenderProducts(featuredGrid, featuredProducts, false);
}
export async function initShopPage() {
    const productGrid = document.getElementById('product-grid');
    if(!productGrid) return;
    renderSkeletonLoader(productGrid, 9);
    const products = await fetchProductsWithRetry();
    if (!products) {
        productGrid.innerHTML = `<p class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 40px;">Could not load products. Please refresh or try again later.</p>`;
        return;
    }
    allProducts = products;
    renderFilters(allProducts);
    applyFiltersAndRenderProducts(productGrid, allProducts);
    attachFilterListeners(productGrid, allProducts);
}
export async function initProductPage() {
    const container = document.getElementById('product-details-container');
    if (!container) return;
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    if (!productId) { container.innerHTML = '<h2>Product not found.</h2>'; return; }
    container.innerHTML = `<p style="text-align:center; padding: 40px;">Loading...</p>`;
    const { data: product, error } = await supabase.from('products').select('*').eq('id', productId).single();
    if (error || !product) { container.innerHTML = '<h2>Product not found.</h2>'; return; }
    allProducts = [product];
    container.innerHTML = `<div class="product-details-layout"><div class="product-gallery"><div class="main-image-container"><img src="${product.image}" alt="${product.name}" id="main-product-image"></div></div><div class="product-info-main"><span class="category-tag">${product.category}</span><h1>${product.name}</h1><p class="sku">SKU: ${product.sku}</p><div class="product-price-lg">₵${product.price.toFixed(2)}</div><p class="description">${product.description || 'No description available.'}</p><div class="quantity-selector"><label>Quantity:</label><button class="quantity-btn" id="decrease-qty">-</button><input type="text" id="quantity-input" value="1" readonly><button class="quantity-btn" id="increase-qty">+</button></div><div class="product-actions"><button class="btn btn-secondary add-to-cart-action" data-product-id="${product.id}">Add to Cart</button><button class="btn btn-primary buy-now-action" data-product-id="${product.id}">Buy Now</button></div></div></div>`;
    const qtyInput = document.getElementById('quantity-input');
    if(qtyInput) {
        document.getElementById('increase-qty').addEventListener('click', () => qtyInput.value = parseInt(qtyInput.value) + 1);
        document.getElementById('decrease-qty').addEventListener('click', () => { if (parseInt(qtyInput.value) > 1) qtyInput.value = parseInt(qtyInput.value) - 1; });
    }
    attachProductCardActionListeners();
}
export async function initCartPage() {
    const products = await fetchProductsWithRetry();
    if (products) {
        allProducts = products;
        renderCartPage();
        renderOrderSummary();
    }
}

// --- HELPER FUNCTIONS ---
const renderSkeletonLoader = (container, count) => {
    let skeletons = '';
    for (let i = 0; i < count; i++) { skeletons += `<div class="product-card-skeleton"><div class="skeleton-image"></div><div class="skeleton-body"><div class="skeleton-line short"></div><div class="skeleton-line"></div></div><div class="skeleton-footer"><div class="skeleton-line short"></div><div class="skeleton-line short"></div></div></div>`; }
    container.innerHTML = skeletons;
};
const renderFilters = (products) => {
    const categories = [...new Set(products.map(p => p.category))];
    const brands = [...new Set(products.map(p => p.brand).filter(b => b))];
    const categoryContainer = document.getElementById('category-filters');
    if(categoryContainer) { categoryContainer.innerHTML = `<a href="#" class="active" data-category="all">All Departments</a>` + categories.map(cat => `<a href="#" data-category="${cat}">${cat}</a>`).join(''); }
    const brandContainer = document.getElementById('brand-filters');
    if(brandContainer) { brandContainer.innerHTML = brands.map(brand => `<label class="checkbox-item"><span>${brand}</span><input type="checkbox" value="${brand}" data-filter="brand"><span class="checkmark"></span></label>`).join(''); }
};
const applyFiltersAndRenderProducts = (grid, productList, applyFilterLogic = true) => {
    const productGrid = grid;
    let productsToDisplay = productList;
    let filteredProducts = [...productsToDisplay];
    if (applyFilterLogic) {
        if (filters.category !== 'all') { filteredProducts = filteredProducts.filter(p => p.category === filters.category); }
        if (filters.brands.length > 0) { filteredProducts = filteredProducts.filter(p => filters.brands.includes(p.brand)); }
        if (filters.priceRange) { filteredProducts = filteredProducts.filter(p => p.price >= filters.priceRange.min && p.price <= filters.priceRange.max); }
        if (!filters.includeOOS) { filteredProducts = filteredProducts.filter(p => p.stock > 0); }
        if (filters.sort === 'price-asc') filteredProducts.sort((a, b) => a.price - b.price);
        else if (filters.sort === 'price-desc') filteredProducts.sort((a, b) => b.price - a.price);
        else if (filters.sort === 'newest') filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    productGrid.innerHTML = filteredProducts.length > 0 ? filteredProducts.map(p => `
        <div class="product-card" data-aos="fade-up">
            <a href="product.html?id=${p.id}" class="card-image-link"><div class="card-image"><img src="${p.image || 'https://placehold.co/300x300/e9ecef/6c757d?text=No+Image'}" alt="${p.name}"></div></a>
            <div class="card-body"><span class="product-card-brand">${p.brand || 'Generic'}</span><h4><a href="product.html?id=${p.id}" class="product-title-link">${p.name}</a></h4><div class="card-sku-stock"><span class="sku">SKU: ${p.sku}</span><span class="stock-status ${p.stock > 0 ? 'in-stock' : 'out-of-stock'}"><i class="fas fa-check-circle"></i>${p.stock > 0 ? `${p.stock} in Stock` : 'Out of Stock'}</span></div></div>
            <div class="card-footer"><span class="price">₵${p.price.toFixed(2)}</span><div class="card-actions"><button class="btn btn-primary btn-sm add-to-cart-action" data-product-id="${p.id}">Add to Cart</button></div></div>
        </div>`).join('') : `<p class="no-products-found" style="grid-column: 1 / -1; text-align:center; padding: 40px;">No products match your filters.</p>`;
    
    const productCountDisplay = document.getElementById('product-count-display');
    if(productCountDisplay) { productCountDisplay.textContent = `${filteredProducts.length} Products Found`; }
    attachProductCardActionListeners();
    AOS.refresh();
};
const attachFilterListeners = (grid, products) => {
    document.querySelectorAll('.filter-widget.collapsible .widget-title').forEach(title => title.addEventListener('click', () => title.parentElement.classList.toggle('open')));
    document.querySelectorAll('#category-filters a').forEach(link => link.addEventListener('click', e => { e.preventDefault(); filters.category = e.currentTarget.dataset.category; document.querySelectorAll('#category-filters a').forEach(l => l.classList.remove('active')); e.currentTarget.classList.add('active'); applyFiltersAndRenderProducts(grid, products); }));
    document.querySelectorAll('#price-filters a').forEach(link => link.addEventListener('click', e => { e.preventDefault(); const [min, max] = e.currentTarget.dataset.price.split('-').map(Number); filters.priceRange = { min, max }; applyFiltersAndRenderProducts(grid, products); }));
    document.querySelectorAll('#brand-filters input').forEach(box => box.addEventListener('change', e => { const brand = e.currentTarget.value; if (e.currentTarget.checked) { filters.brands.push(brand); } else { filters.brands = filters.brands.filter(b => b !== brand); } applyFiltersAndRenderProducts(grid, products); }));
    const onSaleCheckbox = document.getElementById('filter-on-sale');
    if(onSaleCheckbox) { onSaleCheckbox.addEventListener('change', e => { filters.onSale = e.currentTarget.checked; applyFiltersAndRenderProducts(grid, products); }); }
    const includeOOSCheckbox = document.getElementById('filter-include-oos');
    if(includeOOSCheckbox) { includeOOSCheckbox.addEventListener('change', e => { filters.includeOOS = e.currentTarget.checked; applyFiltersAndRenderProducts(grid, products); }); }
    const sortBySelect = document.getElementById('sort-by');
    if(sortBySelect) { sortBySelect.addEventListener('change', e => { filters.sort = e.currentTarget.value; applyFiltersAndRenderProducts(grid, products); }); }
};
const renderCartPage = () => {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart-message"><h3>Your Cart is Empty</h3><p>Time to fill it up!</p><a href="shop.html" class="btn btn-primary">Start Shopping</a></div>`;
    } else {
        container.innerHTML = cart.map(item => `<div class="cart-item"><div class="cart-item-image"><img src="${item.image}" alt="${item.name}"></div><div class="cart-item-details"><h4>${item.name}</h4><p class="price">₵${item.price.toFixed(2)}</p></div><div class="cart-item-actions"><div class="quantity-selector"><button class="quantity-btn decrease-cart-qty" data-id="${item.id}">-</button><input type="text" value="${item.quantity}" readonly><button class="quantity-btn increase-cart-qty" data-id="${item.id}">+</button></div><button class="remove-item-btn" data-id="${item.id}">Remove</button></div></div>`).join('');
        document.querySelectorAll('.decrease-cart-qty').forEach(btn => btn.addEventListener('click', e => { const id = parseInt(e.currentTarget.dataset.id); const item = cart.find(i=>i.id===id); updateQuantity(id, item.quantity - 1); }));
        document.querySelectorAll('.increase-cart-qty').forEach(btn => btn.addEventListener('click', e => { const id = parseInt(e.currentTarget.dataset.id); const item = cart.find(i=>i.id===id); updateQuantity(id, item.quantity + 1); }));
        document.querySelectorAll('.remove-item-btn').forEach(btn => btn.addEventListener('click', e => { const id = parseInt(e.currentTarget.dataset.id); removeFromCart(id); }));
    }
};
const renderOrderSummary = () => {
    const container = document.getElementById('order-summary-container');
    if (!container) return;
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal; 
    container.innerHTML = `<h3>Order Summary</h3><div class="summary-row"><span>Subtotal</span><span>₵${subtotal.toFixed(2)}</span></div><div class="summary-row"><span>Shipping</span><span>Calculated at checkout</span></div><div class="summary-row total"><span>Total</span><span>₵${total.toFixed(2)}</span></div><a href="checkout.html" class="btn btn-primary checkout-btn ${cart.length === 0 ? 'disabled' : ''}">Proceed to Checkout</a>`;
};
function attachProductCardActionListeners() {
    document.querySelectorAll('.add-to-cart-action').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const productId = parseInt(e.currentTarget.dataset.productId);
            addToCart(productId, 1);
        });
    });
    document.querySelectorAll('.buy-now-action').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const productId = parseInt(e.currentTarget.dataset.productId);
            addToCart(productId, 1);
            window.location.href = 'checkout.html';
        });
    });
}