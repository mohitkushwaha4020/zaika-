// App State
let cart = [];
let currentSection = 'home';
let menuItems = [];
let orders = [];
let notifications = [];

// Server connection
const API_BASE_URL = window.API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://zaika-mhby.onrender.com');
let socket = null;

// Initialize Socket.IO connection
function initializeSocket() {
    // Check if Socket.IO is loaded
    if (typeof io === 'undefined') {
        console.log('Socket.IO not loaded yet, retrying in 1 second...');
        setTimeout(initializeSocket, 1000);
        return;
    }
    
    socket = io(API_BASE_URL);
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('joinRoom', { userType: 'customer', userId: 'customer_' + Date.now() });
    });
    
    socket.on('menuUpdated', (updatedMenu) => {
        menuItems = updatedMenu;
        if (currentSection === 'menu') {
            loadMenuItems();
        }
        showMessage('Menu updated! 📋', 'info');
    });
    
    socket.on('orderStatusUpdate', (data) => {
        if (data.orderId) {
            updateOrderStatus(data.orderId, data.status);
            showOrderStatusNotification(data);
        }
    });
    
    socket.on('orderConfirmed', (data) => {
        showMessage(`Order confirmed! Estimated time: ${data.estimatedTime} minutes 🎉`, 'success');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Sample Menu Data
const sampleMenuItems = [
    // Sweets
    {
        id: 1,
        name: "Gulab Jamun",
        category: "sweets",
        price: 120,
        description: "Soft, spongy balls soaked in aromatic sugar syrup",
        emoji: "🍯",
        rating: 4.8,
        popular: true
    },
    {
        id: 2,
        name: "Rasgulla",
        category: "sweets",
        price: 100,
        description: "Spongy cottage cheese balls in light sugar syrup",
        emoji: "🥛",
        rating: 4.6
    },
    {
        id: 3,
        name: "Kaju Katli",
        category: "sweets",
        price: 300,
        description: "Premium cashew fudge with silver leaf",
        emoji: "💎",
        rating: 4.9,
        premium: true
    },
    {
        id: 4,
        name: "Jalebi",
        category: "sweets",
        price: 80,
        description: "Crispy spirals soaked in saffron sugar syrup",
        emoji: "🌀",
        rating: 4.7
    },
    
    // Namkeen
    {
        id: 5,
        name: "Aloo Bhujia",
        category: "namkeen",
        price: 60,
        description: "Crispy potato noodles with aromatic spices",
        emoji: "🥨",
        rating: 4.5
    },
    {
        id: 6,
        name: "Mixture",
        category: "namkeen",
        price: 70,
        description: "Crunchy mix of sev, nuts, and spices",
        emoji: "🥜",
        rating: 4.4
    },
    {
        id: 7,
        name: "Chivda",
        category: "namkeen",
        price: 50,
        description: "Flattened rice mix with peanuts and curry leaves",
        emoji: "🌾",
        rating: 4.3
    },
    
    // Snacks
    {
        id: 8,
        name: "Samosa",
        category: "snacks",
        price: 25,
        description: "Crispy triangular pastry with spiced potato filling",
        emoji: "🥟",
        rating: 4.8,
        popular: true
    },
    {
        id: 9,
        name: "Kachori",
        category: "snacks",
        price: 30,
        description: "Flaky pastry stuffed with spiced lentils",
        emoji: "🥙",
        rating: 4.6
    },
    {
        id: 10,
        name: "Pakora",
        category: "snacks",
        price: 40,
        description: "Mixed vegetable fritters with mint chutney",
        emoji: "🧅",
        rating: 4.5
    },
    {
        id: 11,
        name: "Dhokla",
        category: "snacks",
        price: 35,
        description: "Steamed gram flour cake with mustard tempering",
        emoji: "🟡",
        rating: 4.4
    },
    
    // Special Combos
    {
        id: 12,
        name: "Festival Sweet Box",
        category: "combos",
        price: 500,
        description: "Assorted premium sweets perfect for celebrations",
        emoji: "🎁",
        rating: 4.9,
        premium: true
    },
    {
        id: 13,
        name: "Tea Time Combo",
        category: "combos",
        price: 150,
        description: "Samosa, pakora, and mint chutney",
        emoji: "☕",
        rating: 4.7
    },
    {
        id: 14,
        name: "Family Namkeen Pack",
        category: "combos",
        price: 200,
        description: "Mix of bhujia, mixture, and chivda",
        emoji: "👨‍👩‍👧‍👦",
        rating: 4.6
    }
];

// Debug function
function testFunction() {
    console.log('Test function working!');
    alert('Functions are working! 🎉');
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    console.error('File:', e.filename, 'Line:', e.lineno);
});

// Debug helper
function debugAddresses() {
    console.log('Testing showAddresses function...');
    try {
        showAddresses();
        console.log('showAddresses called successfully!');
    } catch (error) {
        console.error('Error in showAddresses:', error);
    }
}

// API Functions
async function fetchMenuFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/menu`);
        const data = await response.json();
        if (data.success) {
            menuItems = data.data;
            return menuItems;
        }
    } catch (error) {
        console.error('Error fetching menu:', error);
        // Fallback to sample data
        menuItems = sampleMenuItems;
        return menuItems;
    }
}

async function submitOrderToServer(orderData) {
    try {
        console.log('📡 Submitting order to server:', API_BASE_URL + '/api/orders');

        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        console.log('📡 Server response status:', response.status);

        const data = await response.json();
        console.log('📡 Server response data:', data);

        if (!response.ok) {
            // Handle different error status codes
            if (response.status === 400) {
                throw new Error(data.errors ? data.errors.join(', ') : data.message || 'Invalid order data');
            } else if (response.status === 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(data.message || `Server error (${response.status})`);
            }
        }

        if (data.success) {
            return data.data;
        } else {
            throw new Error(data.message || 'Order submission failed');
        }
    } catch (error) {
        console.error('❌ Error submitting order:', error);

        // If it's a network error, provide a better message
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your connection and try again.');
        }

        // Re-throw the error with the original message
        throw error;
    }
}

// Utility Functions
function showMessage(message, type = 'info', duration = 3000) {
    // Create or find message container
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.className = 'message-container';
        document.body.appendChild(messageContainer);
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.innerHTML = `
        <div class="message-content">
            <span class="message-text">${message}</span>
            <button class="message-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Add to container
    messageContainer.appendChild(messageEl);

    // Auto remove after duration
    setTimeout(() => {
        if (messageEl.parentElement) {
            messageEl.remove();
        }
    }, duration);

    // Show with animation
    setTimeout(() => messageEl.classList.add('show'), 10);
}

