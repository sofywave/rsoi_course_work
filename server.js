const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Order = require('./models/Order');
// Ensure Counter model is registered
require('./models/Order');

const app = express();
const PORT = process.env.PORT || 3000;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// JWT utility functions
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user._id,
            email: user.email,
            role: user.role,
            fullName: user.fullName
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

// JWT authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = verifyToken(token);

        // Add user info to request object
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            fullName: decoded.fullName
        };

        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

// MongoDB connection
const connectDB = async () => {
    try {
        // MongoDB connection string for MongoDB Compass
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/souvenir_management';
        await mongoose.connect(mongoURI);
        console.log('MongoDB connected successfully via MongoDB Compass');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'uploads/';

        if (file.fieldname === 'photos') {
            uploadPath += 'orders/photos/';
        } else {
            uploadPath += 'orders/documents/';
        }

        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const basename = path.basename(file.originalname, extension);
        cb(null, basename + '-' + uniqueSuffix + extension);
    }
});

// File filter for photos
const photoFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Неподдерживаемый файл. Только JPEG, PNG, GIF, и WebP изображения разрешены.'), false);
    }
};

// Multer upload configurations
const uploadPhotos = multer({
    storage: storage,
    fileFilter: photoFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10 // Maximum 10 photos per upload
    }
});

// Route for the root path - serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route for dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Route for manager/admin dashboard
app.get('/manager-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manager-dashboard.html'));
});

// Route for master dashboard
app.get('/master-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'master-dashboard.html'));
});

// Route for reports page
app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});


// API Routes

// POST /api/register - User registration
app.post('/api/register', async (req, res) => {
    console.log('Registration request received:', req.body);
    try {
        const { name, email, password, phone } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Все поля обязательны для заполнения'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Пароль должен быть не менее 6 символов'
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Пожалуйста, введите корретный email адрес'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким email уже существует'
            });
        }

        // Create new user
        const user = new User({
            email: email.toLowerCase(),
            password, // Will be hashed by pre-save middleware
            fullName: name,
            ...(phone && { phone }), // Add phone only if provided
            // role defaults to 'client' in the model
        });

        // Save user to database
        await user.save();

        console.log('New user registered:', {
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            timestamp: new Date().toISOString()
        });

        // Generate JWT token
        const token = generateToken(user);

        // Return success response with token (same format as login)
        res.status(201).json({
            success: true,
            message: 'Регистрация успешна!',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            },
            token: token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при регистрации'
        });
    }
});

// POST /api/login - User login
app.post('/api/login', async (req, res) => {
    console.log('Login request received:', req.body);
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо ввести email и пароль'
            });
        }

        // Find user by email (case insensitive)
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Вы еще не зарегистрированы. Создайте учетную запись, чтобы войти в систему.'
            });
        }

        // Check password
        const isPasswordValid = await user.matchPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Note: lastLogin update removed to avoid triggering pre-save hook issues
        // If you need lastLogin, add it as a separate field update or use findByIdAndUpdate

        console.log('User logged in:', {
            email: user.email,
            role: user.role,
            timestamp: new Date().toISOString()
        });

        // Generate JWT token
        const token = generateToken(user);

        // Return actual user data (excluding password)
        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            },
            token: token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Order API Routes

// GET /api/product-types - Get available product types with price ranges
app.get('/api/product-types', (req, res) => {
    // Import the PRODUCT_PRICE_MAPPING from the Order model
    const Order = require('./models/Order');
    const productTypes = {};

    // Get the product types from the Order model's PRODUCT_PRICE_MAPPING
    for (const [key, value] of Object.entries(Order.getProductPriceMapping())) {
        productTypes[key] = {
            displayName: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            priceRange: value.range,
            minPrice: value.min,
            maxPrice: value.max
        };
    }

    res.json({
        success: true,
        productTypes: productTypes
    });
});

