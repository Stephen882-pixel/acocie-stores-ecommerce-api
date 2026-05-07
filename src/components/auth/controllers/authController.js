const authService = require('../services/authService');

const handleError = (res, error) => {
    console.error(`[AuthController] ${error.message}`);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
        ...(error.needsVerification && { needsVerification: true })
    });
};

const signup = async (req, res) => {
    try {
        const result = await authService.signup(req.body);
        return res.status(201).json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const verifyOTP = async (req, res) => {
    try {
        const result = await authService.verifyOTP(req.body);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const login = async (req, res) => {
    try {
        const result = await authService.login({
            ...req.body,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const refreshToken = async (req, res) => {
    try {
        const result = await authService.refreshToken(req.body.refreshToken);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const logout = async (req, res) => {
    try {
        const result = await authService.logout(req.body.refreshToken);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const forgotPassword = async (req, res) => {
    try {
        const result = await authService.forgotPassword(req.body.email);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const verifyResetOTP = async (req, res) => {
    try {
        const result = await authService.verifyResetOTP(req.body);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const resetPassword = async (req, res) => {
    try {
        const result = await authService.resetPassword(req.body);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const changePassword = async (req, res) => {
    try {
        const result = await authService.changePassword({
            ...req.body,
            userId: req.user.userId
        });
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
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