function showItemModal(item) {
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalContent) {
        console.error('Modal elements not found');
        return;
    }

    modalContent.innerHTML = `
        <div class="item-modal-content">
            <div class="item-modal-header">
                <div class="item-image">${item.emoji}</div>
                <div class="item-info">
                    <h2>${item.name}</h2>
                    <div class="item-meta">
                        <span class="item-price">₹${item.price}</span>
                        <span class="item-rating">⭐ ${item.rating}</span>
                    </div>
                </div>
            </div>

            <div class="item-modal-body">
                <p class="item-description">${item.description}</p>

                <div class="item-details">
                    <div class="detail-item">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${item.category}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Preparation Time:</span>
                        <span class="detail-value">${item.preparationTime || 10} min</span>
                    </div>
                    ${item.popular ? '<div class="detail-item"><span class="badge popular">Popular Choice</span></div>' : ''}
                    ${item.premium ? '<div class="detail-item"><span class="badge premium">Premium</span></div>' : ''}
                </div>
            </div>

            <div class="item-modal-footer">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="changeModalQuantity(-1)">-</button>
                    <span class="quantity" id="modalQuantity">1</span>
                    <button class="quantity-btn" onclick="changeModalQuantity(1)">+</button>
                </div>
                <div class="modal-actions">
                    <button class="cancel-btn" onclick="closeModal()">Cancel</button>
                    <button class="add-to-cart-btn" onclick="addFromModal(${item.id})">
                        Add to Cart - ₹<span id="modalTotal">${item.price}</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';

    // Store current item for modal operations
    window.currentModalItem = item;
}

function closeModal() {
    const modal = document.getElementById('itemModal');
    if (modal) {
        modal.style.display = 'none';
    }
    window.currentModalItem = null;
}

function changeModalQuantity(delta) {
    const quantityEl = document.getElementById('modalQuantity');
    const totalEl = document.getElementById('modalTotal');

    if (!quantityEl || !totalEl || !window.currentModalItem) return;

    let quantity = parseInt(quantityEl.textContent) + delta;
    quantity = Math.max(1, Math.min(10, quantity)); // Min 1, Max 10

    quantityEl.textContent = quantity;
    totalEl.textContent = window.currentModalItem.price * quantity;
}

function addFromModal(itemId) {
    const quantityEl = document.getElementById('modalQuantity');
    if (quantityEl && window.currentModalItem) {
        const quantity = parseInt(quantityEl.textContent);
        addToCart(itemId, quantity);
        closeModal();
    }
}

// PWA and Storage Functions
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('zaikaCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            updateCartDisplay();
        }
    } catch (error) {
        console.error('Error loading cart from storage:', error);
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem('zaikaCart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart to storage:', error);
    }
}

function loadFromStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return defaultValue;
    }
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function isOnline() {
    return navigator.onLine;
}

function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

function initPullToRefresh() {
    let startY = 0;
    let pullDistance = 0;
    const threshold = 100;

    document.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', (e) => {
        if (window.scrollY === 0) {
            pullDistance = e.touches[0].clientY - startY;
            if (pullDistance > 0) {
                e.preventDefault();
            }
        }
    });

    document.addEventListener('touchend', () => {
        if (pullDistance > threshold && window.scrollY === 0) {
            // Trigger refresh
            window.location.reload();
        }
        pullDistance = 0;
    });
}

// Missing utility functions
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartDisplay();
    loadCartItems();
    saveCartToStorage();
    showMessage('Item removed from cart', 'info');
}

function increaseQuantity(itemId) {
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (item) {
        item.quantity += 1;
        updateCartDisplay();
        loadCartItems();
        saveCartToStorage();
    }
}

function decreaseQuantity(itemId) {
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (item) {
        if (item.quantity > 1) {
            item.quantity -= 1;
            updateCartDisplay();
            loadCartItems();
            saveCartToStorage();
        } else {
            removeFromCart(itemId);
        }
    }
}

function reverseGeocode(lat, lng) {
    // Mock reverse geocoding
    const mockAddresses = [
        { houseNumber: '123', street: 'MG Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
        { houseNumber: '456', street: 'Connaught Place', city: 'Delhi', state: 'Delhi', pincode: '110001' },
        { houseNumber: '789', street: 'Marine Drive', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }
    ];

    const mockAddress = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];

    // Fill form with detected address
    document.querySelector('input[name="houseNumber"]').value = mockAddress.houseNumber;
    document.querySelector('input[name="street"]').value = mockAddress.street;
    document.querySelector('input[name="city"]').value = mockAddress.city;
    document.querySelector('select[name="state"]').value = mockAddress.state;
    document.querySelector('input[name="pincode"]').value = mockAddress.pincode;
    document.querySelector('input[name="landmark"]').value = mockAddress.landmark;

    showMessage('Address auto-fill हो गया! 📍', 'success');
}

function showNotification(message, type = 'info', duration = 3000) {
    showMessage(message, type, duration);
}

// Initialize App - Force immediate execution
console.log('🚀 Script loaded, initializing immediately...');

// Force initialization without waiting
setTimeout(() => {
    console.log('🔧 Force initializing app...');
    initializeAppFunctions();
}, 100);

function initializeAppFunctions() {
    console.log('🚀 Initializing Zaika Junction App...');
    
    initializeApp();
    setupEventListeners();
    initializeSocket(); // Initialize socket connection
    fetchMenuFromServer().then(() => {
        loadMenuItems(); // Load menu items after fetching from server
    });
    updateCartDisplay();
    loadUserData(); // Load user data from localStorage
    initializePWAFeatures(); // Initialize PWA features

    // Debug log
    console.log('App initialized successfully!');
    console.log('userData:', userData);

    // Test if functions are working
    window.testFunction = testFunction;
    window.debugAddresses = debugAddresses;
    window.showAddresses = showAddresses;
    console.log('Test functions available:');
    console.log('- window.testFunction()');
    console.log('- window.debugAddresses()');
    console.log('- window.showAddresses()');
}

function initializeApp() {
    // Load data from localStorage if available
    const savedCart = localStorage.getItem('zaikaCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    
    // Initialize notifications
    notifications = [
        { id: 1, message: "🎉 50% off on Festival Special!", type: "offer", time: "2 hours ago" },
        { id: 2, message: "Your order #ZJ001234 is being prepared", type: "order", time: "15 min ago" },
        { id: 3, message: "New item added: Ras Malai!", type: "new", time: "1 day ago" }
    ];
    
    // Initialize sample order
    orders = [
        {
            id: "ZJ001234",
            items: [
                { name: "Gulab Jamun", quantity: 2, price: 120 },
                { name: "Samosa", quantity: 1, price: 25 }
            ],
            status: "preparing",
            total: 265,
            orderTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
            estimatedDelivery: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
        }
    ];
}

function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Add direct click handlers to each nav button
    const homeBtn = document.querySelector('[data-section="home"]');
    const menuBtn = document.querySelector('[data-section="menu"]');
    const cartBtn = document.querySelector('[data-section="cart"]');
    const ordersBtn = document.querySelector('[data-section="orders"]');
    const profileBtn = document.querySelector('[data-section="profile"]');
    
    if (homeBtn) {
        homeBtn.onclick = () => {
            console.log('🏠 Home clicked');
            showSection('home');
        };
        console.log('✅ Home button handler added');
    }
    
    if (menuBtn) {
        menuBtn.onclick = () => {
            console.log('🍽️ Menu clicked');
            showSection('menu');
        };
        console.log('✅ Menu button handler added');
    }
    
    if (cartBtn) {
        cartBtn.onclick = () => {
            console.log('🛒 Cart clicked');
            showSection('cart');
        };
        console.log('✅ Cart button handler added');
    }
    
    if (ordersBtn) {
        ordersBtn.onclick = () => {
            console.log('📋 Orders clicked');
            showSection('orders');
        };
        console.log('✅ Orders button handler added');
    }
    
    if (profileBtn) {
        profileBtn.onclick = () => {
            console.log('👤 Profile clicked');
            showSection('profile');
        };
        console.log('✅ Profile button handler added');
    }
    
    // Menu filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            filterMenu(category);
            
            // Update active filter
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Close modal on outside click
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('itemModal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    console.log('✅ All event listeners setup complete!');
}

function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    console.log('Found sections:', sections.length);
    
    sections.forEach(section => {
        section.classList.remove('active');
        console.log('Removed active from:', section.id);
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        console.log('Added active to:', sectionName);
    } else {
        console.error('Section not found:', sectionName);
    }
    
    // Update navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
        console.log('Updated nav active to:', sectionName);
    }
    
    currentSection = sectionName;
    
    // Load section-specific data
    if (sectionName === 'menu') {
        console.log('Loading menu items...');
        loadMenuItems();
    } else if (sectionName === 'cart') {
        console.log('Loading cart items...');
        loadCartItems();
    } else if (sectionName === 'orders') {
        console.log('Loading orders...');
        loadOrders();
    }
}

function showMenu(category) {
    showSection('menu');
    setTimeout(() => {
        filterMenu(category);
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });
    }, 100);
}

function loadMenuItems() {
    menuItems = [...sampleMenuItems];
    displayMenuItems(menuItems);
}

function displayMenuItems(items) {
    const container = document.getElementById('menuItems');
    container.innerHTML = '';
    
    items.forEach(item => {
        const itemElement = createMenuItemElement(item);
        container.appendChild(itemElement);
    });
}

function createMenuItemElement(item) {
    const div = document.createElement('div');
    div.className = 'menu-item';
    
    const badges = [];
    if (item.popular) badges.push('<span class="badge popular">Popular</span>');
    if (item.premium) badges.push('<span class="badge premium">Premium</span>');
    
    div.innerHTML = `
        <div class="menu-item-image">
            ${item.emoji}
            ${badges.join('')}
        </div>
        <div class="menu-item-content">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="menu-item-footer">
                <span class="price">₹${item.price}</span>
                <button class="add-btn" data-item-id="${item.id}">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners properly
    const addBtn = div.querySelector('.add-btn');
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Adding to cart:', item.id, item.name);
        addToCart(item.id);
    });
    
    // Add click to show modal on item (except button)
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.add-btn')) {
            showItemModal(item);
        }
    });
    
    return div;
}

function filterMenu(category) {
    const filteredItems = category === 'all' 
        ? menuItems 
        : menuItems.filter(item => item.category === category);
    displayMenuItems(filteredItems);
}

function addToCart(itemId, quantity = 1, customizations = {}) {
    const item = menuItems.find(item => item.id === itemId);
    if (!item) return;
    
    const existingItem = cart.find(cartItem => 
        cartItem.id === itemId && 
        JSON.stringify(cartItem.customizations) === JSON.stringify(customizations)
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            ...item,
            quantity,
            customizations,
            cartId: Date.now() + Math.random()
        });
    }
    
    updateCartDisplay();
    saveCart();
    showMessage('Item added to cart!', 'success');
}

