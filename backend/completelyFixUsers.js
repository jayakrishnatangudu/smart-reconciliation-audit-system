const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reconciliation_system';

async function completelyFixUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log(`📂 Database: ${mongoose.connection.name}\n`);

        // Step 1: List all indexes
        console.log('🔍 Checking indexes...');
        const indexes = await User.collection.indexes();
        console.log('Current indexes:', indexes.map(i => i.name).join(', '));

        // Step 2: Drop ALL indexes except _id
        console.log('\n🔧 Dropping all custom indexes...');
        for (const index of indexes) {
            if (index.name !== '_id_') {
                try {
                    await User.collection.dropIndex(index.name);
                    console.log(`✅ Dropped index: ${index.name}`);
                } catch (err) {
                    console.log(`⚠️  Could not drop ${index.name}: ${err.message}`);
                }
            }
        }

        // Step 3: Delete ALL users
        console.log('\n🗑️  Deleting ALL users...');
        const deleteResult = await User.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} users\n`);

        // Step 4: Create users
        const bcrypt = require('bcryptjs');

        console.log('👤 Creating users...\n');

        const admin = await User.create({
            username: 'admin',
            email: 'admin@example.com',
            password: await bcrypt.hash('admin123', 10),
            role: 'Admin'
        });
        console.log(`✅ Created: ${admin.username}`);

        const analyst = await User.create({
            username: 'analyst',
            email: 'analyst@example.com',
            password: await bcrypt.hash('analyst123', 10),
            role: 'Analyst'
        });
        console.log(`✅ Created: ${analyst.username}`);

        const viewer = await User.create({
            username: 'viewer',
            email: 'viewer@example.com',
            password: await bcrypt.hash('viewer123', 10),
            role: 'Viewer'
        });
        console.log(`✅ Created: ${viewer.username}`);

        // Step 5: Test each login
        console.log('\n🧪 Testing logins...\n');

        const testCreds = [
            { email: 'admin@example.com', password: 'admin123' },
            { email: 'analyst@example.com', password: 'analyst123' },
            { email: 'viewer@example.com', password: 'viewer123' }
        ];

        for (const cred of testCreds) {
            const user = await User.findOne({ email: cred.email });
            const isValid = await bcrypt.compare(cred.password, user.password);
            console.log(`${isValid ? '✅' : '❌'} ${user.email} - Password ${isValid ? 'VALID' : 'INVALID'}`);
        }

        console.log('\n🎉 Success!\n');
        console.log('=== Test Credentials ===');
        console.log('Admin:   admin@example.com / admin123');
        console.log('Analyst: analyst@example.com / analyst123');
        console.log('Viewer:  viewer@example.com / viewer123');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

completelyFixUsers();
