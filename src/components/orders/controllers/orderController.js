'use strict';

const orderService = require('../services/orderService');

const handleError = (res, error) => {
    console.error('[OrderController]', error.message);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
        ...(error.currentStatus && { currentStatus: error.currentStatus })
    });
};

const getOrderHistory = async (req, res) => {
    try {
        const result = await orderService.getOrderHistory(req.user.userId, req.query);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.id, req.user.userId);
        return res.json({ order });
    } catch (error) {
        return handleError(res, error);
    }
};

const getOrderByNumber = async (req, res) => {
    try {
        const order = await orderService.getOrderByNumber(req.params.orderNumber, req.user.userId);
        return res.json({ order });
    } catch (error) {
        return handleError(res, error);
    }
};

const getOrderTracking = async (req, res) => {
    try {
        const tracking = await orderService.getOrderTracking(req.params.id, req.user.userId);
        return res.json({ tracking });
    } catch (error) {
        return handleError(res, error);
    }
};

const requestOrderCancellation = async (req, res) => {
    try {
        const cancellation = await orderService.requestOrderCancellation(
            req.params.id, req.user.userId, req.body.reason
        );
        return res.status(201).json({ message: 'Cancellation request submitted successfully', cancellation });
    } catch (error) {
        return handleError(res, error);
    }
};

const requestReturn = async (req, res) => {
    try {
        const returnRequest = await orderService.requestReturn(
            req.params.id, req.user.userId, req.body.reason
        );
        return res.status(201).json({ message: 'Return request submitted successfully', returnRequest });
    } catch (error) {
        return handleError(res, error);
    }
};

const addCustomerNote = async (req, res) => {
    try {
        const note = await orderService.addCustomerNote(req.params.id, req.user.userId, req.body.content);
        return res.status(201).json({ message: 'Note added successfully', note });
    } catch (error) {
        return handleError(res, error);
    }
};

const getOrderStats = async (req, res) => {
    try {
        const stats = await orderService.getOrderStats(req.user.userId);
        return res.json(stats);
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    getOrderHistory,
    getOrderById,
    getOrderByNumber,
    getOrderTracking,
    requestOrderCancellation,
    requestReturn,
    addCustomerNote,
    getOrderStats
};