function updateCartDisplay() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelector('.cart-count').textContent = cartCount;
    
    // Update cart summary
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const delivery = subtotal > 300 ? 0 : 40;
    const total = subtotal + delivery;
    
    const subtotalElement = document.getElementById('subtotal');
    const deliveryElement = document.getElementById('delivery');
    const totalElement = document.getElementById('total');
    
    if (subtotalElement) subtotalElement.textContent = `₹${subtotal}`;
    if (deliveryElement) deliveryElement.textContent = delivery === 0 ? 'FREE' : `₹${delivery}`;
    if (totalElement) totalElement.textContent = `₹${total}`;
}

function loadCartItems() {
    const container = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Add some delicious items to get started!</p>
                <button class="browse-menu-btn" onclick="showSection('menu')">Browse Menu</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    cart.forEach(item => {
        const cartItemElement = createCartItemElement(item);
        container.appendChild(cartItemElement);
    });
}

function createCartItemElement(item) {
    const div = document.createElement('div');
    div.className = 'cart-item';
    
    div.innerHTML = `
        <div class="cart-item-image">${item.emoji}</div>
        <div class="cart-item-details">
            <h4>${item.name}</h4>
            <p>₹${item.price} each</p>
        </div>
        <div class="cart-item-controls">
            <button class="quantity-btn decrease-btn" data-cart-id="${item.cartId}">
                <i class="fas fa-minus"></i>
            </button>
            <span class="quantity">${item.quantity}</span>
            <button class="quantity-btn increase-btn" data-cart-id="${item.cartId}">
                <i class="fas fa-plus"></i>
            </button>
        </div>
        <div class="cart-item-total">₹${item.price * item.quantity}</div>
        <button class="remove-item-btn" data-cart-id="${item.cartId}">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    // Add event listeners
    const decreaseBtn = div.querySelector('.decrease-btn');
    const increaseBtn = div.querySelector('.increase-btn');
    const removeBtn = div.querySelector('.remove-item-btn');
    
    decreaseBtn.addEventListener('click', () => {
        console.log('Decrease quantity for:', item.cartId);
        updateCartQuantity(item.cartId, item.quantity - 1);
    });
    
    increaseBtn.addEventListener('click', () => {
        console.log('Increase quantity for:', item.cartId);
        updateCartQuantity(item.cartId, item.quantity + 1);
    });
    
    removeBtn.addEventListener('click', () => {
        console.log('Remove item from cart:', item.cartId);
        updateCartQuantity(item.cartId, 0);
    });
    
    return div;
}

function updateCartQuantity(cartId, newQuantity) {
    const item = cart.find(item => item.cartId === cartId);
    if (item) {
        if (newQuantity <= 0) {
            cart = cart.filter(item => item.cartId !== cartId);
        } else {
            item.quantity = newQuantity;
        }
        updateCartDisplay();
        saveCart();
        loadCartItems();
    }
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        updateCartDisplay();
        saveCart();
        loadCartItems();
        showMessage('Cart cleared!', 'success');
    }
}

function saveCart() {
    localStorage.setItem('zaikaCart', JSON.stringify(cart));
}

async function proceedToCheckout() {
    console.log('🛒 Starting checkout process...');
    console.log('Cart contents:', cart);
    console.log('User data:', userData);

    if (cart.length === 0) {
        showMessage('Your cart is empty!', 'error');
        return;
    }

    // Validate cart items
    const invalidItems = cart.filter(item => !item.id || !item.name || !item.price || !item.quantity);
    if (invalidItems.length > 0) {
        console.error('Invalid cart items:', invalidItems);
        showMessage('Some items in your cart are invalid. Please try again.', 'error');
        return;
    }

    try {
        // Show loading
        showMessage('Placing your order...', 'info');

        // Prepare order data
        const orderData = {
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                emoji: item.emoji
            })),
            total: cart.reduce((total, item) => total + (item.price * item.quantity), 0) + 40, // +40 delivery
            customerInfo: {
                name: userData.profile.name || 'Customer',
                phone: userData.profile.phone || '9876543210',
                address: userData.addresses && userData.addresses.length > 0 ?
                    (userData.addresses.find(addr => addr.isDefault) || userData.addresses[0]) :
                    { fullAddress: 'Default Address, Delhi' }
            },
            paymentMethod: 'COD',
            deliveryCharge: 40
        };

        console.log('Order data prepared:', orderData);

        // Submit to server
        const order = await submitOrderToServer(orderData);

        console.log('Order submitted successfully:', order);

        // Add to local orders
        orders.unshift(order);

        // Clear cart
        cart = [];
        updateCartDisplay();
        saveCart();

        // Show success message
        showMessage(`Order placed successfully! Order ID: ${order.id}`, 'success');

        // Switch to orders section
        setTimeout(() => {
            showSection('orders');
            loadOrders();
        }, 2000);

    } catch (error) {
        console.error('Order placement failed:', error);

        // If offline, store order for later sync
        if (!navigator.onLine) {
            console.log('📱 Offline detected, storing order for later sync');
            storeOfflineOrder(orderData);
            showMessage('Order saved offline! Will sync when online.', 'warning');

            // Clear cart even when offline
            cart = [];
            updateCartDisplay();
            saveCart();

            setTimeout(() => {
                showSection('orders');
                loadOrders();
            }, 2000);
        } else {
            showMessage(error.message || 'Failed to place order. Please try again.', 'error');
        }
    }
}

function loadOrders() {
    const container = document.querySelector('.orders-list');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-orders">
                <div class="empty-orders-icon">📋</div>
                <h3>No orders yet</h3>
                <p>Your delicious orders will appear here!</p>
                <button class="browse-menu-btn" onclick="showSection('menu')">Start Ordering</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    orders.forEach(order => {
        const orderElement = createOrderElement(order);
        container.appendChild(orderElement);
    });
}

function createOrderElement(order) {
    const div = document.createElement('div');
    div.className = 'order-card';
    
    const statusClass = order.status.toLowerCase();
    const statusIcon = {
        'confirmed': 'fas fa-check-circle',
        'preparing': 'fas fa-clock',
        'out-for-delivery': 'fas fa-truck',
        'delivered': 'fas fa-check-double'
    }[order.status] || 'fas fa-clock';
    
    const itemsText = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
    const timeAgo = getTimeAgo(order.orderTime);
    
    div.innerHTML = `
        <div class="order-status ${statusClass}">
            <i class="${statusIcon}"></i>
            <span>${order.status.replace('-', ' ').toUpperCase()}</span>
        </div>
        <div class="order-details">
            <h3>Order #${order.id}</h3>
            <p>${itemsText}</p>
            <div class="order-meta">
                <span class="order-time">Ordered ${timeAgo}</span>
                <span class="order-total">₹${order.total}</span>
            </div>
        </div>
        <button class="track-btn" onclick="trackOrder('${order.id}')">Track Order</button>
    `;
    
    return div;
}

function trackOrder(orderId) {
    if (socket) {
        socket.emit('trackOrder', orderId);
    }
    showMessage(`Tracking order ${orderId}...`, 'info');
}

// Update order status from server
function updateOrderStatus(orderId, newStatus) {
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus;
        orders[orderIndex].updatedAt = new Date().toISOString();
        
        // Refresh orders display if currently viewing
        if (currentSection === 'orders') {
            loadOrders();
        }
    }
}

// Show order status notification
function showOrderStatusNotification(data) {
    const statusMessages = {
        'pending': '⏳ Order received and being processed',
        'preparing': '👨‍🍳 Your order is being prepared',
        'ready': '✅ Order ready for pickup/delivery',
        'delivered': '🎉 Order delivered successfully!'
    };
    
    const message = statusMessages[data.status] || `Order status updated to ${data.status}`;
    showMessage(`Order ${data.orderId}: ${message}`, 'success');
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

function showNotifications() {
    showMessage('You have 3 new notifications!', 'info');
}

function toggleCart() {
    const overlay = document.getElementById('cartOverlay');
    overlay.classList.toggle('active');
}

// User Data Storage
let userData = {
    profile: {
        name: 'Food Lover',
        phone: '',
        email: '',
        loyaltyPoints: 250
    },
    addresses: [],
    paymentMethods: [],
    orders: [],
    favorites: []
};

// Load user data from localStorage
function loadUserData() {
    const savedData = localStorage.getItem('zaikaUserData');
    if (savedData) {
        userData = { ...userData, ...JSON.parse(savedData) };
    }
}

// Save user data to localStorage
function saveUserData() {
    localStorage.setItem('zaikaUserData', JSON.stringify(userData));
}

// Profile Functions
function showAddresses() {
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="address-management">
            <h2>📍 Delivery Addresses</h2>
            
            <div class="addresses-list" id="addressesList">
                ${userData.addresses.length === 0 ? 
                    '<p class="no-data">कोई address saved नहीं है</p>' :
                    userData.addresses.map((address, index) => `
                        <div class="address-card ${address.isDefault ? 'default' : ''}">
                            <div class="address-info">
                                <h4>
                                    ${address.label === 'Home' ? '🏠' : address.label === 'Office' ? '🏢' : '📍'} 
                                    ${address.label}
                                    ${address.isDefault ? '<span class="default-badge">Default</span>' : ''}
                                </h4>
                                <p>${address.fullAddress}</p>
                                <div class="address-meta">
                                    <span><i class="fas fa-map-marker-alt"></i> ${address.city}, ${address.state}</span>
                                    <span><i class="fas fa-mail-bulk"></i> ${address.pincode}</span>
                                    ${address.deliveryArea ? `<span class="delivery-zone">${address.deliveryArea}</span>` : ''}
                                </div>
                                ${address.landmark ? `<small><i class="fas fa-landmark"></i> ${address.landmark}</small>` : ''}
                                ${address.instructions ? `<small><i class="fas fa-info-circle"></i> ${address.instructions}</small>` : ''}
                                <div class="contact-info">
                                    <small><i class="fas fa-user"></i> ${address.contactPerson}</small>
                                    <small><i class="fas fa-phone"></i> ${address.phone}</small>
                                </div>
                            </div>
                            <div class="address-actions">
                                ${!address.isDefault ? `<button onclick="setDefaultAddress(${index})" class="default-btn">Set Default</button>` : ''}
                                <button onclick="editAddress(${index})" class="edit-btn">✏️</button>
                                <button onclick="deleteAddress(${index})" class="delete-btn">🗑️</button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            
            <button class="add-address-btn" onclick="showAddAddressForm()">
                <i class="fas fa-plus"></i> नया Address Add करें
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function showAddAddressForm(editIndex = null) {
    const isEdit = editIndex !== null;
    const address = isEdit ? userData.addresses[editIndex] : {};
    
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="address-form">
            <h2>${isEdit ? '📝 Address Edit करें' : '📍 नया Address Add करें'}</h2>
            
            <form onsubmit="saveAddress(event, ${editIndex})">
                <div class="form-group">
                    <label>Address Label *</label>
                    <select name="label" required>
                        <option value="">Select करें</option>
                        <option value="Home" ${address.label === 'Home' ? 'selected' : ''}>🏠 Home</option>
                        <option value="Office" ${address.label === 'Office' ? 'selected' : ''}>🏢 Office</option>
                        <option value="Other" ${address.label === 'Other' ? 'selected' : ''}>📍 Other</option>
                    </select>
                </div>
                
                <!-- GPS Location Section -->
                <div class="location-section">
                    <div class="location-actions">
                        <button type="button" onclick="getCurrentLocation()" class="location-btn">
                            <i class="fas fa-location-arrow"></i> Current Location Use करें
                        </button>
                        <button type="button" onclick="showMapPicker()" class="map-btn">
                            <i class="fas fa-map-marked-alt"></i> Map से Select करें
                        </button>
                    </div>
                    <div id="locationStatus" class="location-status"></div>
                </div>
                
                <!-- Place Search -->
                <div class="form-group">
                    <label>Search Place</label>
                    <div class="search-container">
                        <input type="text" id="placeSearch" placeholder="Search for places, landmarks..." 
                               oninput="searchPlaces(this.value)" autocomplete="off">
                        <i class="fas fa-search search-icon"></i>
                    </div>
                    <div id="placeSuggestions" class="place-suggestions"></div>
                </div>
                
                <div class="form-group">
                    <label>House/Flat No *</label>
                    <input type="text" name="houseNumber" placeholder="House/Flat No, Building Name" 
                           value="${address.houseNumber || ''}" required>
                </div>
                
                <div class="form-group">
                    <label>Street/Area *</label>
                    <input type="text" name="street" placeholder="Street Name, Area" 
                           value="${address.street || ''}" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>City *</label>
                        <input type="text" name="city" placeholder="City" value="${address.city || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>State *</label>
                        <select name="state" required>
                            <option value="">Select State</option>
                            <option value="Delhi" ${address.state === 'Delhi' ? 'selected' : ''}>Delhi</option>
                            <option value="Maharashtra" ${address.state === 'Maharashtra' ? 'selected' : ''}>Maharashtra</option>
                            <option value="Karnataka" ${address.state === 'Karnataka' ? 'selected' : ''}>Karnataka</option>
                            <option value="Tamil Nadu" ${address.state === 'Tamil Nadu' ? 'selected' : ''}>Tamil Nadu</option>
                            <option value="Gujarat" ${address.state === 'Gujarat' ? 'selected' : ''}>Gujarat</option>
                            <option value="Rajasthan" ${address.state === 'Rajasthan' ? 'selected' : ''}>Rajasthan</option>
                            <option value="Punjab" ${address.state === 'Punjab' ? 'selected' : ''}>Punjab</option>
                            <option value="Haryana" ${address.state === 'Haryana' ? 'selected' : ''}>Haryana</option>
                            <option value="Uttar Pradesh" ${address.state === 'Uttar Pradesh' ? 'selected' : ''}>Uttar Pradesh</option>
                            <option value="West Bengal" ${address.state === 'West Bengal' ? 'selected' : ''}>West Bengal</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Pincode *</label>
                        <input type="text" name="pincode" placeholder="123456" value="${address.pincode || ''}" 
                               pattern="[0-9]{6}" required oninput="validatePincode(this)">
                        <div id="pincodeStatus" class="pincode-status"></div>
                    </div>
                    <div class="form-group">
                        <label>Delivery Area</label>
                        <select name="deliveryArea">
                            <option value="">Auto Detect</option>
                            <option value="Zone A" ${address.deliveryArea === 'Zone A' ? 'selected' : ''}>Zone A (0-5 km)</option>
                            <option value="Zone B" ${address.deliveryArea === 'Zone B' ? 'selected' : ''}>Zone B (5-10 km)</option>
                            <option value="Zone C" ${address.deliveryArea === 'Zone C' ? 'selected' : ''}>Zone C (10-15 km)</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Landmark (Optional)</label>
                    <input type="text" name="landmark" placeholder="Near Metro Station, Mall, etc." 
                           value="${address.landmark || ''}">
                </div>
                
                <div class="form-group">
                    <label>Delivery Instructions (Optional)</label>
                    <textarea name="instructions" placeholder="Special delivery instructions..." 
                              rows="2">${address.instructions || ''}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Contact Person *</label>
                        <input type="text" name="contactPerson" placeholder="Your Name" 
                               value="${address.contactPerson || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Phone Number *</label>
                        <input type="tel" name="phone" placeholder="9876543210" 
                               value="${address.phone || ''}" pattern="[0-9]{10}" required>
                    </div>
                </div>
                
                <!-- Address Type Specific Fields -->
                <div class="address-type-fields">
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="isDefault" ${address.isDefault ? 'checked' : ''}>
                            <span>इसे default delivery address बनाएं</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="saveForFuture" checked>
                            <span>Future orders के लिए save करें</span>
                        </label>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" onclick="showAddresses()" class="cancel-btn">Cancel</button>
                    <button type="submit" class="save-btn">${isEdit ? 'Update करें' : 'Save करें'}</button>
                </div>
            </form>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Initialize place search
    initializePlaceSearch();
}

// GPS and Location Functions
function getCurrentLocation() {
    const statusDiv = document.getElementById('locationStatus');
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Location detect कर रहे हैं...';
    
    if (!navigator.geolocation) {
        statusDiv.innerHTML = '<span class="error">GPS support नहीं है इस device में</span>';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            statusDiv.innerHTML = '<span class="success"><i class="fas fa-check-circle"></i> Location मिल गया!</span>';
            
            // Reverse geocoding (mock implementation)
            reverseGeocode(lat, lng);
        },
        (error) => {
            let errorMsg = 'Location access denied';
            if (error.code === 1) errorMsg = 'Location permission denied';
            else if (error.code === 2) errorMsg = 'Location unavailable';
            else if (error.code === 3) errorMsg = 'Location timeout';
            
            statusDiv.innerHTML = `<span class="error"><i class="fas fa-exclamation-circle"></i> ${errorMsg}</span>`;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

function reverseGeocode(lat, lng) {
    // Mock reverse geocoding - in real app, use Google Maps API
    const mockAddresses = [
        {
            houseNumber: '123',
            street: 'MG Road',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110001',
            landmark: 'Near Connaught Place'
        },
        {
            houseNumber: '456',
            street: 'Brigade Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560001',
            landmark: 'Near Commercial Street'
        }
    ];
    
    const mockAddress = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
    
    // Fill form with detected address
    document.querySelector('input[name="houseNumber"]').value = mockAddress.houseNumber;
    document.querySelector('input[name="street"]').value = mockAddress.street;
    document.querySelector('input[name="city"]').value = mockAddress.city;
    document.querySelector('select[name="state"]').value = mockAddress.state;
    document.querySelector('input[name="pincode"]').value = mockAddress.pincode;
    document.querySelector('input[name="landmark"]').value = mockAddress.landmark;
    
    showMessage('Address auto-fill हो गया! 📍', 'success');
}

function showMapPicker() {
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="map-picker">
            <h2>📍 Map से Location Select करें</h2>
            
            <div class="map-container">
                <div class="mock-map">
                    <div class="map-marker" onclick="selectMapLocation(28.6139, 77.2090)">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Connaught Place, Delhi</span>
                    </div>
                    <div class="map-marker" onclick="selectMapLocation(12.9716, 77.5946)">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>MG Road, Bangalore</span>
                    </div>
                    <div class="map-marker" onclick="selectMapLocation(19.0760, 72.8777)">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Mumbai Central</span>
                    </div>
                </div>
            </div>
            
            <div class="map-instructions">
                <p><i class="fas fa-info-circle"></i> Map पर location click करके select करें</p>
            </div>
            
            <div class="form-actions">
                <button type="button" onclick="showAddAddressForm()" class="cancel-btn">Back</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function selectMapLocation(lat, lng) {
    showMessage('Location selected! Form में जा रहे हैं...', 'success');
    setTimeout(() => {
        showAddAddressForm();
        reverseGeocode(lat, lng);
    }, 1000);
}

// Place Search Functions
let placeSearchTimeout;
const popularPlaces = [
    { name: 'Connaught Place, Delhi', type: 'landmark', city: 'Delhi', state: 'Delhi' },
    { name: 'India Gate, Delhi', type: 'landmark', city: 'Delhi', state: 'Delhi' },
    { name: 'Red Fort, Delhi', type: 'landmark', city: 'Delhi', state: 'Delhi' },
    { name: 'MG Road, Bangalore', type: 'street', city: 'Bangalore', state: 'Karnataka' },
    { name: 'Brigade Road, Bangalore', type: 'street', city: 'Bangalore', state: 'Karnataka' },
    { name: 'Marine Drive, Mumbai', type: 'landmark', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'Gateway of India, Mumbai', type: 'landmark', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'Sector 17, Chandigarh', type: 'area', city: 'Chandigarh', state: 'Punjab' },
    { name: 'Park Street, Kolkata', type: 'street', city: 'Kolkata', state: 'West Bengal' },
    { name: 'Anna Salai, Chennai', type: 'street', city: 'Chennai', state: 'Tamil Nadu' }
];

function initializePlaceSearch() {
    // Show popular places initially
    const suggestionsDiv = document.getElementById('placeSuggestions');
    if (suggestionsDiv) {
        showPopularPlaces();
    }
}

function showPopularPlaces() {
    const suggestionsDiv = document.getElementById('placeSuggestions');
    const popularHTML = `
        <div class="popular-places">
            <h4>🔥 Popular Places:</h4>
            ${popularPlaces.slice(0, 5).map(place => `
                <div class="place-item popular" onclick="selectPlace('${place.name}', '${place.city}', '${place.state}')">
                    <i class="fas fa-${place.type === 'landmark' ? 'monument' : place.type === 'street' ? 'road' : 'map-marker-alt'}"></i>
                    <span>${place.name}</span>
                    <small>${place.city}, ${place.state}</small>
                </div>
            `).join('')}
        </div>
    `;
    suggestionsDiv.innerHTML = popularHTML;
    suggestionsDiv.style.display = 'block';
}

function searchPlaces(query) {
    const suggestionsDiv = document.getElementById('placeSuggestions');
    
    if (!query.trim()) {
        showPopularPlaces();
        return;
    }
    
    clearTimeout(placeSearchTimeout);
    placeSearchTimeout = setTimeout(() => {
        const filteredPlaces = popularPlaces.filter(place => 
            place.name.toLowerCase().includes(query.toLowerCase()) ||
            place.city.toLowerCase().includes(query.toLowerCase())
        );
        
        if (filteredPlaces.length > 0) {
            const searchHTML = `
                <div class="search-results">
                    <h4>🔍 Search Results:</h4>
                    ${filteredPlaces.map(place => `
                        <div class="place-item" onclick="selectPlace('${place.name}', '${place.city}', '${place.state}')">
                            <i class="fas fa-${place.type === 'landmark' ? 'monument' : place.type === 'street' ? 'road' : 'map-marker-alt'}"></i>
                            <span>${place.name}</span>
                            <small>${place.city}, ${place.state}</small>
                        </div>
                    `).join('')}
                </div>
            `;
            suggestionsDiv.innerHTML = searchHTML;
        } else {
            suggestionsDiv.innerHTML = `
                <div class="no-results">
                    <p><i class="fas fa-search"></i> कोई results नहीं मिले "${query}" के लिए</p>
                    <small>Try searching for popular landmarks, streets, or cities</small>
                </div>
            `;
        }
        suggestionsDiv.style.display = 'block';
    }, 300);
}

function selectPlace(placeName, city, state) {
    document.getElementById('placeSearch').value = placeName;
    document.querySelector('input[name="city"]').value = city;
    document.querySelector('select[name="state"]').value = state;
    document.getElementById('placeSuggestions').style.display = 'none';
    
    showMessage(`${placeName} selected! 📍`, 'success');
}

// Pincode Validation
function validatePincode(input) {
    const pincode = input.value;
    const statusDiv = document.getElementById('pincodeStatus');
    
    if (pincode.length === 6) {
        statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
        
        // Mock pincode validation
        setTimeout(() => {
            const validPincodes = ['110001', '560001', '400001', '700001', '600001'];
            if (validPincodes.includes(pincode)) {
                statusDiv.innerHTML = '<span class="success"><i class="fas fa-check-circle"></i> Valid pincode</span>';
                
                // Auto-detect delivery area
                const deliverySelect = document.querySelector('select[name="deliveryArea"]');
                deliverySelect.value = pincode.startsWith('11') ? 'Zone A' : 'Zone B';
            } else {
                statusDiv.innerHTML = '<span class="warning"><i class="fas fa-exclamation-triangle"></i> Delivery available but may take longer</span>';
            }
        }, 1000);
    } else {
        statusDiv.innerHTML = '';
    }
}

function saveAddress(event, editIndex = null) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const address = {
        label: formData.get('label'),
        houseNumber: formData.get('houseNumber'),
        street: formData.get('street'),
        city: formData.get('city'),
        state: formData.get('state'),
        pincode: formData.get('pincode'),
        deliveryArea: formData.get('deliveryArea'),
        landmark: formData.get('landmark'),
        instructions: formData.get('instructions'),
        contactPerson: formData.get('contactPerson'),
        phone: formData.get('phone'),
        isDefault: formData.get('isDefault') === 'on',
        saveForFuture: formData.get('saveForFuture') === 'on',
        id: editIndex !== null ? userData.addresses[editIndex].id : Date.now(),
        createdAt: editIndex !== null ? userData.addresses[editIndex].createdAt : new Date().toISOString()
    };
    
    // Create full address string
    address.fullAddress = `${address.houseNumber}, ${address.street}, ${address.city}, ${address.state} - ${address.pincode}`;
    
    // If this is set as default, remove default from others
    if (address.isDefault) {
        userData.addresses.forEach(addr => addr.isDefault = false);
    }
    
    if (editIndex !== null) {
        userData.addresses[editIndex] = address;
        showMessage('Address successfully update हो गया! ✅', 'success');
    } else {
        userData.addresses.push(address);
        showMessage('नया address successfully add हो गया! ✅', 'success');
        
        // Award loyalty points for adding address
        userData.profile.loyaltyPoints += 5;
        showMessage('5 loyalty points मिले! 🎉', 'info');
    }
    
    saveUserData();
    showAddresses();
}

function setDefaultAddress(index) {
    userData.addresses.forEach((addr, i) => {
        addr.isDefault = i === index;
    });
    saveUserData();
    showMessage('Default address update हो गया! ✅', 'success');
    showAddresses();
}

function editAddress(index) {
    showAddAddressForm(index);
}

function deleteAddress(index) {
    if (confirm('क्या आप sure हैं कि इस address को delete करना चाहते हैं?')) {
        userData.addresses.splice(index, 1);
        saveUserData();
        showMessage('Address successfully delete हो गया!', 'success');
        showAddresses();
    }
}

function showPaymentMethods() {
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="payment-management">
            <h2>💳 Payment Methods</h2>
            
            <div class="payment-methods-list" id="paymentMethodsList">
                ${userData.paymentMethods.length === 0 ? 
                    '<p class="no-data">कोई payment method saved नहीं है</p>' :
                    userData.paymentMethods.map((method, index) => `
                        <div class="payment-card">
                            <div class="payment-info">
                                <div class="payment-icon">
                                    ${method.type === 'card' ? '💳' : 
                                      method.type === 'upi' ? '📱' : 
                                      method.type === 'wallet' ? '👛' : '💰'}
                                </div>
                                <div class="payment-details">
                                    <h4>${method.name}</h4>
                                    <p>${method.details}</p>
                                    ${method.isDefault ? '<span class="default-badge">Default</span>' : ''}
                                </div>
                            </div>
                            <div class="payment-actions">
                                <button onclick="setDefaultPayment(${index})" class="default-btn" ${method.isDefault ? 'disabled' : ''}>
                                    ${method.isDefault ? '✅' : 'Set Default'}
                                </button>
                                <button onclick="deletePaymentMethod(${index})" class="delete-btn">🗑️</button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            
            <div class="add-payment-options">
                <h3>नया Payment Method Add करें:</h3>
                <div class="payment-type-buttons">
                    <button onclick="showAddPaymentForm('card')" class="payment-type-btn">
                        💳 Credit/Debit Card
                    </button>
                    <button onclick="showAddPaymentForm('upi')" class="payment-type-btn">
                        📱 UPI ID
                    </button>
                    <button onclick="showAddPaymentForm('wallet')" class="payment-type-btn">
                        👛 Digital Wallet
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function showAddPaymentForm(type) {
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');
    
    let formContent = '';
    
    if (type === 'card') {
        formContent = `
            <div class="form-group">
                <label>Card Number *</label>
                <input type="text" name="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Expiry Date *</label>
                    <input type="text" name="expiry" placeholder="MM/YY" maxlength="5" required>
                </div>
                <div class="form-group">
                    <label>CVV *</label>
                    <input type="password" name="cvv" placeholder="123" maxlength="3" required>
                </div>
            </div>
            <div class="form-group">
                <label>Cardholder Name *</label>
                <input type="text" name="cardholderName" placeholder="Name on Card" required>
            </div>
        `;
    } else if (type === 'upi') {
        formContent = `
            <div class="form-group">
                <label>UPI ID *</label>
                <input type="text" name="upiId" placeholder="yourname@paytm" required>
            </div>
            <div class="form-group">
                <label>Display Name *</label>
                <input type="text" name="displayName" placeholder="My UPI" required>
            </div>
        `;
    } else if (type === 'wallet') {
        formContent = `
            <div class="form-group">
                <label>Wallet Type *</label>
                <select name="walletType" required>
                    <option value="">Select Wallet</option>
                    <option value="paytm">Paytm</option>
                    <option value="phonepe">PhonePe</option>
                    <option value="googlepay">Google Pay</option>
                    <option value="amazonpay">Amazon Pay</option>
                </select>
            </div>
            <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" name="phone" placeholder="9876543210" pattern="[0-9]{10}" required>
            </div>
        `;
    }
    
    modalContent.innerHTML = `
        <div class="payment-form">
            <h2>💳 ${type === 'card' ? 'Card' : type === 'upi' ? 'UPI' : 'Wallet'} Add करें</h2>
            
            <form onsubmit="savePaymentMethod(event, '${type}')">
                ${formContent}
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="setDefault">
                        <span>इसे default payment method बनाएं</span>
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="button" onclick="showPaymentMethods()" class="cancel-btn">Cancel</button>
                    <button type="submit" class="save-btn">Save करें</button>
                </div>
            </form>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Add input formatting for card number
    if (type === 'card') {
        const cardInput = document.querySelector('input[name="cardNumber"]');
        cardInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = formattedValue;
        });
        
        const expiryInput = document.querySelector('input[name="expiry"]');
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
}

function savePaymentMethod(event, type) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    let paymentMethod = {
        id: Date.now(),
        type: type,
        isDefault: formData.get('setDefault') === 'on'
    };
    
    if (type === 'card') {
        const cardNumber = formData.get('cardNumber').replace(/\s/g, '');
        paymentMethod.name = `Card ending in ${cardNumber.slice(-4)}`;
        paymentMethod.details = `${formData.get('cardholderName')} • Expires ${formData.get('expiry')}`;
        paymentMethod.cardNumber = cardNumber;
        paymentMethod.expiry = formData.get('expiry');
        paymentMethod.cardholderName = formData.get('cardholderName');
    } else if (type === 'upi') {
        paymentMethod.name = formData.get('displayName');
        paymentMethod.details = formData.get('upiId');
        paymentMethod.upiId = formData.get('upiId');
    } else if (type === 'wallet') {
        const walletType = formData.get('walletType');
        paymentMethod.name = walletType.charAt(0).toUpperCase() + walletType.slice(1);
        paymentMethod.details = formData.get('phone');
        paymentMethod.walletType = walletType;
        paymentMethod.phone = formData.get('phone');
    }
    
    // If this is set as default, remove default from others
    if (paymentMethod.isDefault) {
        userData.paymentMethods.forEach(method => method.isDefault = false);
    }
    
    userData.paymentMethods.push(paymentMethod);
    saveUserData();
    showMessage('Payment method successfully add हो गया! ✅', 'success');
    showPaymentMethods();
}

function setDefaultPayment(index) {
    userData.paymentMethods.forEach((method, i) => {
        method.isDefault = i === index;
    });
    saveUserData();
    showMessage('Default payment method update हो गया! ✅', 'success');
    showPaymentMethods();
}

function deletePaymentMethod(index) {
    if (confirm('क्या आप sure हैं कि इस payment method को delete करना चाहते हैं?')) {
        userData.paymentMethods.splice(index, 1);
        saveUserData();
        showMessage('Payment method successfully delete हो गया!', 'success');
        showPaymentMethods();
    }
}

function showOffers() {
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');
    
    const availableOffers = [
        {
            id: 1,
            title: '50% OFF Festival Special',
            description: 'Get 50% off on all sweet boxes above ₹500',
            code: 'FESTIVAL50',
            discount: '50%',
            minOrder: 500,
            validTill: '31 Dec 2024',
            used: false
        },
        {
            id: 2,
            title: 'Free Delivery',
            description: 'Free delivery on orders above ₹300',
            code: 'FREEDEL',
            discount: 'Free Delivery',
            minOrder: 300,
            validTill: '31 Dec 2024',
            used: false
        },
        {
            id: 3,
            title: 'First Order Discount',
            description: '20% off on your first order',
            code: 'FIRST20',
            discount: '20%',
            minOrder: 200,
            validTill: '31 Dec 2024',
            used: true
        }
    ];
    
    modalContent.innerHTML = `
        <div class="offers-management">
            <h2>🎁 Offers & Coupons</h2>
            
            <div class="loyalty-points">
                <div class="points-card">
                    <h3>💰 Your Loyalty Points</h3>
                    <div class="points-display">
                        <span class="points-number">${userData.profile.loyaltyPoints}</span>
                        <small>Points</small>
                    </div>
                    <p>₹1 = 1 Point | 100 Points = ₹10 discount</p>
                    <button onclick="redeemPoints()" class="redeem-btn" ${userData.profile.loyaltyPoints < 100 ? 'disabled' : ''}>
                        Redeem Points
                    </button>
                </div>
            </div>
            
            <div class="offers-list">
                <h3>Available Offers:</h3>
                ${availableOffers.map(offer => `
                    <div class="offer-card ${offer.used ? 'used' : ''}">
                        <div class="offer-info">
                            <h4>${offer.title}</h4>
                            <p>${offer.description}</p>
                            <div class="offer-details">
                                <span class="offer-code">Code: ${offer.code}</span>
                                <span class="offer-validity">Valid till: ${offer.validTill}</span>
                            </div>
                        </div>
                        <div class="offer-action">
                            <div class="discount-badge">${offer.discount}</div>
                            <button onclick="copyOfferCode('${offer.code}')" class="copy-btn" ${offer.used ? 'disabled' : ''}>
                                ${offer.used ? 'Used' : 'Copy Code'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="referral-section">
                <h3>🤝 Refer & Earn</h3>
                <div class="referral-card">
                    <p>अपने friends को refer करें और दोनों को ₹50 का discount पाएं!</p>
                    <div class="referral-code">
                        <span>Your Referral Code: <strong>ZAIKA${userData.profile.loyaltyPoints}</strong></span>
                        <button onclick="shareReferralCode()" class="share-btn">Share</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function copyOfferCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showMessage(`Offer code "${code}" copied! 📋`, 'success');
    });
}

function redeemPoints() {
    if (userData.profile.loyaltyPoints >= 100) {
        const pointsToRedeem = Math.floor(userData.profile.loyaltyPoints / 100) * 100;
        const discountAmount = pointsToRedeem / 10;
        
        if (confirm(`${pointsToRedeem} points redeem करके ₹${discountAmount} discount पाना चाहते हैं?`)) {
            userData.profile.loyaltyPoints -= pointsToRedeem;
            saveUserData();
            showMessage(`₹${discountAmount} discount आपके account में add हो गया! 🎉`, 'success');
            showOffers();
        }
    }
}

function shareReferralCode() {
    const referralCode = `ZAIKA${userData.profile.loyaltyPoints}`;
    const shareText = `🍯 Zaika Junction से authentic Indian sweets order करें!\n\nMy referral code use करें: ${referralCode}\nDono को ₹50 discount मिलेगा! 🎉\n\nApp download करें: ${window.location.origin}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Zaika Junction Referral',
            text: shareText
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showMessage('Referral message copied! Share करें! 📱', 'success');
        });
    }
}

function showSupport() {
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="support-section">
            <h2>📞 Help & Support</h2>
            
            <div class="support-options">
                <div class="support-card" onclick="startChat()">
                    <div class="support-icon">💬</div>
                    <h3>Live Chat</h3>
                    <p>Chat with our support team</p>
                    <span class="status online">Online</span>
                </div>
                
                <div class="support-card" onclick="callSupport()">
                    <div class="support-icon">📞</div>
                    <h3>Call Us</h3>
                    <p>+91 98765 43210</p>
                    <span class="timing">9 AM - 9 PM</span>
                </div>
                
                <div class="support-card" onclick="emailSupport()">
                    <div class="support-icon">📧</div>
                    <h3>Email</h3>
                    <p>support@zaikajunction.com</p>
                    <span class="response-time">24 hours response</span>
                </div>
                
                <div class="support-card" onclick="whatsappSupport()">
                    <div class="support-icon">📱</div>
                    <h3>WhatsApp</h3>
                    <p>Quick support via WhatsApp</p>
                    <span class="status online">Available</span>
                </div>
            </div>
            
            <div class="faq-section">
                <h3>❓ Frequently Asked Questions</h3>
                <div class="faq-list">
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <h4>Order कैसे track करें? <span class="faq-toggle">+</span></h4>
                        <p class="faq-answer">Orders section में जाकर आप अपना order track कर सकते हैं। आपको real-time updates मिलेंगे।</p>
                    </div>
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <h4>Delivery time क्या है? <span class="faq-toggle">+</span></h4>
                        <p class="faq-answer">Normal delivery time 30-45 minutes है। Peak hours में थोड़ा ज्यादा time लग सकता है।</p>
                    </div>
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <h4>Payment methods कौन से accept करते हैं? <span class="faq-toggle">+</span></h4>
                        <p class="faq-answer">हम UPI, Credit/Debit Cards, Digital Wallets और Cash on Delivery accept करते हैं।</p>
                    </div>
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <h4>Order cancel कैसे करें? <span class="faq-toggle">+</span></h4>
                        <p class="faq-answer">Order confirm होने के 5 minutes के अंदर आप cancel कर सकते हैं। बाद में call करना होगा।</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function toggleFAQ(element) {
    const answer = element.querySelector('.faq-answer');
    const toggle = element.querySelector('.faq-toggle');
    
    if (answer.style.display === 'block') {
        answer.style.display = 'none';
        toggle.textContent = '+';
    } else {
        answer.style.display = 'block';
        toggle.textContent = '-';
    }
}

function startChat() {
    showMessage('Live chat feature coming soon! 💬', 'info');
}

function callSupport() {
    window.location.href = 'tel:+919876543210';
}

function emailSupport() {
    window.location.href = 'mailto:support@zaikajunction.com?subject=Support Request&body=Hi, I need help with...';
}

function whatsappSupport() {
    const message = encodeURIComponent('Hi, I need help with my Zaika Junction order.');
    window.open(`https://wa.me/919876543210?text=${message}`, '_blank');
}

function showFeedback() {
    const modal = document.getElementById('itemModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <div class="feedback-section">
            <h2>⭐ Rate & Review</h2>
            
            <form onsubmit="submitFeedback(event)">
                <div class="rating-section">
                    <h3>Overall Experience</h3>
                    <div class="star-rating" id="overallRating">
                        ${[1,2,3,4,5].map(star => 
                            `<span class="star" onclick="setRating('overall', ${star})">⭐</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="rating-section">
                    <h3>Food Quality</h3>
                    <div class="star-rating" id="foodRating">
                        ${[1,2,3,4,5].map(star => 
                            `<span class="star" onclick="setRating('food', ${star})">⭐</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="rating-section">
                    <h3>Delivery Speed</h3>
                    <div class="star-rating" id="deliveryRating">
                        ${[1,2,3,4,5].map(star => 
                            `<span class="star" onclick="setRating('delivery', ${star})">⭐</span>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Your Review</label>
                    <textarea name="review" placeholder="आपका experience कैसा रहा? कुछ feedback दें..." rows="4"></textarea>
                </div>
                
                <div class="form-group">
                    <label>Suggestions for Improvement</label>
                    <textarea name="suggestions" placeholder="हम कैसे बेहतर कर सकते हैं?" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="recommend">
                        <span>मैं Zaika Junction को दूसरों को recommend करूंगा</span>
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="button" onclick="closeModal()" class="cancel-btn">Cancel</button>
                    <button type="submit" class="submit-btn">Submit Feedback</button>
                </div>
            </form>
        </div>
    `;
    
    modal.style.display = 'block';
}

let feedbackRatings = {
    overall: 0,
    food: 0,
    delivery: 0
};

function setRating(category, rating) {
    feedbackRatings[category] = rating;
    const ratingContainer = document.getElementById(`${category}Rating`);
    const stars = ratingContainer.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.opacity = '1';
            star.style.transform = 'scale(1.2)';
        } else {
            star.style.opacity = '0.3';
            star.style.transform = 'scale(1)';
        }
    });
}

function submitFeedback(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const feedback = {
        id: Date.now(),
        date: new Date().toISOString(),
        ratings: feedbackRatings,
        review: formData.get('review'),
        suggestions: formData.get('suggestions'),
        recommend: formData.get('recommend') === 'on'
    };
    
    // Save feedback (in real app, this would go to server)
    if (!userData.feedback) userData.feedback = [];
    userData.feedback.push(feedback);
    saveUserData();
    
    // Award loyalty points for feedback
    userData.profile.loyaltyPoints += 10;
    saveUserData();
    
    closeModal();
    showMessage('Feedback submit हो गया! 10 loyalty points मिले! 🎉', 'success');
}

// Utility Functions
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
}

// Show notification function for PWA
function showNotification(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// PWA Notification Function
function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, duration);
}

// Enhanced showMessage function for better UX
function showMessage(message, type = 'info') {
    showNotification(message, type);
}

// PWA Utility Functions
function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
}

function isOnline() {
    return navigator.onLine;
}

// Save data to localStorage with error handling
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        showNotification('Storage limit reached. Some data may not be saved.', 'warning');
        return false;
    }
}

