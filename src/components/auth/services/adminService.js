const { User, LoginHistory } = require('../../../models');
const { Op } = require('sequelize');

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getAllUsers = async ({ page = 1, limit = 20, role, status, search }) => {
    const offset = (page - 1) * limit;
    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
        where[Op.or] = [
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows: users } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['passwordHash'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
    });

    return {
        users,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
        }
    };
};

const getUserById = async (id) => {
    const user = await User.findByPk(id, {
        attributes: { exclude: ['passwordHash'] },
        include: [{
            model: LoginHistory,
            as: 'loginHistory',
            limit: 10,
            order: [['loginAt', 'DESC']]
        }]
    });

    if (!user) {
        throw createError('User not found', 404);
    }

    return { user };
};

const updateUserStatus = async (id, status, requestingUser) => {
    if (!['active', 'suspended', 'banned'].includes(status)) {
        throw createError('Invalid status value', 400);
    }

    const user = await User.findByPk(id);
    if (!user) {
        throw createError('User not found', 404);
    }

    if (user.role === 'super_admin' && requestingUser.role !== 'super_admin') {
        throw createError('Cannot modify super admin accounts', 403);
    }

    await user.update({ status });

    return {
        message: `User status updated to ${status}`,
        user: { id: user.id, email: user.email, status: user.status }
    };
};

const updateUserRole = async (id, role, requestingUser) => {
    if (!['customer', 'vendor', 'admin', 'super_admin'].includes(role)) {
        throw createError('Invalid role value', 400);
    }

    if (role === 'super_admin' && requestingUser.role !== 'super_admin') {
        throw createError('Only super admin can assign super admin role', 403);
    }

    const user = await User.findByPk(id);
    if (!user) {
        throw createError('User not found', 404);
    }

    if (user.role === 'super_admin' && requestingUser.role !== 'super_admin') {
        throw createError('Cannot modify super admin accounts', 403);
    }

    await user.update({ role });

    return {
        message: `User role updated to ${role}`,
        user: { id: user.id, email: user.email, role: user.role }
    };
};

const deleteUser = async (id, requestingUser) => {
    const user = await User.findByPk(id);
    if (!user) {
        throw createError('User not found', 404);
    }

    if (user.role === 'super_admin' && requestingUser.role !== 'super_admin') {
        throw createError('Cannot delete super admin accounts', 403);
    }

    if (user.id === requestingUser.userId) {
        throw createError('Cannot delete your own account', 400);
    }

    await user.destroy();

    return { message: 'User deleted successfully' };
};

const getDashboardStats = async () => {
    const totalUsers = await User.count();

    const usersByRole = await User.findAll({
        attributes: ['role', [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']],
        group: ['role']
    });

    const usersByStatus = await User.findAll({
        attributes: ['status', [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']],
        group: ['status']
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await User.count({
        where: { created_at: { [Op.gte]: startOfMonth } }
    });

    const verifiedCount = await User.count({ where: { isVerified: true } });
    const unverifiedCount = await User.count({ where: { isVerified: false } });

    return {
        totalUsers,
        newUsersThisMonth,
        usersByRole: usersByRole.map(r => ({ role: r.role, count: parseInt(r.get('count')) })),
        usersByStatus: usersByStatus.map(s => ({ status: s.status, count: parseInt(s.get('count')) })),
        verification: { verified: verifiedCount, unverified: unverifiedCount }
    };
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    getDashboardStats
};
