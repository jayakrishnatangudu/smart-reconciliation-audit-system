const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reconciliation_system';

async function checkCollections() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        console.log(`📂 Database: ${mongoose.connection.name}\n`);

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log('=== Collections in database ===');
        collections.forEach(coll => {
            console.log(`  - ${coll.name}`);
        });

        // Count documents in users collection
        console.log('\n=== User documents ===');
        const User = require('./models/User');
        const users = await User.find({});

        console.log(`Total users: ${users.length}\n`);
        users.forEach(user => {
            console.log(`✅ ${user.username} (${user.email}) - ${user.role}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkCollections();
