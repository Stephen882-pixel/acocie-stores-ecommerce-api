
const bcrypt = require('bcrypt');
const { queryInterface, Sequelize, DATE } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    up: async (queryInterface,Sequelize) => {
        const passwordHash = await bcrypt.hash('SuperAdmin123!',10);


        await queryInterface.bulkInsert('users',[
            {
                id:uuidv4(),
                first_name:'Super',
                last_name:'Admin',
                email:'ondeyostephen0@gmail.com',
                password_hash:passwordHash,
                role:'super_admin',
                status:'active',
                is_verified:true,
                profile_completed:true,
                created_at:new Date(),
                updated_at:new Date()
            }
        ]);
    },

    down: async (queryInterface,Sequelize) => {
        await queryInterface.bulkDelete('users',{
            email:'ondeyostephen0@gmail.com'
        },{});
    }
};

