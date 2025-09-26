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

const PORT = process.env.PORT || 8000;
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

// Static file serving with caching - serve all files from root
app.use(express.static('.', {
    maxAge: NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    index: false // Don't serve index.html automatically
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
const connectedUsers = new Map();

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

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV
    });
});

// Serve Customer App
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/customer', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve Restaurant App
app.get('/restaurant', (req, res) => {
    res.sendFile(path.join(__dirname, 'index2.html'));
});

// API Routes

// Menu APIs
app.get('/api/menu', (req, res) => {
    try {
        res.json({
            success: true,
            data: menuItems,
            count: menuItems.length
        });
    } catch (error) {
        console.error('❌ Error fetching menu:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch menu'
        });
    }
});

app.post('/api/menu', (req, res) => {
    try {
        const newItem = {
            id: Date.now(),
            ...req.body,
            available: true,
            createdAt: new Date().toISOString()
        };
        menuItems.push(newItem);

        // Notify all connected clients about menu update
        io.emit('menuUpdated', menuItems);

        console.log(`✅ New menu item added: ${newItem.name}`);

        res.status(201).json({
            success: true,
            message: 'Menu item added successfully',
            data: newItem
        });
    } catch (error) {
        console.error('❌ Error adding menu item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add menu item'
        });
    }
});

