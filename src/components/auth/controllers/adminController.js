const adminService = require('../services/adminService');

const handleError = (res, error) => {
    console.error(`[AdminController] ${error.message}`);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
};

const getAllUsers = async (req, res) => {
    try {
        const result = await adminService.getAllUsers(req.query);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getUserById = async (req, res) => {
    try {
        const result = await adminService.getUserById(req.params.id);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const result = await adminService.updateUserStatus(req.params.id, req.body.status, req.user);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const updateUserRole = async (req, res) => {
    try {
        const result = await adminService.updateUserRole(req.params.id, req.body.role, req.user);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const deleteUser = async (req, res) => {
    try {
        const result = await adminService.deleteUser(req.params.id, req.user);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const result = await adminService.getDashboardStats();
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
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
