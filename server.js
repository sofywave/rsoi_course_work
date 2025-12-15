const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const User = require('./models/User');
const Order = require('./models/Order');

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

// POST /api/orders - Create new order with optional photo uploads
app.post('/api/orders', uploadPhotos.array('photos', 10), async (req, res) => {
    try {
        const { clientId, description, price, deadline } = req.body;

        // Basic validation
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required'
            });
        }

        // Verify client exists and has client role
        const client = await User.findById(clientId);
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

        // Create new order
        const order = new Order({
            client: clientId,
            description,
            price: price ? parseFloat(price) : undefined,
            deadline: deadline ? new Date(deadline) : undefined,
            photos
        });

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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
    console.log('API endpoints:');
    console.log('  POST /api/register');
    console.log('  POST /api/login');
    console.log('  POST /api/orders (create order with photos)');
    console.log('  GET  /api/orders (get orders)');
    console.log('  GET  /api/orders/:id (get single order)');
    console.log('  PUT  /api/orders/:id (update order)');
    console.log('  POST /api/orders/:id/photos (add photos to order)');
    console.log('  DELETE /api/orders/:id/photos/:filename (remove photo)');
});