// Load data from localStorage with error handling
function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

// Enhanced cart persistence for PWA
function saveCartToStorage() {
    saveToStorage('zaikaJunction_cart', cart);
}

function loadCartFromStorage() {
    const savedCart = loadFromStorage('zaikaJunction_cart', []);
    if (savedCart && Array.isArray(savedCart)) {
        cart = savedCart;
        updateCartDisplay();
        updateCartCount();
    }
}

// Offline order handling
function storeOfflineOrder(orderData) {
    const offlineOrders = loadFromStorage('zaikaJunction_offlineOrders', []);
    const offlineOrder = {
        id: `OFFLINE_${Date.now()}`,
        data: orderData,
        timestamp: new Date().toISOString(),
        synced: false
    };

    offlineOrders.push(offlineOrder);
    saveToStorage('zaikaJunction_offlineOrders', offlineOrders);

    // Add to local orders for display
    const localOrder = {
        id: offlineOrder.id,
        ...orderData,
        status: 'offline',
        createdAt: offlineOrder.timestamp,
        offline: true
    };
    orders.unshift(localOrder);
}

function processOfflineOrders() {
    const offlineOrders = loadFromStorage('zaikaJunction_offlineOrders', []);

    if (offlineOrders.length === 0) return;

    console.log(`Processing ${offlineOrders.length} offline orders...`);

    offlineOrders.forEach(async (offlineOrder, index) => {
        try {
            const order = await submitOrderToServer(offlineOrder.data);

            // Update local order with server response
            const localOrderIndex = orders.findIndex(o => o.id === offlineOrder.id);
            if (localOrderIndex !== -1) {
                orders[localOrderIndex] = order;
                orders[localOrderIndex].wasOffline = true;
            }

            // Remove from offline orders
            offlineOrders.splice(index, 1);
            saveToStorage('zaikaJunction_offlineOrders', offlineOrders);

            console.log(`Offline order ${offlineOrder.id} synced successfully`);
            showMessage(`Offline order synced! Order ID: ${order.id}`, 'success');

        } catch (error) {
            console.error(`Failed to sync offline order ${offlineOrder.id}:`, error);
        }
    });

    // Refresh orders display
    if (currentSection === 'orders') {
        loadOrders();
    }
}

