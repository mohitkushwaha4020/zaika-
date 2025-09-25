const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('customer'));
app.use('/restaurant', express.static('restaurant'));

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
    const newOrder = {
        id: `ORD${Date.now()}`,
        ...req.body,
        status: 'pending',
        createdAt: new Date().toISOString(),
        estimatedTime: calculateEstimatedTime(req.body.items)
    };
    
    orders.unshift(newOrder);
    
    // Notify restaurant about new order
    io.emit('newOrder', newOrder);
    
    // Send confirmation to customer
    io.emit('orderConfirmed', {
        orderId: newOrder.id,
        estimatedTime: newOrder.estimatedTime
    });
    
    res.json({
        success: true,
        data: newOrder
    });
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
    }));
    
    return Math.max(maxPrepTime + 10, 20); // Add 10 minutes buffer, minimum 20 minutes
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Join room based on user type
    socket.on('joinRoom', (data) => {
        const { userType, userId } = data;
        socket.join(userType);
        console.log(`User ${userId} joined ${userType} room`);
    });
    
    // Handle order tracking
    socket.on('trackOrder', (orderId) => {
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
