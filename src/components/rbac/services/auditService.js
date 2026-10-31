const { RbacAuditLog } = require('../../../models');
const { paginate } = require('../../../helpers/response.helper');

const record = ({ actorId, action, targetType, targetId, before, after }, transaction) =>
    RbacAuditLog.create({ actorId, action, targetType, targetId, before, after }, { transaction });

const listAuditLogs = async ({ page = 1, limit = 20 }) => {
    const { count, rows: logs } = await RbacAuditLog.findAndCountAll({
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['created_at', 'DESC']]
    });

    return {
        logs,
        pagination: paginate(count, page, limit)
    };
};

module.exports = { record, listAuditLogs };
