import { Selectable } from 'kysely';
import { newSelector, type Zelectable } from '../src';
import { MediaItem, commonDbRizzolver as rizzolver, User } from './common-db';

describe('Selector', () => {
	describe('newSelector()', () => {
		it('creates a selector', async () => {
			expect(() => newSelector(rizzolver, 'user', 'u')).not.toThrow();
		});

		it('creates a selector with specific columns', async () => {
			expect(() => newSelector(rizzolver, 'user', 'u', ['id', 'name'] as const)).not.toThrow();
		});

		it('throws an error when creating a selector with invalid columns', async () => {
			expect(() =>
				newSelector(rizzolver, 'user', 'u', ['id', 'non_existent' as any] as const)
			).toThrow(`Column "non_existent" does not exist in table "user"`);
		});

		it('throws an error when providing an invalid table name', async () => {
			expect(() => newSelector(rizzolver, 'non_existent' as any, 'u')).toThrow(
				`Table 'non_existent' not found in schema`
			);
		});

		it('throws an error when providing an invalid alias', async () => {
			expect(() => newSelector(rizzolver, 'user', '')).toThrow(`Invalid alias ''`);
		});
	});

	describe('cols()', () => {
		it("lists a table's columns", async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			expect(sel.cols).toEqual({
				names: expect.arrayContaining(['id', 'name', 'avatar_img_id']),
				aliases: expect.arrayContaining(['_u_id', '_u_name', '_u_avatar_img_id']),
				asAliases: expect.arrayContaining([
					'u.id as _u_id',
					'u.name as _u_name',
					'u.avatar_img_id as _u_avatar_img_id'
				]),
				aliasesOn: expect.any(Function)
			});

			expect(sel.cols.names.length).toBe(3);
			expect(sel.cols.aliases.length).toBe(3);
			expect(sel.cols.asAliases.length).toBe(3);

			const aliasesOnA = sel.cols.aliasesOn('a');
			expect(aliasesOnA).toEqual(
				expect.arrayContaining(['a._u_id', 'a._u_name', 'a._u_avatar_img_id'])
			);
			expect(aliasesOnA.length).toBe(3);
		});

		it('lists only the requested columns', async () => {
			const sel = newSelector(rizzolver, 'user', 'u', ['id', 'name'] as const);

			expect(sel.cols).toEqual({
				names: expect.arrayContaining(['id', 'name']),
				aliases: expect.arrayContaining(['_u_id', '_u_name']),
				asAliases: expect.arrayContaining(['u.id as _u_id', 'u.name as _u_name']),
				aliasesOn: expect.any(Function)
			});

			expect(sel.cols.names.length).toBe(2);
			expect(sel.cols.aliases.length).toBe(2);
			expect(sel.cols.asAliases.length).toBe(2);

			const aliasesOnA = sel.cols.aliasesOn('a');
			expect(aliasesOnA).toEqual(expect.arrayContaining(['a._u_id', 'a._u_name']));
			expect(aliasesOnA.length).toBe(2);
		});
	});

	describe('col()', () => {
		it('gets data for a specific column', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			const col = sel.col('id');
			expect(col).toEqual({
				name: 'id',
				alias: '_u_id',
				asAlias: 'u.id as _u_id',
				aliasOn: expect.any(Function)
			});

			const aliasOnA = col.aliasOn('a');
			expect(aliasOnA).toEqual('a._u_id');
		});

		it('throws an error for a column that does not exist', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');
			expect(() => sel.col('non_existent' as any)).toThrow(
				'Column "non_existent" does not exist or was not selected'
			);
		});
	});

	describe('table()', () => {
		it('gets data for a specific table', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			expect(sel.table).toMatchObject({
				name: 'user',
				alias: 'u',
				asAlias: 'user as u',
				aliasOn: expect.any(Function)
			});

			const aliasOnA = sel.table.aliasOn('a');
			expect(aliasOnA).toEqual('a.u');
		});
	});

	describe('parse()', () => {
		it('parses a single row', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			const row: Zelectable<User, 'u'> = {
				_u_id: 1,
				_u_name: 'Alice',
				_u_avatar_img_id: null
			};

			const model: Selectable<User> = {
				id: 1,
				name: 'Alice',
				avatar_img_id: null
			};

			const data = sel.parse([row]);
			expect(data).toStrictEqual([{ row: row, model: model }]);
		});

		it('parses multiple row', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			const rows: Zelectable<User, 'u'>[] = [
				{
					_u_id: 1,
					_u_name: 'Alice',
					_u_avatar_img_id: null
				},
				{
					_u_id: 2,
					_u_name: 'Bob',
					_u_avatar_img_id: null
				}
			];

			const models: Selectable<User>[] = [
				{
					id: 1,
					name: 'Alice',
					avatar_img_id: null
				},
				{
					id: 2,
					name: 'Bob',
					avatar_img_id: null
				}
			];

			const data = sel.parse(rows);
			expect(data).toStrictEqual([0, 1].map((i) => ({ row: rows[i], model: models[i] })));
		});

		it('parses missing rows as undefined, maintaining order between input and output', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			const rows: (Zelectable<User, 'u'> | null | undefined)[] = [
				{
					_u_id: 1,
					_u_name: 'Alice',
					_u_avatar_img_id: null
				},
				null,
				undefined,
				{
					_u_id: 4,
					_u_name: 'Dave',
					_u_avatar_img_id: null
				}
			];

			const models: (Selectable<User> | undefined)[] = [
				{
					id: 1,
					name: 'Alice',
					avatar_img_id: null
				},
				undefined,
				undefined,
				{
					id: 4,
					name: 'Dave',
					avatar_img_id: null
				}
			];

			const data = sel.parse(rows);
			expect(data).toStrictEqual([0, 1, 2, 3].map((i) => ({ row: rows[i], model: models[i] })));
		});

		it('only populates columns that belong to the table', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			const row: Zelectable<User, 'u'> & Record<string, unknown> = {
				_u_id: 1,
				_u_name: 'Alice',
				_u_avatar_img_id: null,
				irrelevant1: 'irrelevant1',
				// test for a column that "looks like" an aliased column for the
				// table we're fetching.
				_u_irrelevant2: 'irrelevant2'
			};

			const model: Selectable<User> = {
				id: 1,
				name: 'Alice',
				avatar_img_id: null
			};

			const data = sel.parse([row]);
			expect(data).toStrictEqual([{ row: row, model: model }]);
		});

		it.skip('does not omit rows if their id column is missing', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			const row: Partial<Zelectable<User, 'u'>> = {
				_u_name: 'Alice',
				_u_avatar_img_id: null
			};

			const model: Partial<Selectable<User>> = {
				name: 'Alice',
				avatar_img_id: null
			};

			const data = sel.parse([row]);
			expect(data).toStrictEqual([{ row: row, model: model }]);
		});

		it('populates missing columns with undefined value', async () => {
			const sel = newSelector(rizzolver, 'user', 'u');

			const row: Partial<Zelectable<User, 'u'>> = {
				_u_id: 1,
				_u_name: 'Alice'
			};

			const model: Partial<Selectable<User>> = {
				id: 1,
				name: 'Alice',
				// Missing columns should exist on the returned row with a value of undefined.
				avatar_img_id: undefined
			};

			const data = sel.parse([row]);
			expect(data).toStrictEqual([{ row: row, model: model }]);
		});

		it('does not populate unexpected columns at all', async () => {
			const sel = newSelector(rizzolver, 'user', 'u', ['id', 'name'] as const);

			const row: Partial<Zelectable<User, 'u'>> = {
				_u_id: 1,
				_u_name: 'Alice'
			};

			const model: Partial<Selectable<User>> = {
				id: 1,
				name: 'Alice'
			};

			const data = sel.parse([row]);
			expect(data).toStrictEqual([{ row: row, model: model }]);
			expect('avatar_img_id' in data[0].model!).toBe(false);
		});
	});
});