// POST /api/orders - Create new order with optional photo uploads
app.post('/api/orders', authenticateToken, uploadPhotos.array('photos', 10), async (req, res) => {
    try {
        const { clientId, description, price, deadline, productType } = req.body;

        console.log('Order creation request:', {
            clientId,
            description,
            productType,
            filesCount: req.files ? req.files.length : 0,
            files: req.files ? req.files.map(f => ({ originalName: f.originalname, size: f.size })) : []
        });

        // Basic validation
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required'
            });
        }

        // Verify client exists and has client role
        const client = await User.findById(clientId);
        console.log('Client lookup result:', {
            clientId,
            clientFound: !!client,
            clientRole: client ? client.role : 'not found'
        });

        if (!client || client.role !== 'client') {
            return res.status(400).json({
                success: false,
                message: 'Invalid client ID'
            });
        }

        // Prepare photo data if files were uploaded
        let photos = [];
        if (req.files && req.files.length > 0) {
            photos = req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path,
                alt: `Photo for order ${description || 'New Order'}`
            }));
        }

        // Validate photos
        if (req.files && req.files.length > 0) {
            Order.validatePhotos(req.files);
        }

        // Generate order number
        const orderNumber = await Order.generateOrderNumber();

        // Create new order
        const order = new Order({
            orderNumber,
            client: clientId,
            description,
            price: price ? parseFloat(price) : undefined,
            deadline: deadline ? new Date(deadline) : undefined,
            productType,
            photos
        });

        // Populate price fields
        Order.populatePriceFields(order);

        await order.save();

        // Populate client data for response
        await order.populate('client', 'fullName email phone');

        console.log('New order created:', {
            orderNumber: order.orderNumber,
            client: order.client.fullName,
            photosCount: order.getPhotoCount(),
            timestamp: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: 'Order created successfully!',
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                client: order.client,
                description: order.description,
                price: order.price,
                deadline: order.deadline,
                status: order.status,
                photos: order.photos,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            }
        });

    } catch (error) {
        console.error('Order creation error:', error);

        // Clean up uploaded files if order creation failed
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Server error during order creation'
        });
    }
});

// GET /api/orders - Get orders (filtered by user role)
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { clientId, status, page = 1, limit = 10 } = req.query;
        const userId = req.user.id; // From JWT
        const userRole = req.user.role; // From JWT

        let query = {};

        // Filter based on user role
        if (userRole === 'client') {
            query.client = userId;
        } else if (userRole === 'master') {
            query.assignedTo = userId;
        } else if (userRole === 'admin') {
            // Admin can see all orders
        } else {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Additional filters
        if (clientId) query.client = clientId;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.find(query)
            .populate('client', 'fullName email phone')
            .populate('assignedTo', 'fullName email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            orders: orders.map(order => ({
                id: order._id,
                orderNumber: order.orderNumber,
                client: order.client,
                assignedTo: order.assignedTo,
                status: order.status,
                description: order.description,
                price: order.price,
                deadline: order.deadline,
                photos: order.photos,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                isOverdue: order.isOverdue()
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
});

// GET /api/orders/:id - Get single order
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('client', 'fullName email phone')
            .populate('assignedTo', 'fullName email phone');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check permissions
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole === 'client' && order.client._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                client: order.client,
                assignedTo: order.assignedTo,
                status: order.status,
                description: order.description,
                price: order.price,
                productType: order.productType,
                priceRange: order.priceRange,
                deadline: order.deadline,
                photos: order.photos,
                attachments: order.attachments,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                isOverdue: order.isOverdue(),
                daysUntilDeadline: order.daysUntilDeadline
            }
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching order'
        });
    }
});