function initPullToRefresh() {
    const mainContent = document.querySelector('.main-content');
    let pullIndicator = null;

    mainContent.addEventListener('touchstart', (e) => {
        if (mainContent.scrollTop === 0) {
            startY = e.touches[0].clientY;
        }
    }, { passive: true });

    mainContent.addEventListener('touchmove', (e) => {
        if (isRefreshing || mainContent.scrollTop > 0) return;

        currentY = e.touches[0].clientY;
        pullDistance = Math.max(0, currentY - startY);

        if (pullDistance > 10) {
            e.preventDefault();
            
            if (!pullIndicator) {
                pullIndicator = createPullIndicator();
                mainContent.insertBefore(pullIndicator, mainContent.firstChild);
            }

            const progress = Math.min(pullDistance / maxPullDistance, 1);
            updatePullIndicator(pullIndicator, progress, pullDistance);
        }
    }, { passive: false });

    mainContent.addEventListener('touchend', (e) => {
        if (pullDistance > maxPullDistance && !isRefreshing) {
            triggerRefresh(pullIndicator);
        } else if (pullIndicator) {
            removePullIndicator(pullIndicator);
            pullIndicator = null;
        }
        
        startY = 0;
        currentY = 0;
        pullDistance = 0;
    }, { passive: true });
}

function createPullIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-indicator';
    indicator.innerHTML = `
        <div class="pull-content">
            <div class="pull-spinner"></div>
            <span class="pull-text">Pull to refresh</span>
        </div>
    `;
    return indicator;
}

function updatePullIndicator(indicator, progress, distance) {
    const content = indicator.querySelector('.pull-content');
    const spinner = indicator.querySelector('.pull-spinner');
    const text = indicator.querySelector('.pull-text');
    
    indicator.style.height = `${Math.min(distance, maxPullDistance)}px`;
    indicator.style.opacity = progress;
    
    if (progress >= 1) {
        text.textContent = 'Release to refresh';
        spinner.style.transform = 'rotate(180deg)';
    } else {
        text.textContent = 'Pull to refresh';
        spinner.style.transform = `rotate(${progress * 180}deg)`;
    }
}

function triggerRefresh(indicator) {
    isRefreshing = true;
    const text = indicator.querySelector('.pull-text');
    const spinner = indicator.querySelector('.pull-spinner');
    
    text.textContent = 'Refreshing...';
    spinner.classList.add('spinning');
    
    // Simulate refresh action
    setTimeout(() => {
        // Refresh menu items
        displayMenuItems();
        
        // Update cart display
        updateCartDisplay();
        
        // Process offline orders
        if (isOnline()) {
            processOfflineOrders();
        }
        
        showNotification('App refreshed! 🔄', 'success');
        
        removePullIndicator(indicator);
        isRefreshing = false;
    }, 1500);
}

function removePullIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.style.transition = 'all 0.3s ease';
        indicator.style.height = '0px';
        indicator.style.opacity = '0';
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 300);
    }
}

// Web Share API functionality
function shareMenuItem(item) {
    if (navigator.share) {
        navigator.share({
            title: `${item.name} - Zaika Junction`,
            text: `Check out this delicious ${item.name} at Zaika Junction! ${item.description}`,
            url: window.location.href
        }).then(() => {
            showNotification('Shared successfully! 📤', 'success');
        }).catch((error) => {
            console.log('Error sharing:', error);
            fallbackShare(item);
        });
    } else {
        fallbackShare(item);
    }
}

function fallbackShare(item) {
    const shareText = `Check out this delicious ${item.name} at Zaika Junction! ${item.description} - ${window.location.href}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Link copied to clipboard! 📋', 'success');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Link copied to clipboard! 📋', 'success');
    }
}

// App update notification
function checkForUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateAvailable();
                        }
                    });
                });
            }
        });
    }
}

function showUpdateAvailable() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-banner';
    updateBanner.innerHTML = `
        <div class="update-content">
            <div class="update-icon">🔄</div>
            <div class="update-text">
                <h3>Update Available</h3>
                <p>A new version of the app is ready</p>
            </div>
            <button class="update-btn" onclick="updateApp()">Update</button>
            <button class="dismiss-update-btn" onclick="dismissUpdate(this.parentElement)">×</button>
        </div>
    `;
    
    document.body.appendChild(updateBanner);
    
    setTimeout(() => {
        updateBanner.classList.add('show');
    }, 100);
}

function updateApp() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        });
    }
}

function dismissUpdate(banner) {
    banner.classList.remove('show');
    setTimeout(() => {
        if (banner.parentNode) {
            banner.parentNode.removeChild(banner);
        }
    }, 300);
}

// Enhanced offline order management
function enhanceOfflineOrderManagement() {
    // Check for pending orders periodically
    setInterval(() => {
        if (isOnline()) {
            const offlineOrders = loadFromStorage('zaikaJunction_offlineOrders', []);
            if (offlineOrders.length > 0) {
                showNotification(`${offlineOrders.length} orders pending sync...`, 'info', 2000);
                processOfflineOrders();
            }
        }
    }, 30000); // Check every 30 seconds
}

// Enhanced PWA functions (called from main init)
function initializePWAFeatures() {
    // Load saved cart
    loadCartFromStorage();
    
    // Initialize pull-to-refresh
    initPullToRefresh();
    
    // Check for app updates
    checkForUpdates();
    
    // Enhanced offline order management
    enhanceOfflineOrderManagement();
    
    // Process offline orders if online
    if (isOnline()) {
        setTimeout(processOfflineOrders, 2000);
    }
    
    // Save cart on every change
    const originalAddToCart = addToCart;
    addToCart = function(itemId) {
        originalAddToCart(itemId);
        saveCartToStorage();
    };
    
    const originalRemoveFromCart = removeFromCart;
    removeFromCart = function(itemId) {
        originalRemoveFromCart(itemId);
        saveCartToStorage();
    };
    
    const originalClearCart = clearCart;
    clearCart = function() {
        originalClearCart();
        saveCartToStorage();
    };
    
    // Show welcome message for PWA users
    if (isPWAInstalled()) {
        setTimeout(() => {
            showNotification('Welcome back to Zaika Junction! 🍯', 'success');
        }, 1000);
    }
}

// ================================
// EXPOSE ALL FUNCTIONS GLOBALLY FOR HTML ONCLICK HANDLERS
// ================================
window.showSection = showSection;
window.showMenu = showMenu;
window.toggleCart = toggleCart;
window.closeModal = closeModal;
window.clearCart = clearCart;
window.proceedToCheckout = proceedToCheckout;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.updateCartQuantity = updateCartQuantity;
window.showItemModal = showItemModal;
window.trackOrder = trackOrder;
window.showAddresses = showAddresses;
window.showPaymentMethods = showPaymentMethods;
window.showOffers = showOffers;
window.showSupport = showSupport;
window.showFeedback = showFeedback;
window.showNotifications = showNotifications;
window.testFunction = testFunction;
window.debugAddresses = debugAddresses;
window.installApp = installApp;
window.showInstallPrompt = showInstallPrompt;
window.showManualInstallInstructions = showManualInstallInstructions;
window.hideInstallButton = hideInstallButton;
window.hideInstallBanner = hideInstallBanner;
window.isPWAInstalled = isPWAInstalled;

console.log('✅ All functions exposed globally!');
console.log('🎉 Zaika Junction Customer App Ready!');
console.log('📝 Cart:', cart);
console.log('🍽️ Menu Items:', menuItems.length);
