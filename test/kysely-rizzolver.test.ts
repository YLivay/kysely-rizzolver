import { CommonDB, commonDbInit, commonDbRizzolver as rizzolver } from './common-db';
import { setupDatabase } from './setup';

describe('KyselyRizzolver', () => {
	describe('gather functions', () => {
		const { getDbInstance } = setupDatabase<CommonDB>(commonDbInit);

		const asFk = rizzolver.gatherObjs.newModelObj;

		describe('gatherOne()', () => {
			it('gathers a simple model (no fks defined in schema)', async () => {
				const db = getDbInstance();

				const mediaItem = await db
					.insertInto('media_item')
					.values({ width: 100, height: 200, url: 'http://example.com/image1.png' })
					.returningAll()
					.executeTakeFirstOrThrow();

				const result = await rizzolver.gatherOne(db, 'media_item', (eb) =>
					eb('media_item.id', '=', mediaItem.id)
				);

				rizzolver.gatherObjs.newGatherOne('media_item', 3, asFk('media_item', 3, mediaItem));

				expect(result).toMatchObject({
					gatherType: 'gatherOne',
					table: 'media_item',
					depth: 3,
					result: asFk('media_item', 3, mediaItem)
				});
			});

			it('gathers a model with fks (fks defined in schema and this model references existing rows in db)', async () => {
				const db = getDbInstance();

				const mediaItem = await db
					.insertInto('media_item')
					.values({ width: 100, height: 200, url: 'http://example.com/image1.png' })
					.returningAll()
					.executeTakeFirstOrThrow();

				const user = await db
					.insertInto('user')
					.values({ name: 'Alice', avatar_img_id: mediaItem.id })
					.returningAll()
					.executeTakeFirstOrThrow();

				const result = await rizzolver.gatherOne(db, 'user', (eb) => eb('user.id', '=', user.id));

				expect(result).toMatchObject({
					gatherType: 'gatherOne',
					table: 'user',
					depth: 3,
					result: asFk('user', 3, {
						...user,
						avatar_img: asFk('media_item', 2, mediaItem)
					})
				});
			});

			it('gathers a model without fks (fks defined in schema but this model does not reference them)', async () => {
				const db = getDbInstance();

				const user = await db
					.insertInto('user')
					.values({ name: 'Alice', avatar_img_id: null })
					.returningAll()
					.executeTakeFirstOrThrow();

				const result = await rizzolver.gatherOne(db, 'user', (eb) => eb('user.id', '=', user.id));

				expect(result).toMatchObject({
					gatherType: 'gatherOne',
					table: 'user',
					depth: 3,
					result: asFk('user', 3, {
						...user,
						avatar_img: null
					})
				});
			});

			it('gathers a model shallowly (fks defined in schema and this model references existing rows in db, but gather depth of 0 prevents them from being fetched)', async () => {
				const db = getDbInstance();

				const mediaItem = await db
					.insertInto('media_item')
					.values({ width: 100, height: 200, url: 'http://example.com/image1.png' })
					.returningAll()
					.executeTakeFirstOrThrow();

				const user = await db
					.insertInto('user')
					.values({ name: 'Alice', avatar_img_id: mediaItem.id })
					.returningAll()
					.executeTakeFirstOrThrow();

				const result = await rizzolver.gatherOne(db, 'user', (eb) => eb('user.id', '=', user.id), {
					depth: 0
				});

				expect(result).toMatchObject({
					gatherType: 'gatherOne',
					table: 'user',
					depth: 0,
					result: asFk('user', 0, user)
				});
			});
		});
	});
});
