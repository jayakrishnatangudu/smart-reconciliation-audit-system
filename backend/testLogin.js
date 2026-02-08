const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reconciliation_system';

// Import the actual User model
const User = require('./models/User');

async function testLogin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const testCredentials = [
            { email: 'admin@example.com', password: 'admin123' },
            { email: 'analyst@example.com', password: 'analyst123' },
            { email: 'viewer@example.com', password: 'viewer123' }
        ];

        for (const cred of testCredentials) {
            console.log(`\n🔍 Testing: ${cred.email}`);

            // Find user
            const user = await User.findOne({ email: cred.email });

            if (!user) {
                console.log(`❌ User not found in database`);
                continue;
            }

            console.log(`✅ User found: ${user.username} (${user.role})`);
            console.log(`📧 Email in DB: ${user.email}`);
            console.log(`🔐 Password hash exists: ${user.password ? 'Yes' : 'No'}`);
            console.log(`🔑 Password hash length: ${user.password.length}`);

            // Test password
            const isMatch = await bcrypt.compare(cred.password, user.password);
            console.log(`🔓 Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

testLogin();
