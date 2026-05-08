'use strict';

const path = require('path');
const fs   = require('fs');
const yaml = require('js-yaml');

// ─── Paths to every component YAML doc ───────────────────────────────────────

const docFiles = [
    path.join(__dirname, '../components/auth/docs/auth.yml'),
    path.join(__dirname, '../components/auth/docs/user.yml'),
    path.join(__dirname, '../components/auth/docs/admin.yml'),
    path.join(__dirname, '../components/cart/docs/cart.yml'),
    path.join(__dirname, '../components/category/docs/category.yml'),
    path.join(__dirname, '../components/product/docs/product.yml'),
    path.join(__dirname, '../components/checkout/docs/checkout.yml'),
    path.join(__dirname, '../components/orders/docs/orders.yml'),
    path.join(__dirname, '../components/orders/docs/adminOrders.yml'),
    path.join(__dirname, '../components/orders/docs/vendorOrders.yml'),
];

// ─── Deep merge helper ────────────────────────────────────────────────────────

const deepMerge = (target, source) => {
    for (const key of Object.keys(source || {})) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            target[key] &&
            typeof target[key] === 'object'
        ) {
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
};

// ─── Base spec (info, servers, shared responses/schemas) ─────────────────────

const baseSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Acocie Stores API',
        description: `
Multi-vendor e-commerce REST API.

### Authentication
Most endpoints require a Bearer JWT access token.  Obtain one via **POST /api/v1/auth/login**.

### Roles
| Role | Access |
|------|--------|
| \`customer\` | Shopping, orders, profile |
| \`vendor\` | Own product & order management |
| \`admin\` / \`super_admin\` | Full platform management |
        `.trim(),
        version: '1.0.0',
        contact: {
            name: 'Acocie Stores',
            email: 'support@acocie.com'
        }
    },
    servers: [
        {
            url: process.env.API_URL || 'http://localhost:3000',
            description: 'Development server'
        }
    ],
    tags: [
        { name: 'Auth',          description: 'Authentication & session management' },
        { name: 'Users',         description: 'User profile & address management' },
        { name: 'Admin — Users', description: 'Admin user management' },
        { name: 'Categories',    description: 'Product category management' },
        { name: 'Products',      description: 'Product catalogue' },
        { name: 'Cart',          description: 'Shopping cart' },
        { name: 'Checkout',      description: 'Checkout & order placement' },
        { name: 'Orders',        description: 'Customer order tracking & management' },
        { name: 'Admin — Orders',description: 'Admin order fulfilment & control' },
        { name: 'Vendor — Orders',description: 'Vendor order fulfilment' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Access token obtained from POST /api/v1/auth/login'
            }
        },
        responses: {
            ValidationError: {
                description: 'Request validation failed',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ValidationErrorBody' },
                        example: {
                            error: 'Validation failed',
                            errors: [
                                { field: 'Email', message: 'must be a valid email' }
                            ]
                        }
                    }
                }
            },
            UnauthorizedError: {
                description: 'Missing or invalid access token',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorBody' },
                        example: { error: 'No token provided' }
                    }
                }
            },
            ForbiddenError: {
                description: 'Insufficient permissions',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorBody' },
                        example: { error: 'Forbidden' }
                    }
                }
            },
            NotFoundError: {
                description: 'Resource not found',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorBody' },
                        example: { error: 'Not found' }
                    }
                }
            },
            ConflictError: {
                description: 'Resource already exists',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorBody' },
                        example: { error: 'Email already registered' }
                    }
                }
            },
            InternalError: {
                description: 'Internal server error',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorBody' },
                        example: { error: 'Internal server error' }
                    }
                }
            }
        },
        schemas: {
            ErrorBody: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            ValidationErrorBody: {
                type: 'object',
                properties: {
                    error: { type: 'string', example: 'Validation failed' },
                    errors: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                field:   { type: 'string' },
                                message: { type: 'string' }
                            }
                        }
                    }
                }
            },
            Pagination: {
                type: 'object',
                properties: {
                    total: { type: 'integer' },
                    page:  { type: 'integer' },
                    limit: { type: 'integer' },
                    pages: { type: 'integer' }
                }
            }
        }
    },
    paths: {}
};

// ─── Load & merge all component docs ─────────────────────────────────────────

for (const filePath of docFiles) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[OpenAPI] Warning: doc file not found — ${filePath}`);
        continue;
    }
    const parsed = yaml.load(fs.readFileSync(filePath, 'utf-8'));
    deepMerge(baseSpec, parsed);
}

module.exports = baseSpec;
