const adminService = require('../services/adminService');
const { sendSuccess } = require('../../../helpers/response.helper');

const getAllUsers = async (req, res) => {
    const { users, pagination } = await adminService.getAllUsers(req.query);
    return sendSuccess(res, users, { meta: { pagination } });
};

const getUserById = async (req, res) => {
    const { user } = await adminService.getUserById(req.params.id);
    return sendSuccess(res, user);
};

const updateUserStatus = async (req, res) => {
    const { message, user } = await adminService.updateUserStatus(req.params.id, req.body.status, req.user);
    return sendSuccess(res, user, { message });
};

const updateUserRole = async (req, res) => {
    const { message, user } = await adminService.updateUserRole(req.params.id, req.body.role, req.user);
    return sendSuccess(res, user, { message });
};

const deleteUser = async (req, res) => {
    const { message } = await adminService.deleteUser(req.params.id, req.user);
    return sendSuccess(res, null, { message });
};

const getDashboardStats = async (req, res) => {
    const stats = await adminService.getDashboardStats();
    return sendSuccess(res, stats);
};

const getVendorRequests = async (req, res) => {
    const { users, pagination } = await adminService.getVendorRequests(req.query);
    return sendSuccess(res, users, { meta: { pagination } });
};

const approveVendor = async (req, res) => {
    const { message, user } = await adminService.approveVendor(req.params.id, req.user);
    return sendSuccess(res, user, { message });
};

const rejectVendor = async (req, res) => {
    const { message, user } = await adminService.rejectVendor(req.params.id, req.user);
    return sendSuccess(res, user, { message });
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
