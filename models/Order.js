const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
        
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Client is required']
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: {
            values: ['new', 'clarification', 'in_progress', 'awaiting_payment', 'completed', 'delivered', 'cancelled'],
            message: 'Status must be one of: new, clarification, in_progress, awaiting_payment, completed, delivered, cancelled'
        },
        default: 'new'
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    price: {
        type: Number,
        min: [0, 'Price cannot be negative']
    },
    deadline: {
        type: Date
    },
    attachments: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
        type: {
            type: String,
            enum: ['photo', 'document', 'other'],
            default: 'other'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    photos: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
        url: String, // Virtual URL for accessing the photo
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        alt: String // Alternative text for accessibility
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Counter schema for tracking order numbers per year
const CounterSchema = new mongoose.Schema({
    year: {
        type: Number,
        required: true,
        unique: true,
    },
    sequence: {
        type: Number,
        default: 0
    }
});

const Counter = mongoose.model('Counter', CounterSchema);

// Pre-save middleware to generate order number
OrderSchema.pre('save', async function() {
    if (this.isNew) {
        const currentYear = new Date().getFullYear();

        // Find and increment the counter for current year
        const counter = await Counter.findOneAndUpdate(
            { year: currentYear },
            { $inc: { sequence: 1 } },
            { new: true, upsert: true }
        );

        // Generate order number: ЗК-ГГГГ-ХХХ
        const sequenceStr = counter.sequence.toString().padStart(3, '0');
        this.orderNumber = `ЗК-${currentYear}-${sequenceStr}`;
    }
});

// Pre-save validation for photos
OrderSchema.pre('save', function(next) {
    // Validate photo attachments
    if (this.photos && this.photos.length > 0) {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        for (const photo of this.photos) {
            if (!allowedMimes.includes(photo.mimetype)) {
                return next(new Error(`Invalid file type for photo: ${photo.mimetype}. Only JPEG, PNG, GIF, and WebP are allowed.`));
            }
            if (photo.size > maxSize) {
                return next(new Error(`Photo file size too large: ${photo.originalName}. Maximum size is 5MB.`));
            }
        }
    }
    next();
});

// Virtual for formatted deadline
OrderSchema.virtual('formattedDeadline').get(function() {
    if (this.deadline) {
        return this.deadline.toLocaleDateString('ru-RU');
    }
    return null;
});

// Virtual for days until deadline
OrderSchema.virtual('daysUntilDeadline').get(function() {
    if (this.deadline) {
        const now = new Date();
        const diffTime = this.deadline - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    return null;
});

// Instance method to check if order is overdue
OrderSchema.methods.isOverdue = function() {
    if (this.deadline && this.status !== 'completed' && this.status !== 'delivered' && this.status !== 'cancelled') {
        return new Date() > this.deadline;
    }
    return false;
};

// Instance method to add photos to order
OrderSchema.methods.addPhotos = function(photos) {
    if (!this.photos) {
        this.photos = [];
    }

    // Generate URLs for photos
    const photoObjects = photos.map(photo => ({
        ...photo,
        url: `/uploads/orders/photos/${photo.filename}`
    }));

    this.photos.push(...photoObjects);
    return this.save();
};

// Instance method to remove a photo
OrderSchema.methods.removePhoto = function(filename) {
    if (this.photos) {
        this.photos = this.photos.filter(photo => photo.filename !== filename);
    }
    return this.save();
};

// Instance method to get photo count
OrderSchema.methods.getPhotoCount = function() {
    return this.photos ? this.photos.length : 0;
};

// Static method to find orders by status
OrderSchema.statics.findByStatus = function(status) {
    return this.find({ status }).populate('client', 'fullName email').populate('assignedTo', 'fullName email');
};

// Static method to find orders by client
OrderSchema.statics.findByClient = function(clientId) {
    return this.find({ client: clientId }).populate('assignedTo', 'fullName email');
};

// Static method to find orders by master
OrderSchema.statics.findByMaster = function(masterId) {
    return this.find({ assignedTo: masterId }).populate('client', 'fullName email');
};

// Index for better query performance
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ client: 1 });
OrderSchema.index({ assignedTo: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ deadline: 1 });
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);