'use strict';

const adminOrderService = require('../services/adminOrderService');

const handleError = (res, error) => {
    console.error('[AdminOrderController]', error.message);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
        ...(error.currentStatus && { currentStatus: error.currentStatus })
    });
};

const getAllOrders = async (req, res) => {
    try {
        const result = await adminOrderService.getAllOrders(req.query);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await adminOrderService.getOrderById(req.params.id);
        return res.json({ order });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const order = await adminOrderService.updateOrderStatus(req.params.id, req.user.userId, req.body);
        return res.json({ message: 'Order status updated successfully', order });
    } catch (error) {
        return handleError(res, error);
    }
};

const confirmOrder = async (req, res) => {
    try {
        const order = await adminOrderService.confirmOrder(
            req.params.id, req.user.userId, req.body.paymentReference
        );
        return res.json({ message: 'Order confirmed successfully', order });
    } catch (error) {
        return handleError(res, error);
    }
};

const getOrderHistory = async (req, res) => {
    try {
        const history = await adminOrderService.getOrderHistory(req.params.id);
        return res.json({ history });
    } catch (error) {
        return handleError(res, error);
    }
};

const getCancellationRequests = async (req, res) => {
    try {
        const requests = await adminOrderService.getCancellationRequests(req.query.status);
        return res.json({ requests });
    } catch (error) {
        return handleError(res, error);
    }
};

const processCancellation = async (req, res) => {
    try {
        const cancellation = await adminOrderService.processCancellation(
            req.params.id, req.user.userId, req.body
        );
        const message = req.body.action === 'approve'
            ? 'Cancellation approved, order cancelled and inventory restored'
            : 'Cancellation request rejected';
        return res.json({ message, cancellation });
    } catch (error) {
        return handleError(res, error);
    }
};

const getReturnRequests = async (req, res) => {
    try {
        const requests = await adminOrderService.getReturnRequests(req.query.status);
        return res.json({ requests });
    } catch (error) {
        return handleError(res, error);
    }
};

const processReturn = async (req, res) => {
    try {
        const returnRequest = await adminOrderService.processReturn(
            req.params.id, req.user.userId, req.body
        );
        const message = req.body.action === 'approve'
            ? 'Return request approved. Awaiting customer to ship back items.'
            : 'Return request rejected';
        return res.json({ message, returnRequest });
    } catch (error) {
        return handleError(res, error);
    }
};

const processRefund = async (req, res) => {
    try {
        const order = await adminOrderService.processRefund(req.params.id, req.user.userId, req.body);
        return res.json({ message: 'Refund processed successfully', order });
    } catch (error) {
        return handleError(res, error);
    }
};

const addAdminNote = async (req, res) => {
    try {
        const note = await adminOrderService.addAdminNote(req.params.id, req.user.userId, req.body);
        return res.status(201).json({ message: 'Admin note added successfully', note });
    } catch (error) {
        return handleError(res, error);
    }
};

const getAdminDashboardStats = async (req, res) => {
    try {
        const stats = await adminOrderService.getAdminDashboardStats();
        return res.json(stats);
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    confirmOrder,
    getOrderHistory,
    getCancellationRequests,
    processCancellation,
    getReturnRequests,
    processReturn,
    processRefund,
    addAdminNote,
    getAdminDashboardStats
};
