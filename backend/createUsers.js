const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/reconciliation_system';

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Analyst', 'Viewer'], default: 'Viewer' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create Analyst user
        const analystPassword = await bcrypt.hash('analyst123', 10);
        const analyst = new User({
            username: 'analyst',
            email: 'analyst@example.com',
            password: analystPassword,
            role: 'Analyst'
        });

        try {
            await analyst.save();
            console.log('✅ Analyst user created successfully');
        } catch (err) {
            if (err.code === 11000) {
                console.log('ℹ️  Analyst user already exists');
            } else {
                console.error('❌ Error creating analyst:', err.message);
            }
        }

        // Create Viewer user
        const viewerPassword = await bcrypt.hash('viewer123', 10);
        const viewer = new User({
            username: 'viewer',
            email: 'viewer@example.com',
            password: viewerPassword,
            role: 'Viewer'
        });

        try {
            await viewer.save();
            console.log('✅ Viewer user created successfully');
        } catch (err) {
            if (err.code === 11000) {
                console.log('ℹ️  Viewer user already exists');
            } else {
                console.error('❌ Error creating viewer:', err.message);
            }
        }

        console.log('\n✅ All users created!');
        console.log('\nTest credentials:');
        console.log('Admin:   admin@example.com / admin123');
        console.log('Analyst: analyst@example.com / analyst123');
        console.log('Viewer:  viewer@example.com / viewer123');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

createUsers();