// PUT /api/orders/:id - Update order
app.put('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { assignedTo, status, description, price, deadline } = req.body;
        console.log('Order update request:', { orderId: req.params.id, status, userId: req.user.id, userRole: req.user.role });

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('Order found:', { orderId: order._id, currentStatus: order.status, newStatus: status });

        // Check permissions
        const userRole = req.user.role;
        if (userRole !== 'admin' && userRole !== 'master') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Masters can only update orders assigned to them
        if (userRole === 'master' && order.assignedTo?.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update orders assigned to you'
            });
        }

        // Update fields
        if (assignedTo !== undefined) order.assignedTo = assignedTo;
        if (status !== undefined) order.status = status;
        if (description !== undefined) order.description = description;
        if (price !== undefined) order.price = parseFloat(price);
        if (deadline !== undefined) order.deadline = deadline ? new Date(deadline) : undefined;

        await order.save();
        console.log('Order saved successfully:', { orderId: order._id, newStatus: order.status });

        await order.populate('client', 'fullName email phone');
        await order.populate('assignedTo', 'fullName email phone');

        res.json({
            success: true,
            message: 'Order updated successfully',
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                client: order.client,
                assignedTo: order.assignedTo,
                status: order.status,
                description: order.description,
                price: order.price,
                deadline: order.deadline,
                photos: order.photos,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            }
        });

    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error while updating order'
        });
    }
});

// POST /api/orders/:id/photos - Add photos to existing order
app.post('/api/orders/:id/photos', authenticateToken, uploadPhotos.array('photos', 10), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check permissions
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole === 'client' && order.client.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (req.files && req.files.length > 0) {
            const newPhotos = req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path,
                alt: `Additional photo for order ${order.orderNumber}`
            }));

            await order.addPhotos(newPhotos);
        }

        res.json({
            success: true,
            message: 'Photos added successfully',
            photos: order.photos
        });

    } catch (error) {
        console.error('Add photos error:', error);

        // Clean up uploaded files if adding failed
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Server error while adding photos'
        });
    }
});

// DELETE /api/orders/:id/photos/:filename - Remove photo from order
app.delete('/api/orders/:id/photos/:filename', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check permissions
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole === 'client' && order.client.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Find and remove the photo
        const photoToRemove = order.photos.find(photo => photo.filename === req.params.filename);
        if (!photoToRemove) {
            return res.status(404).json({
                success: false,
                message: 'Photo not found'
            });
        }

        // Remove file from filesystem
        if (fs.existsSync(photoToRemove.path)) {
            fs.unlinkSync(photoToRemove.path);
        }

        await order.removePhoto(req.params.filename);

        res.json({
            success: true,
            message: 'Photo removed successfully'
        });

    } catch (error) {
        console.error('Remove photo error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while removing photo'
        });
    }
});

// Manager API Routes

// GET /api/manager/orders - Get all orders for manager dashboard (admin/manager only)
app.get('/api/manager/orders', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {

        const { page = 1, limit = 50, status, clientId, assignedTo } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let query = {};

        // Optional filters
        if (status) query.status = status;
        if (clientId) query.client = clientId;
        if (assignedTo) query.assignedTo = assignedTo;

        const orders = await Order.find(query)
            .populate('client', 'fullName email phone')
            .populate('assignedTo', 'fullName email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            orders: orders.map(order => ({
                id: order._id,
                orderNumber: order.orderNumber,
                client: order.client,
                assignedTo: order.assignedTo,
                status: order.status,
                description: order.description,
                price: order.price,
                deadline: order.deadline,
                productType: order.productType,
                photos: order.photos,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                isOverdue: order.isOverdue(),
                daysUntilDeadline: order.daysUntilDeadline
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get manager orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
});

// Reports API Routes

// GET /api/reports/workload - Get workload report for masters
app.get('/api/reports/workload', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Parse dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date

        // Find all masters
        const masters = await User.find({ role: 'master' }, '_id fullName email');

        const workloadData = [];

        for (const master of masters) {
            // Count orders by status for this master within the date range
            const statusCounts = {};
            let totalOrders = 0;

            const statuses = ['new', 'clarification', 'in_progress', 'awaiting_payment', 'completed', 'delivered', 'cancelled'];

            for (const status of statuses) {
                const count = await Order.countDocuments({
                    assignedTo: master._id,
                    status: status,
                    createdAt: { $gte: start, $lte: end }
                });
                statusCounts[status] = count;
                totalOrders += count;
            }

            if (totalOrders > 0) { // Only include masters with orders
                workloadData.push({
                    masterId: master._id,
                    masterName: master.fullName,
                    statusCounts,
                    totalOrders
                });
            }
        }

        // Sort by total orders descending
        workloadData.sort((a, b) => b.totalOrders - a.totalOrders);

        res.json({
            success: true,
            data: workloadData,
            period: {
                startDate,
                endDate
            }
        });

    } catch (error) {
        console.error('Workload report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating workload report'
        });
    }
});

