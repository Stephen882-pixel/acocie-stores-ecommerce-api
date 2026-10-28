jest.mock('../../../models', () => ({
    Category: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), count: jest.fn() },
    Product: { count: jest.fn() }
}));

const { Category, Product } = require('../../../models');
const categoryService = require('../services/categoryService');

const PARENT_ID = '33333333-3333-4333-8333-333333333333';

const makeCategory = (overrides = {}) => {
    const category = {
        id: 'cat-1',
        name: 'Solar Panels',
        slug: 'solar-panels',
        isActive: true,
        ...overrides
    };
    category.update = jest.fn(async (updates) => Object.assign(category, updates));
    category.destroy = jest.fn().mockResolvedValue();
    return category;
};

const expectServiceError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe('categoryService', () => {
    describe('getAllCategories', () => {
        beforeEach(() => {
            Category.findAll.mockResolvedValue([]);
        });

        const whereOfCall = () => Category.findAll.mock.calls[0][0].where;

        it('returns only active categories by default, ordered by displayOrder then name', async () => {
            await categoryService.getAllCategories({});

            const query = Category.findAll.mock.calls[0][0];
            expect(query.where).toEqual({ isActive: true });
            expect(query.order).toEqual([['displayOrder', 'ASC'], ['name', 'ASC']]);
            expect(query.include).toEqual([
                expect.objectContaining({ as: 'parent', attributes: ['id', 'name', 'slug'] })
            ]);
        });

        it.each(['admin', 'super_admin'])('lets %s include inactive categories', async (userRole) => {
            await categoryService.getAllCategories({ includeInactive: 'true', userRole });

            expect(whereOfCall()).toEqual({});
        });

        it.each([undefined, 'customer', 'vendor'])('ignores includeInactive for role %p', async (userRole) => {
            await categoryService.getAllCategories({ includeInactive: 'true', userRole });

            expect(whereOfCall()).toEqual({ isActive: true });
        });

        it('returns top-level categories with their active children when nested=true', async () => {
            await categoryService.getAllCategories({ nested: 'true' });

            const query = Category.findAll.mock.calls[0][0];
            expect(query.where).toEqual({ isActive: true, parentId: null });
            expect(query.include).toEqual([
                expect.objectContaining({ as: 'children', where: { isActive: true }, required: false })
            ]);
        });

        it('returns the flat list for nested=false', async () => {
            await categoryService.getAllCategories({ nested: 'false' });

            expect(whereOfCall()).not.toHaveProperty('parentId');
        });

        it('returns what the model returns', async () => {
            const rows = [makeCategory()];
            Category.findAll.mockResolvedValue(rows);

            await expect(categoryService.getAllCategories({})).resolves.toBe(rows);
        });
    });

    describe('getCategoryById', () => {
        it('returns the category with its parent and active children', async () => {
            const category = makeCategory();
            Category.findByPk.mockResolvedValue(category);

            await expect(categoryService.getCategoryById('cat-1')).resolves.toBe(category);

            const { include } = Category.findByPk.mock.calls[0][1];
            expect(include.map((i) => i.as)).toEqual(['parent', 'children']);
            expect(include[1].where).toEqual({ isActive: true });
        });

        it('includes up to 20 active products when includeProducts=true', async () => {
            Category.findByPk.mockResolvedValue(makeCategory());

            await categoryService.getCategoryById('cat-1', 'true');

            const products = Category.findByPk.mock.calls[0][1].include.find((i) => i.as === 'products');
            expect(products).toMatchObject({ model: Product, where: { status: 'active' }, required: false, limit: 20 });
        });

        it('does not include products for includeProducts=false', async () => {
            Category.findByPk.mockResolvedValue(makeCategory());

            await categoryService.getCategoryById('cat-1', 'false');

            const { include } = Category.findByPk.mock.calls[0][1];
            expect(include.some((i) => i.as === 'products')).toBe(false);
        });

        it('returns 404 for an unknown id', async () => {
            Category.findByPk.mockResolvedValue(null);

            await expectServiceError(categoryService.getCategoryById('missing'), 'Category not found', 404);
        });
    });

    describe('createCategory', () => {
        beforeEach(() => {
            Category.findOne.mockResolvedValue(null);
            Category.findByPk.mockResolvedValue(makeCategory({ id: PARENT_ID }));
            Category.create.mockImplementation(async (data) => ({ id: 'cat-new', ...data }));
        });

        it('creates a category with a slug generated from the name', async () => {
            const category = await categoryService.createCategory({ name: 'Solar Panels', description: 'All panels' });

            expect(Category.create).toHaveBeenCalledWith({
                name: 'Solar Panels',
                slug: 'solar-panels',
                description: 'All panels',
                parentId: undefined,
                imageUrl: undefined,
                isActive: true,
                displayOrder: 0,
                metaTitle: undefined,
                metaDescription: undefined
            });
            expect(category.id).toBe('cat-new');
        });

        it.each([
            ['  Home & Garden!  ', 'home-garden'],
            ['TVs / Audio', 'tvs-audio'],
            ['--Kids--Toys--', 'kids-toys'],
            ['Batteries 12V', 'batteries-12v']
        ])('slugifies %p as %p', async (name, slug) => {
            await categoryService.createCategory({ name });

            expect(Category.create.mock.calls[0][0].slug).toBe(slug);
        });

        it('appends a counter until the slug is unique', async () => {
            Category.findOne
                .mockResolvedValueOnce(makeCategory())
                .mockResolvedValueOnce(makeCategory({ slug: 'solar-panels-1' }))
                .mockResolvedValueOnce(null);

            await categoryService.createCategory({ name: 'Solar Panels' });

            expect(Category.findOne.mock.calls.map(([q]) => q.where.slug)).toEqual([
                'solar-panels', 'solar-panels-1', 'solar-panels-2'
            ]);
            expect(Category.create.mock.calls[0][0].slug).toBe('solar-panels-2');
        });

        it('keeps isActive=false when given explicitly', async () => {
            await categoryService.createCategory({ name: 'Hidden', isActive: false });

            expect(Category.create.mock.calls[0][0].isActive).toBe(false);
        });

        it('keeps a given displayOrder', async () => {
            await categoryService.createCategory({ name: 'Lamps', displayOrder: 7 });

            expect(Category.create.mock.calls[0][0].displayOrder).toBe(7);
        });

        it('checks that the parent exists', async () => {
            await categoryService.createCategory({ name: 'Lamps', parentId: PARENT_ID });

            expect(Category.findByPk).toHaveBeenCalledWith(PARENT_ID);
            expect(Category.create.mock.calls[0][0].parentId).toBe(PARENT_ID);
        });

        it('returns 404 for an unknown parent and creates nothing', async () => {
            Category.findByPk.mockResolvedValue(null);

            await expectServiceError(
                categoryService.createCategory({ name: 'Lamps', parentId: PARENT_ID }),
                'Parent category not found',
                404
            );
            expect(Category.create).not.toHaveBeenCalled();
        });

        it('rejects a missing name', async () => {
            await expectServiceError(categoryService.createCategory({}), 'Category name is required', 400);
            expect(Category.create).not.toHaveBeenCalled();
        });
    });

    describe('updateCategory', () => {
        let category;

        beforeEach(() => {
            category = makeCategory();
            Category.findByPk.mockImplementation(async (id) => (id === 'cat-1' ? category : makeCategory({ id })));
        });

        it('applies the updates and returns the category', async () => {
            const result = await categoryService.updateCategory('cat-1', { description: 'New' });

            expect(category.update).toHaveBeenCalledWith({ description: 'New' });
            expect(result).toBe(category);
        });

        it('regenerates the slug when the name changes', async () => {
            await categoryService.updateCategory('cat-1', { name: 'Solar Lights' });

            expect(category.update).toHaveBeenCalledWith({ name: 'Solar Lights', slug: 'solar-lights' });
        });

        it('keeps the slug when the name is unchanged', async () => {
            await categoryService.updateCategory('cat-1', { name: 'Solar Panels' });

            expect(category.update).toHaveBeenCalledWith({ name: 'Solar Panels' });
        });

        it('moves the category under an existing parent', async () => {
            await categoryService.updateCategory('cat-1', { parentId: PARENT_ID });

            expect(Category.findByPk).toHaveBeenCalledWith(PARENT_ID);
            expect(category.update).toHaveBeenCalledWith({ parentId: PARENT_ID });
        });

        it('allows clearing the parent with null', async () => {
            await categoryService.updateCategory('cat-1', { parentId: null });

            expect(category.update).toHaveBeenCalledWith({ parentId: null });
        });

        it('rejects making a category its own parent', async () => {
            await expectServiceError(
                categoryService.updateCategory('cat-1', { parentId: 'cat-1' }),
                'Category cannot be its own parent',
                400
            );
            expect(category.update).not.toHaveBeenCalled();
        });

        it('returns 404 for an unknown parent', async () => {
            Category.findByPk.mockImplementation(async (id) => (id === 'cat-1' ? category : null));

            await expectServiceError(
                categoryService.updateCategory('cat-1', { parentId: PARENT_ID }),
                'Parent category not found',
                404
            );
            expect(category.update).not.toHaveBeenCalled();
        });

        it('returns 404 for an unknown category', async () => {
            Category.findByPk.mockResolvedValue(null);

            await expectServiceError(categoryService.updateCategory('missing', { name: 'X' }), 'Category not found', 404);
        });
    });

    describe('deleteCategory', () => {
        let category;

        beforeEach(() => {
            category = makeCategory();
            Category.findByPk.mockResolvedValue(category);
            Product.count.mockResolvedValue(0);
            Category.count.mockResolvedValue(0);
        });

        it('deletes a category with no products or subcategories', async () => {
            await categoryService.deleteCategory('cat-1');

            expect(Product.count).toHaveBeenCalledWith({ where: { categoryId: 'cat-1' } });
            expect(Category.count).toHaveBeenCalledWith({ where: { parentId: 'cat-1' } });
            expect(category.destroy).toHaveBeenCalled();
        });

        it('refuses when the category still has products', async () => {
            Product.count.mockResolvedValue(3);

            await expectServiceError(
                categoryService.deleteCategory('cat-1'),
                'Cannot delete category with existing products',
                400
            );
            expect(category.destroy).not.toHaveBeenCalled();
        });

        it('refuses when the category still has subcategories', async () => {
            Category.count.mockResolvedValue(2);

            await expectServiceError(
                categoryService.deleteCategory('cat-1'),
                'Cannot delete category with subcategories',
                400
            );
            expect(category.destroy).not.toHaveBeenCalled();
        });

        it('returns 404 for an unknown category', async () => {
            Category.findByPk.mockResolvedValue(null);

            await expectServiceError(categoryService.deleteCategory('missing'), 'Category not found', 404);
        });
    });
});
