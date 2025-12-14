const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');

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
                message: 'All fields are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
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
            message: 'Registration successful!',
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
            message: 'Server error during registration'
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
                message: 'Email and password are required'
            });
        }

        // Find user by email (case insensitive)
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
    console.log('API endpoints:');
    console.log('  POST /api/register');
    console.log('  POST /api/login');
});