'use strict';

const vendorOrderService = require('../services/vendorOrderService');

const handleError = (res, error) => {
    console.error('[VendorOrderController]', error.message);
    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error',
        ...(error.currentStatus && { currentStatus: error.currentStatus })
    });
};

const getVendorOrders = async (req, res) => {
    try {
        const result = await vendorOrderService.getVendorOrders(req.user.userId, req.query);
        return res.json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getVendorOrderById = async (req, res) => {
    try {
        const order = await vendorOrderService.getVendorOrderById(req.params.id, req.user.userId);
        return res.json({ order });
    } catch (error) {
        return handleError(res, error);
    }
};

const acceptOrder = async (req, res) => {
    try {
        const order = await vendorOrderService.acceptOrder(req.params.id, req.user.userId);
        return res.json({ message: 'Order accepted and moved to processing', order });
    } catch (error) {
        return handleError(res, error);
    }
};

const shipOrder = async (req, res) => {
    try {
        const order = await vendorOrderService.shipOrder(req.params.id, req.user.userId, req.body);
        return res.json({ message: 'Order marked as shipped', order });
    } catch (error) {
        return handleError(res, error);
    }
};

const markAsDelivered = async (req, res) => {
    try {
        const order = await vendorOrderService.markAsDelivered(req.params.id, req.user.userId);
        return res.json({ message: 'Order marked as delivered', order });
    } catch (error) {
        return handleError(res, error);
    }
};

const updateTracking = async (req, res) => {
    try {
        const tracking = await vendorOrderService.updateTracking(req.params.id, req.user.userId, req.body);
        return res.json({ message: 'Tracking information updated', tracking });
    } catch (error) {
        return handleError(res, error);
    }
};

const addVendorNote = async (req, res) => {
    try {
        const note = await vendorOrderService.addVendorNote(req.params.id, req.user.userId, req.body);
        return res.status(201).json({ message: 'Note added successfully', note });
    } catch (error) {
        return handleError(res, error);
    }
};

const getVendorDashboardStats = async (req, res) => {
    try {
        const stats = await vendorOrderService.getVendorDashboardStats(req.user.userId);
        return res.json(stats);
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    getVendorOrders,
    getVendorOrderById,
    acceptOrder,
    shipOrder,
    markAsDelivered,
    updateTracking,
    addVendorNote,
    getVendorDashboardStats
};
