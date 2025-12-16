const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const User = require('./models/User');
const Order = require('./models/Order');
// Ensure Counter model is registered
require('./models/Order');

const app = express();
const PORT = process.env.PORT || 3000;

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
            token: 'mock-jwt-token-' + Date.now() // In production, generate a real JWT
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
            token: 'mock-jwt-token-' + Date.now() // In production, generate a real JWT
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
app.post('/api/orders', uploadPhotos.array('photos', 10), async (req, res) => {
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
app.get('/api/orders', async (req, res) => {
    try {
        const { clientId, status, page = 1, limit = 10 } = req.query;
        const userId = req.headers['user-id']; // In production, get from JWT
        const userRole = req.headers['user-role']; // In production, get from JWT

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
app.get('/api/orders/:id', async (req, res) => {
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

        // Check permissions (simplified - in production use JWT)
        const userId = req.headers['user-id'];
        const userRole = req.headers['user-role'];

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
app.put('/api/orders/:id', async (req, res) => {
    try {
        const { assignedTo, status, description, price, deadline } = req.body;

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check permissions (simplified - in production use JWT)
        const userRole = req.headers['user-role'];
        if (userRole !== 'admin' && userRole !== 'master') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Update fields
        if (assignedTo !== undefined) order.assignedTo = assignedTo;
        if (status !== undefined) order.status = status;
        if (description !== undefined) order.description = description;
        if (price !== undefined) order.price = parseFloat(price);
        if (deadline !== undefined) order.deadline = deadline ? new Date(deadline) : undefined;

        await order.save();
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
app.post('/api/orders/:id/photos', uploadPhotos.array('photos', 10), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check permissions
        const userId = req.headers['user-id'];
        const userRole = req.headers['user-role'];

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
app.delete('/api/orders/:id/photos/:filename', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check permissions
        const userId = req.headers['user-id'];
        const userRole = req.headers['user-role'];

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
app.get('/api/manager/orders', async (req, res) => {
    try {
        const userRole = req.headers['user-role']; // In production, get from JWT

        // Check if user has manager/admin permissions
        if (userRole !== 'admin' && userRole !== 'manager') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Manager or admin role required.'
            });
        }

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
app.get('/api/manager/users', async (req, res) => {
    try {
        const userRole = req.headers['user-role']; // In production, get from JWT

        // Check if user has manager/admin permissions
        if (userRole !== 'admin' && userRole !== 'manager') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Manager or admin role required.'
            });
        }

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

// PUT /api/users/profile - Update user profile
app.put('/api/users/profile', async (req, res) => {
    console.log('Profile update request received:', req.body);
    console.log('Headers:', { 'user-id': req.headers['user-id'], 'user-role': req.headers['user-role'] });
    try {
        // Mock authentication - in production, verify JWT token
        const userId = req.headers['user-id']; // In production, get from JWT
        if (!userId) {
            console.log('No user-id in headers');
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

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
    console.log('  GET  /api/users/masters (get all masters)');
    console.log('  GET  /api/manager/users (get all users for manager)');
    console.log('  PUT  /api/users/profile (update user profile)');
    console.log('  POST /api/orders (create order with photos)');
    console.log('  GET  /api/orders (get orders)');
    console.log('  GET  /api/orders/:id (get single order)');
    console.log('  PUT  /api/orders/:id (update order)');
    console.log('  POST /api/orders/:id/photos (add photos to order)');
    console.log('  DELETE /api/orders/:id/photos/:filename (remove photo)');
    console.log('  GET  /api/manager/orders (get all orders for manager)');
});