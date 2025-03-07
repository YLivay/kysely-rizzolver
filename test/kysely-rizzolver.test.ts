import { Kysely, sql } from 'kysely';
import { CommonDB, commonDbInit, commonDbRizzolver as rizzolver } from './common-db';
import { setupDatabase } from './setup';
import { GatherWhereExpression, ModelFkInstance, TableName, ValidFkDepth } from '../src';
import { NoNullGatherOpts } from '../src/fks';

describe('KyselyRizzolver', () => {
	describe('gather functions', () => {
		const { getDbInstance } = setupDatabase<CommonDB>(commonDbInit);

		const asFk = rizzolver.gatherObjs.newModelObj;

		// Most tests are common between gatherOne, gatherOneX and gatherSome and require similar setup.
		type GatherType = 'gatherOne' | 'gatherOneX' | 'gatherSome';

		function commonGatherFn(
			type: GatherType,
			db: Kysely<CommonDB>,
			table: TableName<CommonDB>,
			where: GatherWhereExpression<CommonDB, TableName<CommonDB>>,
			opts?: NoNullGatherOpts<CommonDB, ValidFkDepth>
		) {
			switch (type) {
				case 'gatherOne':
					return rizzolver.gatherOne(db, table, where, opts);
				case 'gatherOneX':
					return rizzolver.gatherOneX(db, table, where, opts);
				case 'gatherSome':
					return rizzolver.gatherSome(db, table, where, opts);

				default:
					throw new Error(
						'Unexpected gather type in unit test supporting code. Time to update the unit tests'
					);
			}
		}

		function getExpectedObject<
			Table extends TableName<CommonDB>,
			Depth extends ValidFkDepth,
			Result extends ModelFkInstance<CommonDB, Table, Depth>
		>({
			type,
			table,
			depth,
			result
		}: {
			type: GatherType;
			table: Table;
			depth: Depth;
			result: Result;
		}) {
			switch (type) {
				case 'gatherOne':
				case 'gatherOneX':
					return {
						gatherType: 'gatherOne',
						table,
						depth,
						result
					} as const;
				case 'gatherSome':
					return {
						gatherType: 'gatherSome',
						table,
						depth,
						result: [result]
					} as const;

				default:
					throw new Error(
						'Unexpected gather type in unit test supporting code. Time to update the unit tests'
					);
			}
		}

		async function gatherSimpleModel(type: GatherType) {
			const db = getDbInstance();

			const mediaItem = await db
				.insertInto('media_item')
				.values({ width: 100, height: 200, url: 'http://example.com/image1.png' })
				.returningAll()
				.executeTakeFirstOrThrow();

			const result = await commonGatherFn(type, db, 'media_item', (eb) =>
				eb('media_item.id', '=', mediaItem.id)
			);

			expect(result).toMatchObject(
				getExpectedObject({
					type,
					table: 'media_item',
					depth: 3,
					result: asFk('media_item', 3, mediaItem)
				})
			);
		}

		async function gatherSimpleWithFks(type: GatherType) {
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

			const result = await commonGatherFn(type, db, 'user', (eb) => eb('user.id', '=', user.id));

			expect(result).toMatchObject(
				getExpectedObject({
					type,
					table: 'user',
					depth: 3,
					result: asFk('user', 3, { ...user, avatar_img: asFk('media_item', 2, mediaItem) })
				})
			);
		}

		async function gatherSimpleNoFks(type: GatherType) {
			const db = getDbInstance();

			const user = await db
				.insertInto('user')
				.values({ name: 'Alice', avatar_img_id: null })
				.returningAll()
				.executeTakeFirstOrThrow();

			const result = await commonGatherFn(type, db, 'user', (eb) => eb('user.id', '=', user.id));

			expect(result).toMatchObject(
				getExpectedObject({
					type,
					table: 'user',
					depth: 3,
					result: asFk('user', 3, {
						...user,
						avatar_img: null
					})
				})
			);
		}

		async function gatherShallow(type: GatherType) {
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

			const result = await commonGatherFn(type, db, 'user', (eb) => eb('user.id', '=', user.id), {
				depth: 0
			});

			expect(result).toMatchObject(
				getExpectedObject({
					type,
					table: 'user',
					depth: 0,
					result: asFk('user', 0, user)
				})
			);
		}

		async function commonMissingRowsFkSetup() {
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

			await sql`PRAGMA foreign_keys = OFF`.execute(db);
			await db.deleteFrom('media_item').where('id', '=', mediaItem.id).execute();
			await sql`PRAGMA foreign_keys = ON`.execute(db);

			return { db, user, missingMediaItem: mediaItem };
		}

		async function gatherCircularReferences(type: GatherType) {
			const db = getDbInstance();

			const author = await db
				.insertInto('user')
				.values({ name: 'Alice', avatar_img_id: null })
				.returningAll()
				.executeTakeFirstOrThrow();

			const post = await db
				.insertInto('post')
				.values({
					author_id: author.id,
					title: 'Main Post',
					description: null,
					banner_img_id: null,
					topic_id: null as any
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			const topic = await db
				.insertInto('topic')
				.values({ name: 'Interesting Topic', main_post_id: post.id })
				.returningAll()
				.executeTakeFirstOrThrow();

			await db
				.updateTable('post')
				.set({ topic_id: topic.id })
				.where('post.id', '=', post.id)
				.execute();
			post.topic_id = topic.id;

			const result = await commonGatherFn(type, db, 'topic', (eb) => eb('topic.id', '=', topic.id));

			expect(result).toEqual({
				...getExpectedObject({
					type,
					table: 'topic',
					depth: 3,
					result: asFk('topic', 3, {
						...topic,
						main_post: asFk('post', 2, {
							...post,
							author: asFk('user', 1, {
								...author,
								avatar_img: null
							}),
							banner_img: null,
							topic: asFk('topic', 1, {
								...topic,
								main_post: asFk('post', 0, post)
							})
						})
					})
				}),
				models: expect.any(Object),
				// asGatherOneX should not be defined for a gatherSome result.
				...(type === 'gatherSome'
					? {}
					: {
							asGatherOneX: expect.any(Function)
					  })
			});
		}

		describe('gatherOne()', () => {
			it('gathers a simple model (no fks defined in schema)', async () => {
				await gatherSimpleModel('gatherOne');
			});

			it('gathers a model with fks (fks defined in schema and this model references existing rows in db)', async () => {
				await gatherSimpleWithFks('gatherOne');
			});

			it('gathers a model without fks (fks defined in schema but this model does not reference them)', async () => {
				await gatherSimpleNoFks('gatherOne');
			});

			it('gathers a model shallowly (fks defined in schema and this model references existing rows in db, but gather depth of 0 prevents them from being fetched)', async () => {
				await gatherShallow('gatherOne');
			});

			it('gathers circular references', async () => {
				await gatherCircularReferences('gatherOne');
			});

			it('gathers a model with missing fk rows - default behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)', async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				// The default behaviour should omit the missing fk row, returning undefined instead.
				const result = await rizzolver.gatherOne(db, 'user', (eb) => eb('user.id', '=', user.id));

				expect(result).toMatchObject({
					gatherType: 'gatherOne',
					table: 'user',
					depth: 3,
					result: undefined
				});
			});

			it(`gathers a model with missing fk rows - 'omit' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				// Test with 'omit' specifically
				const resultOmit = await rizzolver.gatherOne(
					db,
					'user',
					(eb) => eb('user.id', '=', user.id),
					{
						onInvalidModel: 'omit'
					}
				);

				expect(resultOmit).toMatchObject({
					gatherType: 'gatherOne',
					table: 'user',
					depth: 3,
					result: undefined
				});
			});

			it(`gathers a model with missing fk rows - 'throw' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				// Test with 'throw'
				await expect(() =>
					rizzolver.gatherOne(db, 'user', (eb) => eb('user.id', '=', user.id), {
						onInvalidModel: 'throw'
					})
				).rejects.toThrow(
					`Failed to gather model (table: 'user', id: ${user.id}): Could not find model for FK reference 'avatar_img' (column: 'avatar_img_id') for id ${user.avatar_img_id}`
				);
			});

			it(`gathers a model with missing fk rows - 'null' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				// Test with 'null'
				const resultNull = await rizzolver.gatherOne(
					db,
					'user',
					(eb) => eb('user.id', '=', user.id),
					{
						onInvalidModel: 'null'
					}
				);

				expect(resultNull).toMatchObject({
					gatherType: 'gatherOne',
					table: 'user',
					depth: 3,
					// TODO: this is confusing, i would expect null value here and not undefined. perhaps change the option name.
					result: undefined
				});
			});

			it(`gathers a model with missing fk rows - 'keep' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				// Test with 'keep'
				const resultKeep = await rizzolver.gatherOne(
					db,
					'user',
					(eb) => eb('user.id', '=', user.id),
					{
						onInvalidModel: 'keep'
					}
				);

				expect(resultKeep).toMatchObject({
					gatherType: 'gatherOne',
					table: 'user',
					depth: 3,
					result: asFk('user', 3, {
						...user,
						avatar_img: null
					})
				});
			});

			it('gathers no results when no rows match', async () => {
				const db = getDbInstance();

				const result = await rizzolver.gatherOne(db, 'user', (eb) => eb('user.id', '=', 0));

				expect(result).toMatchObject({
					gatherType: 'gatherOne',
					table: 'user',
					depth: 3,
					result: undefined
				});
			});
		});

		describe('gatherOneX()', () => {
			it('gathers a simple model (no fks defined in schema)', async () => {
				await gatherSimpleModel('gatherOneX');
			});

			it('gathers a model with fks (fks defined in schema and this model references existing rows in db)', async () => {
				await gatherSimpleWithFks('gatherOneX');
			});

			it('gathers a model without fks (fks defined in schema but this model does not reference them)', async () => {
				await gatherSimpleNoFks('gatherOneX');
			});

			it('gathers a model shallowly (fks defined in schema and this model references existing rows in db, but gather depth of 0 prevents them from being fetched)', async () => {
				await gatherShallow('gatherOneX');
			});

			it('gathers circular references', async () => {
				await gatherCircularReferences('gatherOneX');
			});

			it('throws an error on model with missing fks - default behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)', async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				await expect(() =>
					rizzolver.gatherOneX(db, 'user', (eb) => eb('user.id', '=', user.id))
				).rejects.toThrow('Expected a gatherOneX result');
			});

			it(`throws an error on model with missing fks - 'omit' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				await expect(() =>
					rizzolver.gatherOneX(db, 'user', (eb) => eb('user.id', '=', user.id), {
						onInvalidModel: 'omit'
					})
				).rejects.toThrow('Expected a gatherOneX result');
			});

			it(`throws an error on model with missing fks - 'throw' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				await expect(() =>
					rizzolver.gatherOneX(db, 'user', (eb) => eb('user.id', '=', user.id), {
						onInvalidModel: 'throw'
					})
				).rejects.toThrow(
					`Failed to gather model (table: 'user', id: ${user.id}): Could not find model for FK reference 'avatar_img' (column: 'avatar_img_id') for id ${user.avatar_img_id}`
				);
			});

			it(`throws an error on model with missing fks - 'null' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				await expect(() =>
					rizzolver.gatherOneX(db, 'user', (eb) => eb('user.id', '=', user.id), {
						onInvalidModel: 'null'
					})
				).rejects.toThrow('Expected a gatherOneX result');
			});

			it(`throws an error on model with missing fks - 'keep' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user } = await commonMissingRowsFkSetup();

				const result = await rizzolver.gatherOneX(db, 'user', (eb) => eb('user.id', '=', user.id), {
					onInvalidModel: 'keep'
				});

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

			it('throws an error when no rows match', async () => {
				const db = getDbInstance();

				await expect(() =>
					rizzolver.gatherOneX(db, 'user', (eb) => eb('user.id', '=', 0))
				).rejects.toThrow('Expected a gatherOneX result');
			});
		});

		describe('gatherSome()', () => {
			it('gathers a simple model (no fks defined in schema)', async () => {
				await gatherSimpleModel('gatherSome');
			});

			it('gathers a model with fks (fks defined in schema and this model references existing rows in db)', async () => {
				await gatherSimpleWithFks('gatherSome');
			});

			it('gathers a model without fks (fks defined in schema but this model does not reference them)', async () => {
				await gatherSimpleNoFks('gatherSome');
			});

			it('gathers a model shallowly (fks defined in schema and this model references existing rows in db, but gather depth of 0 prevents them from being fetched)', async () => {
				await gatherShallow('gatherSome');
			});

			it('gathers circular references', async () => {
				await gatherCircularReferences('gatherSome');
			});

			async function commonMissingRowsFkSomeSetup() {
				const { db, user: user1, missingMediaItem } = await commonMissingRowsFkSetup();

				const mediaItem2 = await db
					.insertInto('media_item')
					.values({ width: 100, height: 200, url: 'http://example.com/image2.png' })
					.returningAll()
					.executeTakeFirstOrThrow();

				const user2 = await db
					.insertInto('user')
					.values({ name: 'Bob', avatar_img_id: mediaItem2.id })
					.returningAll()
					.executeTakeFirstOrThrow();

				const user3 = await db
					.insertInto('user')
					.values({ name: 'Charlie', avatar_img_id: null })
					.returningAll()
					.executeTakeFirstOrThrow();

				return { db, user1, user2, user3, missingMediaItem, mediaItem2 };
			}

			it('gathers a model with missing fk rows - default behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)', async () => {
				const { db, user1, user2, user3, mediaItem2 } = await commonMissingRowsFkSomeSetup();

				// The default behaviour should omit the missing fk row, returning undefined instead.
				const result = await rizzolver.gatherSome(db, 'user', (eb) =>
					eb('user.id', 'in', [user1.id, user2.id, user3.id])
				);

				expect(result).toMatchObject({
					gatherType: 'gatherSome',
					table: 'user',
					depth: 3,
					result: expect.arrayContaining([
						asFk('user', 3, {
							...user2,
							avatar_img: asFk('media_item', 2, mediaItem2)
						}),
						asFk('user', 3, {
							...user3,
							avatar_img: null
						})
					])
				});

				expect(result.result.length).toBe(2);
			});

			it(`gathers a model with missing fk rows - 'omit' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user1, user2, user3, mediaItem2 } = await commonMissingRowsFkSomeSetup();

				// The default behaviour should omit the missing fk row, returning undefined instead.
				const result = await rizzolver.gatherSome(
					db,
					'user',
					(eb) => eb('user.id', 'in', [user1.id, user2.id, user3.id]),
					{ onInvalidModel: 'omit' }
				);

				expect(result).toMatchObject({
					gatherType: 'gatherSome',
					table: 'user',
					depth: 3,
					result: expect.arrayContaining([
						asFk('user', 3, {
							...user2,
							avatar_img: asFk('media_item', 2, mediaItem2)
						}),
						asFk('user', 3, {
							...user3,
							avatar_img: null
						})
					])
				});

				expect(result.result.length).toBe(2);
			});

			it(`gathers a model with missing fk rows - 'throw' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user1, user2, user3 } = await commonMissingRowsFkSomeSetup();

				// Test with 'throw'
				await expect(() =>
					rizzolver.gatherSome(
						db,
						'user',
						(eb) => eb('user.id', 'in', [user1.id, user2.id, user3.id]),
						{
							onInvalidModel: 'throw'
						}
					)
				).rejects.toThrow(
					`Failed to gather model (table: 'user', id: ${user1.id}): Could not find model for FK reference 'avatar_img' (column: 'avatar_img_id') for id ${user1.avatar_img_id}`
				);
			});

			it(`gathers a model with missing fk rows - 'keep' behaviour (fks defined and populated on the referencing model, but the rows for the referenced table do not exist)`, async () => {
				const { db, user1, user2, user3, mediaItem2 } = await commonMissingRowsFkSomeSetup();

				// The default behaviour should omit the missing fk row, returning undefined instead.
				const result = await rizzolver.gatherSome(
					db,
					'user',
					(eb) => eb('user.id', 'in', [user1.id, user2.id, user3.id]),
					{ onInvalidModel: 'keep' }
				);

				expect(result).toMatchObject({
					gatherType: 'gatherSome',
					table: 'user',
					depth: 3,
					result: expect.arrayContaining([
						asFk('user', 3, {
							...user1,
							avatar_img: null
						}),
						asFk('user', 3, {
							...user2,
							avatar_img: asFk('media_item', 2, mediaItem2)
						}),
						asFk('user', 3, {
							...user3,
							avatar_img: null
						})
					])
				});

				expect(result.result.length).toBe(3);
			});

			it('gathers no results when no rows match', async () => {
				const db = getDbInstance();

				const result = await rizzolver.gatherSome(db, 'user', (eb) => eb('user.id', '=', 0));

				expect(result).toMatchObject({
					gatherType: 'gatherSome',
					table: 'user',
					depth: 3,
					result: []
				});
			});
		});
	});
});