// GET /api/reports/workload/export - Export workload report as Excel
app.get('/api/reports/workload/export', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Get workload data
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/reports/workload?startDate=${startDate}&endDate=${endDate}`, {
            headers: {
                'Authorization': req.headers.authorization
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        // Create Excel file
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Нагрузка мастеров');

        // Set column headers
        worksheet.columns = [
            { header: 'Мастер', key: 'masterName', width: 30 },
            { header: 'Новые', key: 'new', width: 10 },
            { header: 'Уточнение', key: 'clarification', width: 12 },
            { header: 'В работе', key: 'in_progress', width: 12 },
            { header: 'Ожидает оплаты', key: 'awaiting_payment', width: 15 },
            { header: 'Выполненные', key: 'completed', width: 12 },
            { header: 'Доставленные', key: 'delivered', width: 12 },
            { header: 'Отмененные', key: 'cancelled', width: 12 },
            { header: 'Всего', key: 'total', width: 10 }
        ];

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };

        // Add data
        result.data.forEach(item => {
            worksheet.addRow({
                masterName: item.masterName,
                new: item.statusCounts.new || 0,
                clarification: item.statusCounts.clarification || 0,
                in_progress: item.statusCounts.in_progress || 0,
                awaiting_payment: item.statusCounts.awaiting_payment || 0,
                completed: item.statusCounts.completed || 0,
                delivered: item.statusCounts.delivered || 0,
                cancelled: item.statusCounts.cancelled || 0,
                total: item.totalOrders
            });
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=workload_report_${startDate}_${endDate}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Workload export error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while exporting workload report'
        });
    }
});

// GET /api/reports/production-plan - Get production plan report
app.get('/api/reports/production-plan', authenticateToken, authorizeRoles('admin', 'manager', 'master'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Parse dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date

        // Find all orders with status "in_progress" within the date range
        const orders = await Order.find({
            status: 'in_progress',
            createdAt: { $gte: start, $lte: end }
        }).populate('client', 'fullName').populate('assignedTo', 'fullName');

        // Group orders by product type and count quantities
        const productionData = {};
        const productTypeMapping = Order.getProductPriceMapping();

        orders.forEach(order => {
            const productType = order.productType || 'Не указан';
            const priceRange = order.priceRange || 'Не указан';

            if (!productionData[productType]) {
                productionData[productType] = {
                    productType: productType,
                    priceRange: priceRange,
                    quantity: 0,
                    orders: []
                };
            }

            productionData[productType].quantity += 1;
            productionData[productType].orders.push({
                orderNumber: order.orderNumber,
                clientName: order.client?.fullName || 'Не указан',
                masterName: order.assignedTo?.fullName || 'Не назначен',
                deadline: order.formattedDeadline,
                description: order.description || 'Нет описания'
            });
        });

        // Convert to array and sort by quantity descending
        const productionPlan = Object.values(productionData).sort((a, b) => b.quantity - a.quantity);

        res.json({
            success: true,
            data: productionPlan,
            period: {
                startDate,
                endDate
            },
            totalOrders: orders.length
        });

    } catch (error) {
        console.error('Production plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating production plan'
        });
    }
});

// GET /api/reports/production-plan/export - Export production plan as Excel
app.get('/api/reports/production-plan/export', authenticateToken, authorizeRoles('admin', 'manager', 'master'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Get production plan data
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/reports/production-plan?startDate=${startDate}&endDate=${endDate}`, {
            headers: {
                'Authorization': req.headers.authorization
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        // Create Excel file
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('План производства');

        // Set column headers
        worksheet.columns = [
            { header: 'Тип изделия', key: 'productType', width: 25 },
            { header: 'Ценовой диапазон', key: 'priceRange', width: 20 },
            { header: 'Количество', key: 'quantity', width: 12 },
            { header: 'Заказы', key: 'orders', width: 50 }
        ];

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };

        // Add data
        result.data.forEach(item => {
            const orderNumbers = item.orders.map(order => order.orderNumber).join(', ');
            worksheet.addRow({
                productType: item.productType,
                priceRange: item.priceRange,
                quantity: item.quantity,
                orders: orderNumbers
            });
        });

        // Add summary
        worksheet.addRow({}); // Empty row
        worksheet.addRow({
            productType: 'ИТОГО ЗАКАЗОВ:',
            quantity: result.totalOrders
        });

        // Style summary
        const summaryRow = worksheet.lastRow;
        summaryRow.font = { bold: true };
        summaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFE4B5' }
        };

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=production_plan_${startDate}_${endDate}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Production plan export error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while exporting production plan'
        });
    }
});

