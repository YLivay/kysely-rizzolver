import { commonDbInit, commonDbRizzolver as rizzolver } from './common-db';
import { setupDatabase } from './setup';

const { getDbInstance } = setupDatabase(commonDbInit);

describe('QueryContext', () => {
	describe('add()', () => {
		it('can add a table', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u');
			expect(qc.numSelectors).toBe(1);
			expect(qc.selectors).toMatchObject({
				u: expect.any(Object)
			});
		});

		it('can add multiple tables', async () => {
			const qc = rizzolver.newQueryContext().add('user', 'u').add('media_item', 'mi');
			expect(qc.numSelectors).toBe(2);
			expect(qc.selectors).toMatchObject({
				u: expect.any(Object),
				mi: expect.any(Object)
			});
		});

		it('can add the same table multiple times (different aliases)', async () => {
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
		it('can get data for a specific column', async () => {
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
		it('can get data for a specific table', async () => {
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
});
