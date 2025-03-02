import { Kysely, SqliteDialect } from 'kysely';
import * as Database from 'better-sqlite3';

export function setupDatabase<DB = any>(initDb?: (db: Kysely<any>) => void) {
	let db: Kysely<DB> = null as any;
	let sqliteDb: any;

	beforeEach(async () => {
		sqliteDb = new Database(':memory:');
		sqliteDb.pragma('journal_mode = WAL');

		db = new Kysely({
			dialect: new SqliteDialect({
				database: sqliteDb
			})
		});

		await initDb?.(db);
	});

	afterEach(() => {
		db.destroy();
		sqliteDb.close();
	});

	return {
		getDbInstance: () => db
	};
}
