

const { user,LoginHistory } = require('../models');
const { Op } = require('sequelize');


const getAllUsers = async (req,res) => {
    try{
        const {
            page=1,
            limit=20,
            role,
            status,
            search
        } = req.query;

        const offset = ( page - 1 ) * limit;
        const where = {};

        if(role){
            where.role = role;
        }

        if(status){
            where.status = status;
        }

        if (search) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }
    } catch (error){
        console.error('Error in getAllUsers:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const getUserById = async (req,res) => {
    try{
        const { id } = req.params;

        const user = await user.findByPk(id,{
            attributes: { exclude: ['passwordHash'] },
            include: [
                {
                    model: LoginHistory,
                    as:'loginHistory',
                    limit:10,
                    order:[['loginAt','DESC']]
                }
            ]
        });

        if(!user){
            return res.status(404).json({
                error:'User not found'
            });
        }

        res.json({ user });
    } catch(error){
        console.error('Error in getUserById:',error);
        res.status(500).json({
            error:'Failed to fetch user'
        });
    }
};


const updateUserStatus = async (req,res) => {
    try{
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'suspended', 'banned'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
        }

        const user = await user.findByPk(id);

        if (!user) {
        return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Cannot modify super admin accounts' });
        }

        await user.update({ status });

        res.json({
            message:`User status updated to ${status}`,
            user:{
                id:user.id,
                email:user.email,
                status:user.status
            }
        });

    } catch (error){
        console.log('Error in UpdateUserStatus:',error);
        res.status(500).json({
            error:'Failed to update user status'
        });
    }
};

const updateUserRole = async (req,res) => {
    try{
        const { id } =  req.params;
        const { role } =  req.body;

        if (!['customer', 'vendor', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role value' });
        }

        if (role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only super admin can assign super admin role' });
        }

        const user = await User.findByPk(id);

        if (!user) {
        return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Cannot modify super admin accounts' });
        }

        await user.update({ role });
        res.json({
            message:`User role updated to ${role}`,
            user:{
                id:user.id,
                email:user.email,
                role:user.role
            }
        });

    }catch(error){
        console.error('Error in update user role:',error);
        res.status(500).json({
            error:'Failed to update user role'
        });
    }
};

const deleteUser = async (req,res) => {
    try{
        const { id } = req.params;

        const user = await user.findByPk(id);

        if (!user) {
        return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Cannot delete super admin accounts' });
        }

        if (user.id === req.user.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await user.destroy();

        await user.destroy();

        res.json({
            message:'User deleted successfully'
        });
    } catch (error){
        console.error('Error in deleteUser:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

const getDashboardStats = async (req,res) => {
    try{
        const totalUsers = await user.count();

        const usersByRole = await user.findAll({
            attributes: [
                'role',
                [user.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
            ],
            group: ['role']
        });

        const usersByStatus = await user.findAll({
        attributes: [
            'status',
            [user.sequelize.fn('COUNT', user.sequelize.col('id')), 'count']
        ],
        group: ['status']
        });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const newUsersThisMonth = await user.count({
        where: {
            createdAt: { [Op.gte]: startOfMonth }
        }
        });

        const verifiedCount = await user.count({ where: { isVerified: true } });
        const unverifiedCount = await user.count({ where: { isVerified: false } });

        res.json({
        totalUsers,
        newUsersThisMonth,
        usersByRole: usersByRole.map(r => ({
            role: r.role,
            count: parseInt(r.get('count'))
        })),
        usersByStatus: usersByStatus.map(s => ({
            status: s.status,
            count: parseInt(s.get('count'))
        })),
        verification: {
            verified: verifiedCount,
            unverified: unverifiedCount
        }
        });
    }catch (error){
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getDashboardStats
};