app.put('/api/menu/:id', (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        const itemIndex = menuItems.findIndex(item => item.id === itemId);

        if (itemIndex !== -1) {
            menuItems[itemIndex] = {
                ...menuItems[itemIndex],
                ...req.body,
                updatedAt: new Date().toISOString()
            };

            // Notify all connected clients about menu update
            io.emit('menuUpdated', menuItems);

            console.log(`✅ Menu item updated: ${menuItems[itemIndex].name}`);

            res.json({
                success: true,
                message: 'Menu item updated successfully',
                data: menuItems[itemIndex]
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
    } catch (error) {
        console.error('❌ Error updating menu item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update menu item'
        });
    }
});

app.delete('/api/menu/:id', (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        const itemIndex = menuItems.findIndex(item => item.id === itemId);

        if (itemIndex !== -1) {
            const deletedItem = menuItems.splice(itemIndex, 1)[0];

            // Notify all connected clients about menu update
            io.emit('menuUpdated', menuItems);

            console.log(`✅ Menu item deleted: ${deletedItem.name}`);

            res.json({
                success: true,
                message: 'Menu item deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
    } catch (error) {
        console.error('❌ Error deleting menu item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete menu item'
        });
    }
});

// Order APIs
app.get('/api/orders', (req, res) => {
    try {
        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
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

        // Get connected users count for debugging
        const restaurantUsers = Array.from(connectedUsers.values()).filter(u => u.userType === 'restaurant');
        const customerUsers = Array.from(connectedUsers.values()).filter(u => u.userType === 'customer');

        console.log(`📡 Connected users - Restaurants: ${restaurantUsers.length}, Customers: ${customerUsers.length}`);

        // Notify restaurant about new order
        console.log('📡 Broadcasting new order to restaurant_room');
        const restaurantEmitResult = io.to('restaurant_room').emit('newOrder', newOrder);
        console.log('📡 Restaurant emit result:', restaurantEmitResult);

        // Send confirmation to customer who placed the order
        console.log('📡 Broadcasting order confirmation to customer_room');
        const customerEmitResult = io.to('customer_room').emit('orderConfirmed', {
            orderId: newOrder.id,
            estimatedTime: newOrder.estimatedTime,
            orderNumber: newOrder.orderNumber
        });
        console.log('📡 Customer emit result:', customerEmitResult);

        // Also emit to all connected clients for debugging
        io.emit('orderCreated', {
            orderId: newOrder.id,
            status: 'created',
            timestamp: new Date().toISOString(),
            connectedUsers: connectedUsers.size
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
            error: NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

app.put('/api/orders/:id/status', (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const orderIndex = orders.findIndex(order => order.id === orderId);

        if (orderIndex !== -1) {
            orders[orderIndex].status = status;
            orders[orderIndex].updatedAt = new Date().toISOString();

            // Notify customer about status update
            console.log(`📡 Broadcasting status update for order ${orderId} to customer_room`);
            const statusUpdateResult = io.to('customer_room').emit('orderStatusUpdate', {
                orderId: orderId,
                status: status,
                order: orders[orderIndex]
            });
            console.log('📡 Status update emit result:', statusUpdateResult);

            // Also emit to all connected clients for debugging
            io.emit('orderStatusChanged', {
                orderId: orderId,
                status: status,
                timestamp: new Date().toISOString(),
                connectedUsers: connectedUsers.size
            });

            console.log(`✅ Order ${orderId} status updated to: ${status}`);

            res.json({
                success: true,
                message: 'Order status updated successfully',
                data: orders[orderIndex]
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
    } catch (error) {
        console.error('❌ Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
});

// Restaurant APIs
app.get('/api/restaurant/stats', (req, res) => {
    try {
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
            todayRevenue: todayOrders.reduce((sum, order) => sum + (order.total || 0), 0),
            connectedUsers: {
                customers: Array.from(connectedUsers.values()).filter(u => u.userType === 'customer').length,
                restaurants: Array.from(connectedUsers.values()).filter(u => u.userType === 'restaurant').length,
                total: connectedUsers.size
            }
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error fetching restaurant stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch restaurant stats'
        });
    }
});

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Join room based on user type
    socket.on('joinRoom', (data) => {
        try {
            console.log(`🔌 Join room request from ${socket.id}:`, data);

            if (!data || !data.userType) {
                throw new Error('Invalid join room data - userType required');
            }

            const { userType, userId } = data;
            const roomName = `${userType}_room`;

            // Leave any existing rooms first
            const existingUser = connectedUsers.get(socket.id);
            if (existingUser && existingUser.roomName) {
                socket.leave(existingUser.roomName);
                console.log(`👤 ${socket.id} left previous room: ${existingUser.roomName}`);
            }

            // Join new room
            socket.join(roomName);
            connectedUsers.set(socket.id, { userType, userId, roomName, joinedAt: new Date().toISOString() });

            console.log(`👤 ${userType} joined room: ${roomName} (${socket.id})`);
            console.log(`📊 Room ${roomName} now has ${io.sockets.adapter.rooms.get(roomName)?.size || 0} members`);

            // Send welcome message
            socket.emit('connected', {
                message: `Welcome to Zaika Junction ${userType} app!`,
                socketId: socket.id,
                roomName: roomName,
                timestamp: new Date().toISOString()
            });

            // Update connection stats
            const stats = {
                customers: Array.from(connectedUsers.values()).filter(u => u.userType === 'customer').length,
                restaurants: Array.from(connectedUsers.values()).filter(u => u.userType === 'restaurant').length,
                total: connectedUsers.size,
                rooms: {
                    customer_room: io.sockets.adapter.rooms.get('customer_room')?.size || 0,
                    restaurant_room: io.sockets.adapter.rooms.get('restaurant_room')?.size || 0
                }
            };

            console.log('📊 Connection stats:', stats);
            io.emit('connectionStats', stats);

        } catch (error) {
            console.error('❌ Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room: ' + error.message });
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
            console.error('❌ Error tracking order:', error);
            socket.emit('error', { message: 'Failed to track order' });
        }
    });

    // Handle menu item availability toggle
    socket.on('toggleItemAvailability', (data) => {
        try {
            const { itemId, available } = data;
            const itemIndex = menuItems.findIndex(item => item.id === itemId);

            if (itemIndex !== -1) {
                menuItems[itemIndex].available = available;

                // Notify all clients about menu update
                io.emit('menuUpdated', menuItems);

                console.log(`🍽️ Menu item ${itemId} availability: ${available}`);
            }
        } catch (error) {
            console.error('❌ Error toggling item availability:', error);
            socket.emit('error', { message: 'Failed to update menu item' });
        }
    });

    // Handle test events
    socket.on('test', (data) => {
        console.log('🧪 Test event received:', data);
        socket.emit('testResponse', {
            message: 'Test successful',
            timestamp: new Date().toISOString(),
            originalData: data
        });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            console.log(`🔌 ${user.userType} disconnected: ${socket.id} (${reason})`);

            // Leave room
            if (user.roomName) {
                socket.leave(user.roomName);
                console.log(`👤 ${socket.id} left room: ${user.roomName}`);
            }

            connectedUsers.delete(socket.id);

            // Update connection stats
            const stats = {
                customers: Array.from(connectedUsers.values()).filter(u => u.userType === 'customer').length,
                restaurants: Array.from(connectedUsers.values()).filter(u => u.userType === 'restaurant').length,
                total: connectedUsers.size,
                rooms: {
                    customer_room: io.sockets.adapter.rooms.get('customer_room')?.size || 0,
                    restaurant_room: io.sockets.adapter.rooms.get('restaurant_room')?.size || 0
                }
            };

            console.log('📊 Updated connection stats after disconnect:', stats);
            io.emit('connectionStats', stats);
        } else {
            console.log(`🔌 Unknown user disconnected: ${socket.id} (${reason})`);
        }
    });

    // Handle connection errors
    socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Global error:', err.stack);
    res.status(500).json({
        success: false,
        message: NODE_ENV === 'development' ? err.message : 'Something went wrong!',
        error: NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`\n🚀 Zaika Junction Server running on port ${PORT}`);
    console.log(`📱 Customer App: http://localhost:${PORT}/`);
    console.log(`🏪 Restaurant App: http://localhost:${PORT}/restaurant`);
    console.log(`📊 API Endpoints: http://localhost:${PORT}/api/`);
    console.log(`🔗 Socket.IO: http://localhost:${PORT}/socket.io/`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔍 Debug Console: http://localhost:${PORT}/debug-realtime.html`);
    console.log(`🧪 Test Console: http://localhost:${PORT}/test-realtime.html`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`\n✅ Server ready for real-time connections!`);
    console.log(`📡 Socket.IO rooms will be: customer_room, restaurant_room`);
    console.log(`🔧 Real-time features: Order updates, Menu changes, Status notifications\n`);
});

module.exports = { app, server, io };
