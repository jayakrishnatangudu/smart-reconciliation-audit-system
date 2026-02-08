const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reconciliation_system';

async function fixIndexAndCreateUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log(`📂 Database: ${mongoose.connection.name}\n`);

        // Step 1: Drop the problematic 'name_1' index
        console.log('🔧 Fixing indexes...');
        try {
            await User.collection.dropIndex('name_1');
            console.log('✅ Dropped old "name_1" index');
        } catch (err) {
            console.log('ℹ️  name_1 index does not exist (this is OK)');
        }

        // Step 2: Delete all existing users
        console.log('\n🗑️  Deleting all existing users...');
        const deleteResult = await User.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} users\n`);

        // Step 3: Create all three users ONE BY ONE
        console.log('👤 Creating users...\n');

        const bcrypt = require('bcryptjs');

        // Admin
        try {
            const admin = await User.create({
                username: 'admin',
                email: 'admin@example.com',
                password: await bcrypt.hash('admin123', 10),
                role: 'Admin'
            });
            console.log(`✅ Created: ${admin.username} (${admin.email}) - ${admin.role}`);
        } catch (err) {
            console.error(`❌ Failed to create admin: ${err.message}`);
        }

        // Analyst
        try {
            const analyst = await User.create({
                username: 'analyst',
                email: 'analyst@example.com',
                password: await bcrypt.hash('analyst123', 10),
                role: 'Analyst'
            });
            console.log(`✅ Created: ${analyst.username} (${analyst.email}) - ${analyst.role}`);
        } catch (err) {
            console.error(`❌ Failed to create analyst: ${err.message}`);
        }

        // Viewer
        try {
            const viewer = await User.create({
                username: 'viewer',
                email: 'viewer@example.com',
                password: await bcrypt.hash('viewer123', 10),
                role: 'Viewer'
            });
            console.log(`✅ Created: ${viewer.username} (${viewer.email}) - ${viewer.role}`);
        } catch (err) {
            console.error(`❌ Failed to create viewer: ${err.message}`);
        }

        // Step 4: Verify
        console.log('\n=== Verification ===');
        const allUsers = await User.find({});
        console.log(`Total users in database: ${allUsers.length}\n`);

        allUsers.forEach(user => {
            console.log(`✅ ${user.username} (${user.email}) - ${user.role}`);
        });

        console.log('\n🎉 Done!\n');
        console.log('=== Test Credentials ===');
        console.log('Admin:   admin@example.com / admin123');
        console.log('Analyst: analyst@example.com / analyst123');
        console.log('Viewer:  viewer@example.com / viewer123');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

fixIndexAndCreateUsers();
