import type { Zelectable } from '../src';
import { MediaItem, commonDbRizzolver as rizzolver, User } from './common-db';

describe('QueryContext', () => {
	describe('add()', () => {
		it('adds a table', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');
			expect(qc.numSelectors).toBe(1);
			expect(qc.selectors).toMatchObject({
				u: expect.any(Object)
			});
		});

		it('adds multiple tables', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u').add('media_item', 'mi');
			expect(qc.numSelectors).toBe(2);
			expect(qc.selectors).toMatchObject({
				u: expect.any(Object),
				mi: expect.any(Object)
			});
		});

		it('adds the same table multiple times (different aliases)', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u1').add('user', 'u2');
			expect(qc.numSelectors).toBe(2);
			expect(qc.selectors).toMatchObject({
				u1: expect.any(Object),
				u2: expect.any(Object)
			});
		});

		it('throws an error when trying to add multiple tables with the same alias', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');
			expect(() => qc.add('media_item', 'u')).toThrow('Alias "u" is already in use');
		});
	});

	describe('cols()', () => {
		it("lists a table's columns", async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');

			const cols = qc.cols();
			const expectCols = [
				'u.id as _u_id',
				'u.name as _u_name',
				'u.avatar_img_id as _u_avatar_img_id'
			];
			expect(cols).toEqual(expect.arrayContaining(expectCols));
			expect(cols.length).toBe(3);
		});

		it('lists only the requested columns', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u', ['id', 'name']);

			const cols = qc.cols();
			const expectCols = ['u.id as _u_id', 'u.name as _u_name'];
			expect(cols).toEqual(expect.arrayContaining(expectCols));
			expect(cols.length).toBe(2);
		});
	});

	describe('col()', () => {
		it('gets data for a specific column', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');

			const data = qc.col('u.id');
			expect(data).toMatchObject({
				name: 'id',
				alias: '_u_id',
				asAlias: 'u.id as _u_id'
			});

			expect(data.aliasOn('a')).toBe('a._u_id');
		});

		it('throws an error for a column that does not exist', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');
			expect(() => qc.col('u.non_existent' as any)).toThrow(
				'Column "non_existent" does not exist or was not selected'
			);
		});

		it('throws an error for a column on the wrong table', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u').add('media_item', 'mi');
			expect(() => qc.col('u.height' as any)).toThrow(
				'Column "height" does not exist or was not selected'
			);
		});

		it('throws an error for wrong table alias', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');
			expect(() => qc.col('a.id' as any)).toThrow('Table "a" not added to this query context');
		});

		it('throws an error for invalid looking column specifier', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');
			expect(() => qc.col('what is this' as any)).toThrow(
				'Invalid column specifier "what is this"'
			);
		});
	});

	describe('table()', () => {
		it('gets data for a specific table', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');

			const data = qc.table('u');
			expect(data).toBe('user as u');
		});

		it('throws an error for a table that does not exist', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');
			expect(() => qc.table('non_existent' as any)).toThrow(
				'Table "non_existent" not added to this query context'
			);
		});
	});

	describe('run()', () => {
		it('parses an empty result', async () => {
			const result = await rizzolver.newQueryContext().add('user', 'u').run([]);
			expect(result.rows).toBeInstanceOf(Array);
			expect(result.rows).toHaveLength(0);
			expect(result.first).toBeUndefined();
		});

		it('parses a single row with a single table', async () => {
			const expectRow: Zelectable<User, 'u'> = {
				_u_id: 1,
				_u_name: 'Alice',
				_u_avatar_img_id: null
			};

			const result = await rizzolver.newQueryContext().add('user', 'u').run([expectRow]);

			expect(result.rows).toHaveLength(1);
			const row = result.rows[0].row;
			expect(row).toEqual(expectRow);
			const selectors = result.rows[0].selectable;
			expect(selectors).toMatchObject({
				u: {
					id: 1,
					name: 'Alice',
					avatar_img_id: null
				}
			});
		});

		it('parses a single row with multiple tables', async () => {
			const expectRow: Zelectable<User, 'u'> & Zelectable<MediaItem, 'mi'> = {
				_u_id: 1,
				_u_name: 'Alice',
				_u_avatar_img_id: 1,
				_mi_id: 1,
				_mi_width: 1920,
				_mi_height: 1080,
				_mi_url: 'https://example.com/image.jpg'
			};

			const result = await rizzolver
				.newQueryContext()
				.add('user', 'u')
				.add('media_item', 'mi')
				.run([expectRow]);

			expect(result.rows).toHaveLength(1);
			const row = result.rows[0].row;
			expect(row).toEqual(expectRow);
			const selectors = result.rows[0].selectable;
			expect(selectors).toMatchObject({
				u: {
					id: 1,
					name: 'Alice',
					avatar_img_id: 1
				},
				mi: {
					id: 1,
					width: 1920,
					height: 1080,
					url: 'https://example.com/image.jpg'
				}
			});
		});

		it('parses multiple rows with one table', async () => {
			const expectRows: Zelectable<User, 'u'>[] = [
				{
					_u_id: 1,
					_u_name: 'Alice',
					_u_avatar_img_id: null
				},
				{
					_u_id: 2,
					_u_name: 'Bob',
					_u_avatar_img_id: 1
				}
			];

			const result = await rizzolver.newQueryContext().add('user', 'u').run(expectRows);

			expect(result.rows).toHaveLength(2);
			expect(result.rows[0].row).toEqual(expectRows[0]);
			expect(result.rows[1].row).toEqual(expectRows[1]);
			expect(result.rows[0].selectable).toMatchObject({
				u: {
					id: 1,
					name: 'Alice',
					avatar_img_id: null
				}
			});
			expect(result.rows[1].selectable).toMatchObject({
				u: {
					id: 2,
					name: 'Bob',
					avatar_img_id: 1
				}
			});
		});

		it('parses multiple rows with multiple tables', async () => {
			const expectRows: (Zelectable<User, 'u'> & Zelectable<MediaItem, 'mi'>)[] = [
				{
					_u_id: 1,
					_u_name: 'Alice',
					_u_avatar_img_id: 1,
					_mi_id: 1,
					_mi_width: 1920,
					_mi_height: 1080,
					_mi_url: 'https://example.com/image.jpg'
				},
				{
					_u_id: 2,
					_u_name: 'Bob',
					_u_avatar_img_id: 1,
					_mi_id: 2,
					_mi_width: 1280,
					_mi_height: 720,
					_mi_url: 'https://example.com/image2.jpg'
				}
			];

			const result = await rizzolver
				.newQueryContext()
				.add('user', 'u')
				.add('media_item', 'mi')
				.run(expectRows);

			expect(result.rows).toHaveLength(2);
			expect(result.rows[0].row).toEqual(expectRows[0]);
			expect(result.rows[1].row).toEqual(expectRows[1]);
			expect(result.rows[0].selectable).toMatchObject({
				u: {
					id: 1,
					name: 'Alice',
					avatar_img_id: 1
				},
				mi: {
					id: 1,
					width: 1920,
					height: 1080,
					url: 'https://example.com/image.jpg'
				}
			});
			expect(result.rows[1].selectable).toMatchObject({
				u: {
					id: 2,
					name: 'Bob',
					avatar_img_id: 1
				},
				mi: {
					id: 2,
					width: 1280,
					height: 720,
					url: 'https://example.com/image2.jpg'
				}
			});
		});

		it('collects models into a ModelCollection', async () => {
			const expectRows: (Zelectable<User, 'u'> & Partial<Zelectable<MediaItem, 'mi'>>)[] = [
				{
					_u_id: 1,
					_u_name: 'Alice',
					_u_avatar_img_id: null,
					_mi_id: undefined,
					_mi_width: undefined,
					_mi_height: undefined,
					_mi_url: undefined
				},
				{
					_u_id: 2,
					_u_name: 'Bob',
					_u_avatar_img_id: 1,
					_mi_id: 1,
					_mi_width: 1920,
					_mi_height: 1080,
					_mi_url: 'https://example.com/image.jpg'
				},
				{
					_u_id: 3,
					_u_name: 'Charlie',
					_u_avatar_img_id: 2,
					_mi_id: 2,
					_mi_width: 1280,
					_mi_height: 720,
					_mi_url: 'https://example.com/image2.jpg'
				}
			];

			const result = await rizzolver
				.newQueryContext()
				.add('user', 'u')
				.add('media_item', 'mi')
				.run(expectRows);

			const models = result.models.get();
			expect(models).toEqual({
				user: {
					1: {
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					},
					2: {
						id: 2,
						name: 'Bob',
						avatar_img_id: 1
					},
					3: {
						id: 3,
						name: 'Charlie',
						avatar_img_id: 2
					}
				},
				media_item: {
					1: {
						id: 1,
						width: 1920,
						height: 1080,
						url: 'https://example.com/image.jpg'
					},
					2: {
						id: 2,
						width: 1280,
						height: 720,
						url: 'https://example.com/image2.jpg'
					}
				}
			});
		});

		it('instantiates a fetchOne result with one row', async () => {
			const expectRow: Zelectable<User, 'u'> = {
				_u_id: 1,
				_u_name: 'Alice',
				_u_avatar_img_id: null
			};

			const result = await rizzolver.newQueryContext().add('user', 'u').run([expectRow]);
			const fetchOne = result.newFetchOneResult('u');
			expect(fetchOne).toMatchObject({
				fetchType: 'fetchOne',
				table: 'user',
				result: {
					id: 1,
					name: 'Alice',
					avatar_img_id: null
				},
				asFetchOneX: expect.any(Function)
			});

			// Ensure that the model collection is populated
			const models = result.models.get();
			expect(models).toEqual({
				user: {
					1: {
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					}
				}
			});
		});

		it('instantiates a fetchOne result with multiple rows (only first row is considered)', async () => {
			const expectRows: Zelectable<User, 'u'>[] = [
				{
					_u_id: 1,
					_u_name: 'Alice',
					_u_avatar_img_id: null
				},
				{
					_u_id: 2,
					_u_name: 'Bob',
					_u_avatar_img_id: 1
				}
			];

			const result = await rizzolver.newQueryContext().add('user', 'u').run(expectRows);
			const fetchOne = result.newFetchOneResult('u');
			expect(fetchOne).toMatchObject({
				fetchType: 'fetchOne',
				table: 'user',
				result: {
					id: 1,
					name: 'Alice',
					avatar_img_id: null
				},
				asFetchOneX: expect.any(Function)
			});

			// Ensure that the model collection has all models (not just the first row)
			const models = result.models.get();
			expect(models).toEqual({
				user: {
					1: {
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					},
					2: {
						id: 2,
						name: 'Bob',
						avatar_img_id: 1
					}
				}
			});
		});

		it('instantiates a fetchOne result with an empty result', async () => {
			const result = await rizzolver.newQueryContext().add('user', 'u').run([]);
			const fetchOne = result.newFetchOneResult('u');
			expect(fetchOne).toMatchObject({
				fetchType: 'fetchOne',
				table: 'user',
				result: undefined,
				asFetchOneX: expect.any(Function)
			});

			// Ensure that the model collection is empty
			const models = result.models.get();
			expect(models).toEqual({});
		});

		it('instantiates a fetchOneX result with one row', async () => {
			const expectRow: Zelectable<User, 'u'> = {
				_u_id: 1,
				_u_name: 'Alice',
				_u_avatar_img_id: null
			};

			const result = await rizzolver.newQueryContext().add('user', 'u').run([expectRow]);
			const fetchOneX = result.newFetchOneXResult('u');
			expect(fetchOneX).toMatchObject({
				fetchType: 'fetchOne',
				table: 'user',
				result: {
					id: 1,
					name: 'Alice',
					avatar_img_id: null
				},
				asFetchOneX: expect.any(Function)
			});

			// Ensure that the model collection is populated
			const models = result.models.get();
			expect(models).toEqual({
				user: {
					1: {
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					}
				}
			});
		});

		it('instantiates a fetchOneX result with multiple rows (only first row is considered)', async () => {
			const expectedRows: Zelectable<User, 'u'>[] = [
				{
					_u_id: 1,
					_u_name: 'Alice',
					_u_avatar_img_id: null
				},
				{
					_u_id: 2,
					_u_name: 'Bob',
					_u_avatar_img_id: 1
				}
			];

			const result = await rizzolver.newQueryContext().add('user', 'u').run(expectedRows);
			const fetchOneX = result.newFetchOneXResult('u');
			expect(fetchOneX).toMatchObject({
				fetchType: 'fetchOne',
				table: 'user',
				result: {
					id: 1,
					name: 'Alice',
					avatar_img_id: null
				},
				asFetchOneX: expect.any(Function)
			});

			// Ensure that the model collection has all models (not just the first row)
			const models = result.models.get();
			expect(models).toEqual({
				user: {
					1: {
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					},
					2: {
						id: 2,
						name: 'Bob',
						avatar_img_id: 1
					}
				}
			});
		});

		it('throws when instantiating a fetchOneX result with an empty result', async () => {
			const result = await rizzolver.newQueryContext().add('user', 'u').run([]);
			expect(() => result.newFetchOneXResult('u')).toThrow('Expected a fetchOneX result');

			// Ensure that the model collection is empty
			const models = result.models.get();
			expect(models).toEqual({});
		});

		it('instantiates a fetchSome result with one row', async () => {
			const expectRow: Zelectable<User, 'u'> = {
				_u_id: 1,
				_u_name: 'Alice',
				_u_avatar_img_id: null
			};

			const result = await rizzolver.newQueryContext().add('user', 'u').run([expectRow]);
			const fetchSome = result.newFetchSomeResult('u');
			expect(fetchSome).toMatchObject({
				fetchType: 'fetchSome',
				table: 'user',
				result: [
					{
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					}
				]
			});

			// Ensure that the model collection is populated
			const models = result.models.get();
			expect(models).toEqual({
				user: {
					1: {
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					}
				}
			});
		});

		it('instantiates a fetchSome result with multiple rows', async () => {
			const expectRows: Zelectable<User, 'u'>[] = [
				{
					_u_id: 1,
					_u_name: 'Alice',
					_u_avatar_img_id: null
				},
				{
					_u_id: 2,
					_u_name: 'Bob',
					_u_avatar_img_id: 1
				}
			];

			const result = await rizzolver.newQueryContext().add('user', 'u').run(expectRows);
			const fetchSome = result.newFetchSomeResult('u');
			expect(fetchSome).toMatchObject({
				fetchType: 'fetchSome',
				table: 'user',
				result: [
					{
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					},
					{
						id: 2,
						name: 'Bob',
						avatar_img_id: 1
					}
				]
			});

			// Ensure that the model collection is populated
			const models = result.models.get();
			expect(models).toEqual({
				user: {
					1: {
						id: 1,
						name: 'Alice',
						avatar_img_id: null
					},
					2: {
						id: 2,
						name: 'Bob',
						avatar_img_id: 1
					}
				}
			});
		});

		it('instantiates a fetchSome result with an empty result', async () => {
			const result = await rizzolver.newQueryContext().add('user', 'u').run([]);
			const fetchSome = result.newFetchSomeResult('u');
			expect(fetchSome).toMatchObject({
				fetchType: 'fetchSome',
				table: 'user',
				result: []
			});

			// Ensure that the model collection is empty
			const models = result.models.get();
			expect(models).toEqual({});
		});

		it('result.first === result.rows[0]', async () => {
			const expectRow: Zelectable<User, 'u'> = {
				_u_id: 1,
				_u_name: 'Alice',
				_u_avatar_img_id: null
			};

			const result = await rizzolver.newQueryContext().add('user', 'u').run([expectRow]);
			expect(result.first === result.rows[0]).toBe(true);
		});
	});
});
