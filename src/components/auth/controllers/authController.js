const authService = require('../services/authService');
const { sendSuccess } = require('../../../helpers/response.helper');

const signup = async (req, res) => {
    const { message, ...data } = await authService.signup(req.body);
    return sendSuccess(res, data, { statusCode: 201, message });
};

const verifyOTP = async (req, res) => {
    const { message } = await authService.verifyOTP(req.body);
    return sendSuccess(res, null, { message });
};

const login = async (req, res) => {
    const { message, ...data } = await authService.login({
        ...req.body,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    return sendSuccess(res, data, { message });
};

const refreshToken = async (req, res) => {
    const { message, ...data } = await authService.refreshToken(req.body.refreshToken);
    return sendSuccess(res, data, { message });
};

const logout = async (req, res) => {
    const { message } = await authService.logout(req.body.refreshToken);
    return sendSuccess(res, null, { message });
};

const forgotPassword = async (req, res) => {
    const { message } = await authService.forgotPassword(req.body.email);
    return sendSuccess(res, null, { message });
};

const verifyResetOTP = async (req, res) => {
    const { message, ...data } = await authService.verifyResetOTP(req.body);
    return sendSuccess(res, data, { message });
};

const resetPassword = async (req, res) => {
    const { message } = await authService.resetPassword(req.body);
    return sendSuccess(res, null, { message });
};

const changePassword = async (req, res) => {
    const { message } = await authService.changePassword({
        ...req.body,
        userId: req.user.userId
    });
    return sendSuccess(res, null, { message });
};

module.exports = {
    signup,
    verifyOTP,
    login,
    refreshToken,
    logout,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    changePassword
};
