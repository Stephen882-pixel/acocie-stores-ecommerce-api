const { User, LoginHistory } = require('../../../models');
const { Op } = require('sequelize');
const userRoleService = require('../../rbac/services/userRoleService');

const { createError } = require('../../../helpers/error.helper');
const { paginate } = require('../../../helpers/response.helper');

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
        pagination: paginate(count, page, limit)
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

// Deprecated: use PUT /rbac/users/:userId/role.
const updateUserRole = (id, role, requestingUser) => userRoleService.changeRole(id, role, requestingUser);

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

const getVendorRequests = async ({ page = 1, limit = 20 }) => {
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
        where: { role: 'vendor_pending' },
        attributes: { exclude: ['passwordHash'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'ASC']]
    });

    return {
        users,
        pagination: paginate(count, page, limit)
    };
};

const assertPendingVendor = async (id) => {
    const user = await User.findByPk(id);
    if (!user) {
        throw createError('User not found', 404);
    }

    if (user.role !== 'vendor_pending') {
        throw createError('User does not have a pending vendor request', 400);
    }
};

const approveVendor = async (id, requestingUser) => {
    await assertPendingVendor(id);
    const { user } = await userRoleService.changeRole(id, 'vendor', requestingUser);

    return { message: 'Vendor request approved. User is now a vendor.', user };
};

const rejectVendor = async (id, requestingUser) => {
    await assertPendingVendor(id);
    const { user } = await userRoleService.changeRole(id, 'customer', requestingUser);

    return { message: 'Vendor request rejected. User has been set to customer.', user };
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    getDashboardStats,
    getVendorRequests,
    approveVendor,
    rejectVendor
};
