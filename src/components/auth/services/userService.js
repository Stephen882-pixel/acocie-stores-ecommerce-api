const { User, Address, LoginHistory } = require('../../../models');
const authUtils = require('../utils/authUtils');
const { Op } = require('sequelize');

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getProfile = async (userId) => {
    const user = await User.findByPk(userId, {
        attributes: { exclude: ['passwordHash'] },
        include: [{ model: Address, as: 'addresses' }]
    });

    if (!user) {
        throw createError('User not found', 404);
    }

    return { user };
};

const updateProfile = async (userId, { firstName, lastName, phone }) => {
    const user = await User.findByPk(userId);

    if (!user) {
        throw createError('User not found', 404);
    }

    if (phone && phone !== user.phone) {
        const existingPhone = await User.findOne({
            where: { phone, id: { [Op.ne]: userId } }
        });
        if (existingPhone) {
            throw createError('Phone already in use', 409);
        }
    }

    await user.update({ firstName, lastName, phone });

    return {
        message: 'Profile updated successfully',
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified
        }
    };
};

const getAddresses = async (userId) => {
    const addresses = await Address.findAll({
        where: { userId },
        order: [['isDefault', 'DESC'], ['created_at', 'DESC']]
    });

    return { addresses };
};

const addAddress = async (userId, addressData) => {
    const { label, fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = addressData;

    if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
        throw createError('Required address fields are missing', 400);
    }

    if (isDefault) {
        await Address.update({ isDefault: false }, { where: { userId } });
    }

    const address = await Address.create({
        userId, label, fullName, phone, addressLine1, addressLine2,
        city, state, postalCode,
        country: country || 'Kenya',
        isDefault: isDefault || false
    });

    return { message: 'Address added successfully', address };
};

const updateAddress = async (userId, addressId, updateData) => {
    const address = await Address.findOne({ where: { id: addressId, userId } });

    if (!address) {
        throw createError('Address not found', 404);
    }

    if (updateData.isDefault) {
        await Address.update({ isDefault: false }, { where: { userId, id: { [Op.ne]: addressId } } });
    }

    await address.update(updateData);

    return { message: 'Address updated successfully', address };
};

const deleteAddress = async (userId, addressId) => {
    const address = await Address.findOne({ where: { id: addressId, userId } });

    if (!address) {
        throw createError('Address not found', 404);
    }

    await address.destroy();

    return { message: 'Address deleted successfully' };
};

const getLoginHistory = async (userId, limit = 10) => {
    const history = await LoginHistory.findAll({
        where: { userId },
        order: [['loginAt', 'DESC']],
        limit: parseInt(limit)
    });

    return { history };
};

const deleteAccount = async (userId, password) => {
    if (!password) {
        throw createError('Password is required to delete account', 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
        throw createError('User not found', 404);
    }

    const isPasswordValid = await authUtils.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
        throw createError('Incorrect password', 401);
    }

    await user.destroy();

    return { message: 'Account deleted successfully' };
};

module.exports = {
    getProfile,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getLoginHistory,
    deleteAccount
};
