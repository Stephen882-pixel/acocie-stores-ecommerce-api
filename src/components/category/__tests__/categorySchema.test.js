const categorySchema = require('../schemas/category.schema');

const validate = (schema, body) => schema.validate(body, { abortEarly: false, stripUnknown: true, convert: true });

const PARENT_ID = '33333333-3333-4333-8333-333333333333';

describe('category.schema', () => {
    describe('getAllCategoriesQuery', () => {
        it('accepts an empty query', () => {
            expect(validate(categorySchema.getAllCategoriesQuery, {}).error).toBeUndefined();
        });

        it.each(['true', 'false'])('accepts includeInactive and nested = %p', (flag) => {
            expect(validate(categorySchema.getAllCategoriesQuery, { includeInactive: flag, nested: flag }).error)
                .toBeUndefined();
        });

        it.each(['yes', '1', 'TRUE'])('rejects nested = %p', (nested) => {
            expect(validate(categorySchema.getAllCategoriesQuery, { nested }).error).toBeDefined();
        });
    });

    describe('getCategoryQuery', () => {
        it('accepts includeProducts=true', () => {
            expect(validate(categorySchema.getCategoryQuery, { includeProducts: 'true' }).error).toBeUndefined();
        });

        it('rejects other includeProducts values', () => {
            expect(validate(categorySchema.getCategoryQuery, { includeProducts: 'all' }).error).toBeDefined();
        });
    });

    describe('createCategory', () => {
        it('accepts a full valid payload and trims the name', () => {
            const { error, value } = validate(categorySchema.createCategory, {
                name: '  Solar Panels  ',
                description: 'Panels',
                parentId: PARENT_ID,
                imageUrl: 'https://cdn.example.com/a.png',
                isActive: true,
                displayOrder: 2,
                metaTitle: 'Solar',
                metaDescription: 'Buy solar panels'
            });

            expect(error).toBeUndefined();
            expect(value.name).toBe('Solar Panels');
        });

        it('defaults displayOrder to 0', () => {
            expect(validate(categorySchema.createCategory, { name: 'Lamps' }).value.displayOrder).toBe(0);
        });

        it('strips fields the client should not control, such as slug', () => {
            const { value } = validate(categorySchema.createCategory, { name: 'Lamps', slug: 'custom', id: 'x' });

            expect(value).not.toHaveProperty('slug');
            expect(value).not.toHaveProperty('id');
        });

        it.each([
            ['missing name', {}],
            ['one-character name', { name: 'A' }],
            ['name over 100 chars', { name: 'a'.repeat(101) }],
            ['non-uuid parentId', { name: 'Lamps', parentId: '123' }],
            ['invalid imageUrl', { name: 'Lamps', imageUrl: 'not a url' }],
            ['negative displayOrder', { name: 'Lamps', displayOrder: -1 }],
            ['metaTitle over 160 chars', { name: 'Lamps', metaTitle: 'a'.repeat(161) }]
        ])('rejects a %s', (_, body) => {
            expect(validate(categorySchema.createCategory, body).error).toBeDefined();
        });
    });

    describe('updateCategory', () => {
        it('accepts a single field', () => {
            expect(validate(categorySchema.updateCategory, { description: 'New' }).error).toBeUndefined();
        });

        it('allows clearing the parent with null', () => {
            expect(validate(categorySchema.updateCategory, { parentId: null }).error).toBeUndefined();
        });

        it('rejects a one-character name', () => {
            expect(validate(categorySchema.updateCategory, { name: 'A' }).error).toBeDefined();
        });
    });
});
