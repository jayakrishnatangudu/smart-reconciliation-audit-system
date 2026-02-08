const fs = require('fs');
const path = require('path');

/**
 * Generate large CSV file for stress testing
 */
function generateLargeCSV(recordCount = 50000, filename = 'test-data-50k.csv') {
    console.log(`Generating ${recordCount} records...`);

    const outputPath = path.join(__dirname, '..', filename);
    const writeStream = fs.createWriteStream(outputPath);

    // Write header
    writeStream.write('Transaction ID,Amount,Reference Number,Date,Description,Category\n');

    const startDate = new Date('2024-01-01');
    const categories = ['Payment', 'Refund', 'Transfer', 'Purchase', 'Withdrawal'];

    for (let i = 1; i <= recordCount; i++) {
        const transactionId = `TXN${String(i).padStart(10, '0')}`;
        const amount = (Math.random() * 10000).toFixed(2);
        const refNumber = `REF${String(Math.floor(Math.random() * 1000000)).padStart(8, '0')}`;

        // Random date in 2024
        const randomDays = Math.floor(Math.random() * 365);
        const date = new Date(startDate);
        date.setDate(date.getDate() + randomDays);
        const dateStr = date.toISOString().split('T')[0];

        const description = `Transaction ${i}`;
        const category = categories[Math.floor(Math.random() * categories.length)];

        // Introduce some duplicates (2% chance)
        const isDuplicate = Math.random() < 0.02;
        const finalTransactionId = isDuplicate && i > 100
            ? `TXN${String(i - Math.floor(Math.random() * 100)).padStart(10, '0')}`
            : transactionId;

        writeStream.write(
            `${finalTransactionId},${amount},${refNumber},${dateStr},${description},${category}\n`
        );

        // Progress indicator
        if (i % 10000 === 0) {
            console.log(`Generated ${i} records...`);
        }
    }

    writeStream.end();

    writeStream.on('finish', () => {
        const stats = fs.statSync(outputPath);
        console.log(`\n✓ File created successfully!`);
        console.log(`  Path: ${outputPath}`);
        console.log(`  Records: ${recordCount}`);
        console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    });
}

// Generate different sizes
function generateAll() {
    generateLargeCSV(1000, 'test-data-1k.csv');
    setTimeout(() => generateLargeCSV(5000, 'test-data-5k.csv'), 1000);
    setTimeout(() => generateLargeCSV(10000, 'test-data-10k.csv'), 2000);
    setTimeout(() => generateLargeCSV(50000, 'test-data-50k.csv'), 3000);
}

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === 'all') {
        generateAll();
    } else {
        const count = parseInt(args[0]) || 50000;
        const filename = args[1] || `test-data-${count}.csv`;
        generateLargeCSV(count, filename);
    }
}

module.exports = { generateLargeCSV, generateAll };