// GET /api/reports/financial - Get financial report
app.get('/api/reports/financial', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Parse dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date

        // Find all orders with status "completed" or "delivered" within the date range
        const orders = await Order.find({
            status: { $in: ['completed', 'delivered'] },
            createdAt: { $gte: start, $lte: end },
            price: { $exists: true, $gt: 0 } // Only orders with valid prices
        }).populate('client', 'fullName').populate('assignedTo', 'fullName')
          .sort({ createdAt: -1 }); // Sort by creation date descending

        // Calculate financial metrics
        const totalRevenue = orders.reduce((sum, order) => sum + (order.price || 0), 0);
        const averagePrice = orders.length > 0 ? totalRevenue / orders.length : 0;

        // Format order data for display
        const orderData = orders.map(order => ({
            orderNumber: order.orderNumber,
            clientName: order.client?.fullName || 'Не указан',
            masterName: order.assignedTo?.fullName || 'Не назначен',
            productType: order.productType || 'Не указан',
            status: order.status,
            price: order.price || 0,
            createdAt: order.createdAt.toISOString().split('T')[0],
            completedAt: order.updatedAt.toISOString().split('T')[0]
        }));

        res.json({
            success: true,
            data: {
                orders: orderData,
                summary: {
                    totalOrders: orders.length,
                    totalRevenue: totalRevenue,
                    averagePrice: Math.round(averagePrice * 100) / 100 // Round to 2 decimal places
                }
            },
            period: {
                startDate,
                endDate
            }
        });

    } catch (error) {
        console.error('Financial report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating financial report'
        });
    }
});

