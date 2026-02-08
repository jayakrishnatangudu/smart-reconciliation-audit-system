const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/reconciliation_system';

// User schema (must match the one in models/User.js)
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Analyst', 'Viewer'],
        default: 'Viewer'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

async function recreateUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Delete all test users first
        console.log('🗑️  Deleting existing test users...');
        await User.deleteMany({
            email: { $in: ['admin@example.com', 'analyst@example.com', 'viewer@example.com'] }
        });
        console.log('✅ Deleted old users\n');

        // Create users array
        const usersToCreate = [
            {
                username: 'admin',
                email: 'admin@example.com',
                password: await bcrypt.hash('admin123', 10),
                role: 'Admin'
            },
            {
                username: 'analyst',
                email: 'analyst@example.com',
                password: await bcrypt.hash('analyst123', 10),
                role: 'Analyst'
            },
            {
                username: 'viewer',
                email: 'viewer@example.com',
                password: await bcrypt.hash('viewer123', 10),
                role: 'Viewer'
            }
        ];

        // Create all users
        console.log('👤 Creating users...\n');
        for (const userData of usersToCreate) {
            const user = new User(userData);
            await user.save();
            console.log(`✅ Created: ${userData.username} (${userData.email}) - Role: ${userData.role}`);
        }

        console.log('\n🎉 All users created successfully!\n');
        console.log('=== Test Credentials ===');
        console.log('Admin:   admin@example.com / admin123');
        console.log('Analyst: analyst@example.com / analyst123');
        console.log('Viewer:  viewer@example.com / viewer123');

        // Verify by listing all users
        console.log('\n=== Verification ===');
        const allUsers = await User.find({}, 'username email role');
        console.log(`Total users in database: ${allUsers.length}`);
        allUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 11000) {
            console.error('Duplicate user detected. Please try again.');
        }
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

recreateUsers();
