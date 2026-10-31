'use strict';

const adminOrderService = require('../services/adminOrderService');
const { sendSuccess } = require('../../../helpers/response.helper');

const getAllOrders = async (req, res) => {
    const { orders, pagination } = await adminOrderService.getAllOrders(req.query);
    return sendSuccess(res, orders, { meta: { pagination } });
};

const getOrderById = async (req, res) => {
    const order = await adminOrderService.getOrderById(req.params.id);
    return sendSuccess(res, order);
};

const updateOrderStatus = async (req, res) => {
    const order = await adminOrderService.updateOrderStatus(req.params.id, req.user.userId, req.body);
    return sendSuccess(res, order, { message: 'Order status updated successfully' });
};

const confirmOrder = async (req, res) => {
    const order = await adminOrderService.confirmOrder(req.params.id, req.user.userId, req.body.paymentReference);
    return sendSuccess(res, order, { message: 'Order confirmed successfully' });
};

const getOrderHistory = async (req, res) => {
    const history = await adminOrderService.getOrderHistory(req.params.id);
    return sendSuccess(res, history);
};

const getCancellationRequests = async (req, res) => {
    const requests = await adminOrderService.getCancellationRequests(req.query.status);
    return sendSuccess(res, requests);
};

const processCancellation = async (req, res) => {
    const cancellation = await adminOrderService.processCancellation(req.params.id, req.user.userId, req.body);
    const message = req.body.action === 'approve'
        ? 'Cancellation approved, order cancelled and inventory restored'
        : 'Cancellation request rejected';
    return sendSuccess(res, cancellation, { message });
};

const getReturnRequests = async (req, res) => {
    const requests = await adminOrderService.getReturnRequests(req.query.status);
    return sendSuccess(res, requests);
};

const processReturn = async (req, res) => {
    const returnRequest = await adminOrderService.processReturn(req.params.id, req.user.userId, req.body);
    const message = req.body.action === 'approve'
        ? 'Return request approved. Awaiting customer to ship back items.'
        : 'Return request rejected';
    return sendSuccess(res, returnRequest, { message });
};

const processRefund = async (req, res) => {
    const order = await adminOrderService.processRefund(req.params.id, req.user.userId, req.body);
    return sendSuccess(res, order, { message: 'Refund processed successfully' });
};

const addAdminNote = async (req, res) => {
    const note = await adminOrderService.addAdminNote(req.params.id, req.user.userId, req.body);
    return sendSuccess(res, note, { statusCode: 201, message: 'Admin note added successfully' });
};

const getAdminDashboardStats = async (req, res) => {
    const stats = await adminOrderService.getAdminDashboardStats();
    return sendSuccess(res, stats);
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
