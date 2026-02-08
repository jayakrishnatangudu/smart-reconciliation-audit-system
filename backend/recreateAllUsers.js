const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the actual User model - this ensures we're using the same schema and collection
const User = require('./models/User');

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reconciliation_system';

async function recreateAllUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log(`📂 Database: ${mongoose.connection.name}\n`);

        // Step 1: Delete ALL existing test users  
        console.log('🗑️  Deleting all existing test users...');
        const deleteResult = await User.deleteMany({
            email: { $in: ['admin@example.com', 'analyst@example.com', 'viewer@example.com'] }
        });
        console.log(`✅ Deleted ${deleteResult.deletedCount} users\n`);

        // Step 2: Create all three users
        console.log('👤 Creating users...\n');

        // Create admin
        const adminPassword = await bcrypt.hash('admin123', 10);
        const admin = new User({
            username: 'admin',
            email: 'admin@example.com',
            password: adminPassword,
            role: 'Admin'
        });
        await admin.save();
        console.log('✅ Created: admin (admin@example.com) - Admin');

        // Create analyst
        const analystPassword = await bcrypt.hash('analyst123', 10);
        const analyst = new User({
            username: 'analyst',
            email: 'analyst@example.com',
            password: analystPassword,
            role: 'Analyst'
        });
        await analyst.save();
        console.log('✅ Created: analyst (analyst@example.com) - Analyst');

        // Create viewer
        const viewerPassword = await bcrypt.hash('viewer123', 10);
        const viewer = new User({
            username: 'viewer',
            email: 'viewer@example.com',
            password: viewerPassword,
            role: 'Viewer'
        });
        await viewer.save();
        console.log('✅ Created: viewer (viewer@example.com) - Viewer');

        // Step 3: Verify all users were created
        console.log('\n=== Verification ===');
        const allUsers = await User.find({});
        console.log(`Total users in database: ${allUsers.length}\n`);

        for (const user of allUsers) {
            // Test password match
            let passwordValid = {
                admin123: await bcrypt.compare('admin123', user.password),
                analyst123: await bcrypt.compare('analyst123', user.password),
                viewer123: await bcrypt.compare('viewer123', user.password)
            };

            let correctPassword = Object.keys(passwordValid).find(pwd => passwordValid[pwd]);

            console.log(`✅ ${user.username} (${user.email}) - ${user.role}`);
            console.log(`   Password test: ${correctPassword ? '✅ Valid' : '❌ Invalid'}`);
        }

        console.log('\n🎉 All users created and verified!\n');
        console.log('=== Test Credentials ===');
        console.log('Admin:   admin@example.com / admin123');
        console.log('Analyst: analyst@example.com / analyst123');
        console.log('Viewer:  viewer@example.com / viewer123');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

recreateAllUsers();
