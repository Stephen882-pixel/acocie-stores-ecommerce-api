const userService = require('../services/userService');

const handleError = (res, error) => {
    console.error(`[UserController] ${error.message}`);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
};

const getProfile = async (req, res) => {
    try {
        const result = await userService.getProfile(req.user.userId);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const updateProfile = async (req, res) => {
    try {
        const result = await userService.updateProfile(req.user.userId, req.body);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getAddresses = async (req, res) => {
    try {
        const result = await userService.getAddresses(req.user.userId);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const addAddress = async (req, res) => {
    try {
        const result = await userService.addAddress(req.user.userId, req.body);
        return res.status(201).json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const updateAddress = async (req, res) => {
    try {
        const result = await userService.updateAddress(req.user.userId, req.params.id, req.body);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const deleteAddress = async (req, res) => {
    try {
        const result = await userService.deleteAddress(req.user.userId, req.params.id);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getLoginHistory = async (req, res) => {
    try {
        const result = await userService.getLoginHistory(req.user.userId, req.query.limit);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const deleteAccount = async (req, res) => {
    try {
        const result = await userService.deleteAccount(req.user.userId, req.body.password);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
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
