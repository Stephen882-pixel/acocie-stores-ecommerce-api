/**
 * User Schemas (DTOs)
 * Covers profile management and address management endpoints.
 */

const Joi = require('joi');

// ─── Profile ─────────────────────────────────────────────────────────────────

/**
 * PUT /users/profile
 */
const updateProfile = Joi.object({
    firstName: Joi.string().trim().min(2).max(50).optional().label('First name'),
    lastName:  Joi.string().trim().min(2).max(50).optional().label('Last name'),
    phone: Joi.string()
        .trim()
        .pattern(/^\+?[1-9]\d{6,14}$/)
        .optional()
        .allow('')
        .messages({ 'string.pattern.base': 'Phone number is not valid' })
        .label('Phone')
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

// ─── Addresses ───────────────────────────────────────────────────────────────

const addressBase = {
    label:       Joi.string().trim().max(50).optional().label('Label'),
    fullName:    Joi.string().trim().min(2).max(100).label('Full name'),
    phone:       Joi.string()
                    .trim()
                    .pattern(/^\+?[1-9]\d{6,14}$/)
                    .messages({ 'string.pattern.base': 'Phone number is not valid' })
                    .label('Phone'),
    addressLine1: Joi.string().trim().min(3).max(255).label('Address line 1'),
    addressLine2: Joi.string().trim().max(255).optional().allow('').label('Address line 2'),
    city:         Joi.string().trim().min(2).max(100).label('City'),
    state:        Joi.string().trim().min(2).max(100).label('State'),
    postalCode:   Joi.string().trim().min(2).max(20).label('Postal code'),
    country:      Joi.string().trim().min(2).max(100).default('Kenya').optional().label('Country'),
    isDefault:    Joi.boolean().optional().label('Is default')
};

/**
 * POST /users/addresses
 */
const addAddress = Joi.object({
    ...addressBase,
    fullName:    addressBase.fullName.required(),
    phone:       addressBase.phone.required(),
    addressLine1: addressBase.addressLine1.required(),
    city:         addressBase.city.required(),
    state:        addressBase.state.required(),
    postalCode:   addressBase.postalCode.required()
});

/**
 * PUT /users/addresses/:id
 */
const updateAddress = Joi.object({
    ...addressBase
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { updateProfile, addAddress, updateAddress };
