const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enhanced Socket.IO configuration
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? ["https://zaika-mhby.onrender.com"] 
            : "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security and Performance Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ["https://zaika-mhby.onrender.com"] 
        : "*",
    credentials: true
}));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Static file serving with caching
app.use(express.static('customer', {
    maxAge: NODE_ENV === 'production' ? '1d' : '0',
    etag: true
}));
app.use('/restaurant', express.static('restaurant', {
    maxAge: NODE_ENV === 'production' ? '1d' : '0',
    etag: true
}));

// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// In-memory data storage (in production, use a database)
let orders = [];
let menuItems = [];
let restaurants = [];
let customers = [];
let notifications = [];

// Sample data initialization
const initializeData = () => {
    menuItems = [
        {
            id: 1,
            name: "Gulab Jamun",
            category: "sweets",
            price: 120,
            description: "Soft, spongy balls soaked in aromatic sugar syrup",
            emoji: "🍯",
            rating: 4.8,
            popular: true,
            available: true,
            preparationTime: 15
        },
        {
            id: 2,
            name: "Rasgulla",
            category: "sweets",
            price: 100,
            description: "Spongy cottage cheese balls in light sugar syrup",
            emoji: "🥛",
            rating: 4.6,
            available: true,
            preparationTime: 10
        },
        {
            id: 3,
            name: "Kaju Katli",
            category: "sweets",
            price: 300,
            description: "Premium cashew fudge with silver leaf",
            emoji: "💎",
            rating: 4.9,
            premium: true,
            available: true,
            preparationTime: 20
        },
        {
            id: 4,
            name: "Samosa",
            category: "snacks",
            price: 25,
            description: "Crispy triangular pastry with spiced potato filling",
            emoji: "🥟",
            rating: 4.5,
            available: true,
            preparationTime: 8
        },
        {
            id: 5,
            name: "Bhel Puri",
            category: "snacks",
            price: 40,
            description: "Mumbai street food with puffed rice and chutneys",
            emoji: "🥗",
            rating: 4.3,
            available: true,
            preparationTime: 5
        }
    ];

    restaurants = [
        {
            id: 'zaika-main',
            name: 'Zaika Junction',
            address: 'MG Road, Delhi',
            phone: '+91 98765 43210',
            email: 'orders@zaikajunction.com',
            status: 'open',
            openTime: '09:00',
            closeTime: '22:00'
        }
    ];
};

// Initialize data
initializeData();

// Utility functions
const validateOrderData = (orderData) => {
    const errors = [];
    
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        errors.push('Items are required and must be a non-empty array');
    }
    
    if (typeof orderData.total !== 'number' || orderData.total <= 0) {
        errors.push('Total must be a positive number');
    }
    
    if (!orderData.customerInfo || !orderData.customerInfo.name) {
        errors.push('Customer name is required');
    }
    
    orderData.items?.forEach((item, index) => {
        if (!item.name || typeof item.name !== 'string') {
            errors.push(`Item ${index + 1}: name is required`);
        }
        if (typeof item.price !== 'number' || item.price <= 0) {
            errors.push(`Item ${index + 1}: price must be a positive number`);
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
            errors.push(`Item ${index + 1}: quantity must be a positive number`);
        }
    });
    
    return errors;
};

const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/[<>]/g, '')
              .trim();
};

const calculateEstimatedTime = (items) => {
    if (!items || !Array.isArray(items)) return 30;
    
    const baseTime = 15; // Base preparation time
    const itemTime = items.reduce((total, item) => {
        const menuItem = menuItems.find(mi => mi.id === item.id);
        return total + ((menuItem?.preparationTime || 10) * item.quantity);
    }, 0);
    
    return Math.min(Math.max(baseTime + Math.ceil(itemTime / 2), 15), 60);
};

// Initialize data
initializeData();

// Routes

// Serve Customer App
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer', 'index.html'));
});

app.get('/customer', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer', 'index.html'));
});

// Serve Restaurant App
app.get('/restaurant', (req, res) => {
    res.sendFile(path.join(__dirname, 'restaurant', 'index.html'));
});

// API Routes

// Menu APIs
app.get('/api/menu', (req, res) => {
    res.json({
        success: true,
        data: menuItems
    });
});

app.post('/api/menu', (req, res) => {
    const newItem = {
        id: Date.now(),
        ...req.body,
        available: true
    };
    menuItems.push(newItem);
    
    // Notify all connected clients about menu update
    io.emit('menuUpdated', menuItems);
    
    res.json({
        success: true,
        data: newItem
    });
});

app.put('/api/menu/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const itemIndex = menuItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        menuItems[itemIndex] = { ...menuItems[itemIndex], ...req.body };
        
        // Notify all connected clients about menu update
        io.emit('menuUpdated', menuItems);
        
        res.json({
            success: true,
            data: menuItems[itemIndex]
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Menu item not found'
        });
    }
});

app.delete('/api/menu/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const itemIndex = menuItems.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        menuItems.splice(itemIndex, 1);
        
        // Notify all connected clients about menu update
        io.emit('menuUpdated', menuItems);
        
        res.json({
            success: true,
            message: 'Menu item deleted'
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Menu item not found'
        });
    }
});

// Order APIs
app.get('/api/orders', (req, res) => {
    res.json({
        success: true,
        data: orders
    });
});

