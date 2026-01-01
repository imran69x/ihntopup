// Run this script once to initialize Spin Wheel in Firestore
// node init-spin-wheel.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
});

const db = admin.firestore();

async function initializeSpinWheel() {
    try {
        console.log('Initializing Spin Wheel System...');

        // Create default config
        await db.collection('spinWheelConfig').doc('default').set({
            isEnabled: true,
            autoEnableDay: 5, // Friday
            manualOverride: false,
            spinLimitPerWeek: 3,
            currentWeekStart: admin.firestore.Timestamp.now(),
        });

        console.log('✅ Config created');

        // Create sample items
        const sampleItems = [
            {
                name: '৳10 ওয়ালেট বোনাস',
                type: 'wallet',
                value: 10,
                color: '#FF6B6B',
                probability: 30,
                isEligibleForNormal: true,
                isEligibleForVerified: true,
                isEligibleForDummy: true,
                isActive: true,
            },
            {
                name: '৳50 ওয়ালেট বোনাস',
                type: 'wallet',
                value: 50,
                color: '#4ECDC4',
                probability: 20,
                isEligibleForNormal: true,
                isEligibleForVerified: true,
                isEligibleForDummy: true,
                isActive: true,
            },
            {
                name: '৳100 ওয়ালেট বোনাস',
                type: 'wallet',
                value: 100,
                color: '#45B7D1',
                probability: 10,
                isEligibleForNormal: false,
                isEligibleForVerified: true,
                isEligibleForDummy: true,
                isActive: true,
            },
            {
                name: '20 কয়েন',
                type: 'coins',
                value: 20,
                color: '#FFA07A',
                probability: 25,
                isEligibleForNormal: true,
                isEligibleForVerified: true,
                isEligibleForDummy: true,
                isActive: true,
            },
            {
                name: '5% ডিসকাউন্ট',
                type: 'discount',
                value: 5,
                color: '#98D8C8',
                probability: 15,
                isEligibleForNormal: true,
                isEligibleForVerified: true,
                isEligibleForDummy: false,
                isActive: true,
            },
        ];

        for (const item of sampleItems) {
            await db.collection('spinWheelItems').add({
                ...item,
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });
        }

        console.log(`✅ Created ${sampleItems.length} sample items`);
        console.log('\n🎉 Spin Wheel System initialized successfully!');
        console.log('\nYou can now:');
        console.log('1. Go to /admin/spin-wheel to manage the system');
        console.log('2. Go to /spin to try spinning the wheel');

        process.exit(0);
    } catch (error) {
        console.error('Error initializing spin wheel:', error);
        process.exit(1);
    }
}

initializeSpinWheel();
