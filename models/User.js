const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Full name cannot be more than 100 characters']
    },
    phone: {
        type: String,
        trim: true,
        match: [
            /^[\+]?[0-9\-\(\)\s]+$/,
            'Please provide a valid phone number'
        ]
    },
    role: {
        type: String,
        enum: ['admin', 'client', 'master'],
        default: 'client'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for better query performance (email uniqueness is handled by unique: true)

// Virtual for display name (same as fullName)
UserSchema.virtual('displayName').get(function() {
    return this.fullName;
});

// Instance method to check password (will be used with bcrypt)
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await require('bcryptjs').compare(enteredPassword, this.password);
};

// Pre-save middleware to hash password
UserSchema.pre('save', async function() {
    // Only run if password was modified
    if (!this.isModified('password')) {
        return;
    }

    // Hash password with cost of 12
    const salt = await require('bcryptjs').genSalt(12);
    this.password = await require('bcryptjs').hash(this.password, salt);
});

// Static method to find user by email
UserSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model('User', UserSchema);