app.post('/api/orders', (req, res) => {
    try {
        // Validate order data
        const validationErrors = validateOrderData(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        // Sanitize customer info
        const sanitizedCustomerInfo = {
            ...req.body.customerInfo,
            name: sanitizeString(req.body.customerInfo.name),
            phone: sanitizeString(req.body.customerInfo.phone),
            address: req.body.customerInfo.address ? {
                ...req.body.customerInfo.address,
                fullAddress: sanitizeString(req.body.customerInfo.address.fullAddress)
            } : null
        };
        
        // Create new order with enhanced data
        const newOrder = {
            id: `ORD${Date.now()}`,
            items: req.body.items.map(item => ({
                ...item,
                name: sanitizeString(item.name)
            })),
            total: Number(req.body.total),
            customerInfo: sanitizedCustomerInfo,
            paymentMethod: sanitizeString(req.body.paymentMethod) || 'COD',
            deliveryCharge: Number(req.body.deliveryCharge) || 0,
            status: 'pending',
            createdAt: new Date().toISOString(),
            estimatedTime: calculateEstimatedTime(req.body.items),
            orderNumber: orders.length + 1
        };
        
        orders.unshift(newOrder);
        
        // Notify restaurant about new order
        io.emit('newOrder', newOrder);
        
        // Send confirmation to customer
        io.emit('orderConfirmed', {
            orderId: newOrder.id,
            estimatedTime: newOrder.estimatedTime,
            orderNumber: newOrder.orderNumber
        });
        
        console.log(`✅ New order created: ${newOrder.id} - ₹${newOrder.total}`);
        
        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: newOrder
        });
        
    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

app.put('/api/orders/:id/status', (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex !== -1) {
        orders[orderIndex].status = status;
        orders[orderIndex].updatedAt = new Date().toISOString();
        
        // Notify customer about status update
        io.emit('orderStatusUpdate', {
            orderId: orderId,
            status: status,
            order: orders[orderIndex]
        });
        
        res.json({
            success: true,
            data: orders[orderIndex]
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }
});

// Restaurant APIs
app.get('/api/restaurant/stats', (req, res) => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => 
        new Date(order.createdAt).toDateString() === today
    );
    
    const stats = {
        totalOrders: orders.length,
        todayOrders: todayOrders.length,
        pendingOrders: orders.filter(order => order.status === 'pending').length,
        completedOrders: orders.filter(order => order.status === 'delivered').length,
        totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
        todayRevenue: todayOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    };
    
    res.json({
        success: true,
        data: stats
    });
});

// Utility functions
function calculateEstimatedTime(items) {
    if (!items || items.length === 0) return 30;
    
    const maxPrepTime = Math.max(...items.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.id);
        return menuItem ? menuItem.preparationTime : 15;
    // Join room based on user type
    socket.on('joinRoom', (data) => {
        try {
            const { userType, userId } = data;
            const roomName = `${userType}_room`;
            
            socket.join(roomName);
            connectedUsers.set(socket.id, { userType, userId, roomName });
            
            console.log(`User ${userId} joined ${userType} room`);
            
            // Send welcome message
            socket.emit('connected', {
                message: `Welcome to ZaikaJunction ${userType} app!`,
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });
            
            // Update connection stats
            const stats = {
                customers: Array.from(connectedUsers.values()).filter(u => u.userType === 'customer').length,
                restaurants: Array.from(connectedUsers.values()).filter(u => u.userType === 'restaurant').length,
                total: connectedUsers.size
            };
            
            io.emit('connectionStats', stats);
            
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });
    
    // Handle order tracking
    socket.on('trackOrder', (orderId) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                socket.emit('orderTrackingUpdate', {
                    orderId: orderId,
                    status: order.status,
                    estimatedTime: order.estimatedTime,
                    createdAt: order.createdAt
                });
            } else {
                socket.emit('orderNotFound', { orderId });
            }
        } catch (error) {
            console.error('Error tracking order:', error);
            socket.emit('error', { message: 'Failed to track order' });
        const order = orders.find(o => o.id === orderId);
        if (order) {
            socket.emit('orderUpdate', order);
        }
    });
    
    // Handle restaurant actions
    socket.on('updateOrderStatus', (data) => {
        const { orderId, status } = data;
        const orderIndex = orders.findIndex(order => order.id === orderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex].status = status;
            orders[orderIndex].updatedAt = new Date().toISOString();
            
            // Notify all clients about the update
            io.emit('orderStatusUpdate', {
                orderId: orderId,
                status: status,
                order: orders[orderIndex]
            });
        }
    });
    
    // Handle menu item availability toggle
    socket.on('toggleItemAvailability', (data) => {
        const { itemId, available } = data;
        const itemIndex = menuItems.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            menuItems[itemIndex].available = available;
            io.emit('menuUpdated', menuItems);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Zaika Junction Server running on port ${PORT}`);
    console.log(`📱 Customer App: http://localhost:${PORT}/`);
    console.log(`🏪 Restaurant App: http://localhost:${PORT}/restaurant`);
    console.log(`📊 API Endpoints: http://localhost:${PORT}/api/`);
    console.log(`🔗 Socket.IO: http://localhost:${PORT}/socket.io/`);
    console.log(`\n✅ Server ready for connections!`);
});

module.exports = { app, server, io };