// GET /api/reports/financial/export - Export financial report as Excel
app.get('/api/reports/financial/export', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        // Get financial data
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/reports/financial?startDate=${startDate}&endDate=${endDate}`, {
            headers: {
                'Authorization': req.headers.authorization
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        // Create Excel file
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Финансовый отчет');

        // Set column headers
        worksheet.columns = [
            { header: 'Номер заказа', key: 'orderNumber', width: 15 },
            { header: 'Клиент', key: 'clientName', width: 25 },
            { header: 'Мастер', key: 'masterName', width: 25 },
            { header: 'Тип изделия', key: 'productType', width: 20 },
            { header: 'Статус', key: 'status', width: 15 },
            { header: 'Цена (BYN)', key: 'price', width: 12 },
            { header: 'Дата создания', key: 'createdAt', width: 15 },
            { header: 'Дата завершения', key: 'completedAt', width: 15 }
        ];

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6E6FA' }
        };

        // Add order data
        result.data.orders.forEach(order => {
            worksheet.addRow({
                orderNumber: order.orderNumber,
                clientName: order.clientName,
                masterName: order.masterName,
                productType: order.productType,
                status: order.status === 'completed' ? 'Завершен' : 'Доставлен',
                price: order.price,
                createdAt: order.createdAt,
                completedAt: order.completedAt
            });
        });

        // Add summary section
        worksheet.addRow({}); // Empty row
        worksheet.addRow({
            orderNumber: 'ИТОГО ЗАКАЗОВ:',
            price: result.data.summary.totalOrders
        });
        worksheet.addRow({
            orderNumber: 'ОБЩАЯ ВЫРУЧКА (BYN):',
            price: result.data.summary.totalRevenue
        });
        worksheet.addRow({
            orderNumber: 'СРЕДНЯЯ ЦЕНА ЗАКАЗА (BYN):',
            price: result.data.summary.averagePrice
        });

        // Style summary rows
        const summaryStartRow = worksheet.lastRow.number - 2;
        for (let i = 0; i < 3; i++) {
            const row = worksheet.getRow(summaryStartRow + i);
            row.font = { bold: true };
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE4B5' }
            };
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=financial_report_${startDate}_${endDate}.xlsx`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Financial export error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while exporting financial report'
        });
    }
});

// User Profile API Routes

// GET /api/users/debug - Debug endpoint to check users
app.get('/api/users/debug', async (req, res) => {
    try {
        const users = await User.find({}, '_id email fullName role');
        res.json({
            success: true,
            users: users.map(u => ({
                id: u._id,
                email: u.email,
                fullName: u.fullName,
                role: u.role
            })),
            total: users.length
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ success: false, message: 'Debug error' });
    }
});

// GET /api/debug/orders - Debug endpoint to check orders
app.get('/api/debug/orders', async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('client', 'fullName email')
            .populate('assignedTo', 'fullName email role')
            .select('orderNumber status assignedTo client createdAt');

        res.json({
            success: true,
            orders: orders.map(o => ({
                id: o._id,
                orderNumber: o.orderNumber,
                status: o.status,
                client: o.client,
                assignedTo: o.assignedTo,
                createdAt: o.createdAt
            })),
            total: orders.length
        });
    } catch (error) {
        console.error('Orders debug error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/users/masters - Get all masters for assignment
app.get('/api/users/masters', async (req, res) => {
    try {
        const masters = await User.find({ role: 'master' }, '_id fullName');
        res.json({
            success: true,
            masters: masters.map(m => ({
                id: m._id,
                fullName: m.fullName
            }))
        });
    } catch (error) {
        console.error('Error fetching masters:', error);
        res.status(500).json({ success: false, message: 'Error fetching masters' });
    }
});

// GET /api/manager/users - Get all users for manager dashboard (admin/manager only)
app.get('/api/manager/users', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {

        const { page = 1, limit = 50, role, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let query = {};

        // Optional filters
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('_id email fullName role phone createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                createdAt: user.createdAt
            })),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// PATCH /api/users/:id/role - Update user role (admin/manager only)
app.patch('/api/users/:id/role', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    console.log('Role update request received:', req.body);
    try {

        const userId = req.params.id;
        const { role } = req.body;

        // Validate role
        const validRoles = ['client', 'master', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Недопустимая роль пользователя'
            });
        }

        // Find and update user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        // Prevent changing admin role unless the current user is admin
        if (user.role === 'admin' && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Только администратор может изменять роли других администраторов'
            });
        }

        // Update user role
        user.role = role;
        await user.save();

        console.log('User role updated:', {
            userId: user._id,
            email: user.email,
            oldRole: user.role,
            newRole: role,
            updatedBy: req.user.id,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Роль пользователя успешно обновлена',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Role update error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении роли пользователя'
        });
    }
});

