const userService = require('../services/userService');
const { sendSuccess } = require('../../../helpers/response.helper');

const getProfile = async (req, res) => {
    const { user } = await userService.getProfile(req.user.userId);
    return sendSuccess(res, user);
};

const updateProfile = async (req, res) => {
    const { message, user } = await userService.updateProfile(req.user.userId, req.body);
    return sendSuccess(res, user, { message });
};

const getAddresses = async (req, res) => {
    const { addresses } = await userService.getAddresses(req.user.userId);
    return sendSuccess(res, addresses);
};

const addAddress = async (req, res) => {
    const { message, address } = await userService.addAddress(req.user.userId, req.body);
    return sendSuccess(res, address, { statusCode: 201, message });
};

const updateAddress = async (req, res) => {
    const { message, address } = await userService.updateAddress(req.user.userId, req.params.id, req.body);
    return sendSuccess(res, address, { message });
};

const deleteAddress = async (req, res) => {
    const { message } = await userService.deleteAddress(req.user.userId, req.params.id);
    return sendSuccess(res, null, { message });
};

const getLoginHistory = async (req, res) => {
    const { history } = await userService.getLoginHistory(req.user.userId, req.query.limit);
    return sendSuccess(res, history);
};

const deleteAccount = async (req, res) => {
    const { message } = await userService.deleteAccount(req.user.userId, req.body.password);
    return sendSuccess(res, null, { message });
};

const requestVendorStatus = async (req, res) => {
    const { message, ...data } = await userService.requestVendorStatus(req.user.userId);
    return sendSuccess(res, data, { message });
};

module.exports = {
    getProfile,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getLoginHistory,
    deleteAccount,
    requestVendorStatus
};
