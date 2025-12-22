const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { User } = require('../src/models');
const authUtils = require('../src/utils/authUtils');
const readLine = require('readline');
const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout 
});
const question = (query) => new Promise((resolve) => rl.question(query, resolve));
async function createAdmin() {
    try {
        console.log('\n=== Create Admin User ===\n');
        
        const firstName = await question('First Name: ');
        const lastName = await question('Last Name: ');
        const email = await question('Email: ');
        const password = await question('Password (min 8 chars, uppercase, lowercase, number): ');
        const role = await question('Role (admin/super_admin) [default: admin]: ') || 'admin';
        
        if (!firstName || !lastName || !email || !password) {
            console.error('\n All fields are required');
            rl.close();
            process.exit(1);
        }
        
        if (!['admin', 'super_admin'].includes(role)) {
            console.error('\n Role must be either "admin" or "super_admin"');
            rl.close();
            process.exit(1);
        }
        
        if (!authUtils.isValidEmail(email)) {
            console.error('\n Invalid email format!');
            rl.close();
            process.exit(1);
        }
        
        if (!authUtils.isStrongPassword(password)) {
            console.error('\n Password must be at least 8 characters with uppercase, lowercase, and number!');
            rl.close();
            process.exit(1);
        }
        
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            console.error('\n Email already exists!');
            rl.close();
            process.exit(1);
        }
        
        const passwordHash = await authUtils.hashPassword(password);
        const admin = await User.create({
            firstName,
            lastName,
            email,
            passwordHash,
            role,
            status: 'active',
            isVerified: true,
            profileCompleted: true
        });
        
        console.log('\n Admin user created successfully!');
        console.log('\nDetails:');
        console.log('  - Name:', `${admin.firstName} ${admin.lastName}`);
        console.log('  - Email:', admin.email);
        console.log('  - Role:', admin.role);
        console.log('  - ID:', admin.id);
        console.log('\n You can now login with these credentials!\n');
        
        rl.close();
        process.exit(0);
    } catch (error) {
        console.error('\n Error creating admin:', error.message);
        rl.close();
        process.exit(1);
    }
}
createAdmin();