// PUT /api/users/profile - Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    console.log('Profile update request received:', req.body);
    try {
        const userId = req.user.id; // From JWT

        // For now, let's try to find user by email if ID doesn't work (fallback for development)
        let user = await User.findById(userId).select('+password');

        if (!user && req.body.email) {
            console.log('User not found by ID, trying email fallback:', req.body.email);
            user = await User.findOne({ email: req.body.email }).select('+password');
        }

        if (!user) {
            console.log('User not found with ID:', userId);
            console.log('Available users in database:');
            const allUsers = await User.find({}, '_id email fullName');
            console.log(allUsers.map(u => ({ id: u._id, email: u.email, fullName: u.fullName })));

            return res.status(404).json({
                success: false,
                message: 'User not found. Please try logging out and logging back in.'
            });
        }

        console.log('User found:', { id: user._id, email: user.email, fullName: user.fullName });

        const { fullName, email, currentPassword, newPassword } = req.body;

        // Handle password change
        if (currentPassword && newPassword) {
            console.log('Password change requested');
            console.log('Current password provided:', !!currentPassword);
            console.log('New password length:', newPassword.length);

            // Verify current password
            console.log('Stored password hash exists:', !!user.password);
            console.log('Stored password hash length:', user.password ? user.password.length : 0);
            const isCurrentPasswordValid = await user.matchPassword(currentPassword);
            console.log('Current password valid:', isCurrentPasswordValid);

            if (!isCurrentPasswordValid) {
                console.log('Current password verification failed');
                return res.status(400).json({
                    success: false,
                    message: 'Текущий пароль неверен'
                });
            }

            // Validate new password
            if (newPassword.length < 6) {
                console.log('New password too short');
                return res.status(400).json({
                    success: false,
                    message: 'Новый пароль должен быть не менее 6 символов'
                });
            }

            console.log('Updating password...');
            // Update password
            user.password = newPassword;
        } else {
            console.log('No password change requested');
        }

        // Handle profile information update
        if (fullName !== undefined) {
            if (!fullName.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Имя и фамилия обязательны'
                });
            }
            user.fullName = fullName.trim();
        }

        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Пожалуйста, введите корректный email адрес'
                });
            }

            // Check if email is already taken by another user
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: user._id }
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Этот email уже используется другим пользователем'
                });
            }

            user.email = email.toLowerCase();
        }

        // Save updated user
        await user.save();

        console.log('Profile updated for user:', {
            userId: user._id,
            email: user.email,
            fullName: user.fullName,
            timestamp: new Date().toISOString()
        });

        // Return success response with updated user data
        res.json({
            success: true,
            message: 'Профиль успешно обновлен',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении профиля'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
    console.log('API endpoints:');
    console.log('  POST /api/register');
    console.log('  POST /api/login');
    console.log('  GET  /api/users/debug (debug users)');
    console.log('  GET  /api/debug/orders (debug orders)');
    console.log('  GET  /api/users/masters (get all masters)');
    console.log('  GET  /api/manager/users (get all users for manager)');
    console.log('  GET  /reports (reports page)');
    console.log('  PATCH /api/users/:id/role (update user role)');
    console.log('  PUT   /api/users/profile (update user profile)');
    console.log('  POST /api/orders (create order with photos)');
    console.log('  GET  /api/orders (get orders)');
    console.log('  GET  /api/orders/:id (get single order)');
    console.log('  PUT  /api/orders/:id (update order)');
    console.log('  POST /api/orders/:id/photos (add photos to order)');
    console.log('  DELETE /api/orders/:id/photos/:filename (remove photo)');
    console.log('  GET  /api/manager/orders (get all orders for manager)');
});