import { Generated, Kysely } from 'kysely';
import { KyselyRizzolver } from '../src';

export interface User {
	id: Generated<number>;
	name: string;
	avatar_img_id: number | null;
}

export interface MediaItem {
	id: Generated<number>;
	width: number;
	height: number;
	url: string;
}

export interface Post {
	id: Generated<number>;
	author_id: number;
	title: string;
	description: string | null;
	banner_img_id: number | null;
	topic_id: number;
}

export interface Topic {
	id: Generated<number>;
	name: string;
	main_post_id: number;
}

export interface CommonDB {
	user: User;
	media_item: MediaItem;
	post: Post;
	topic: Topic;
}

export const commonDbRizzolver = KyselyRizzolver.builder<CommonDB>()
	.table('user', ['id', 'name', 'avatar_img_id'] as const)
	.table('media_item', ['id', 'width', 'height', 'url'] as const)
	.table('post', ['id', 'author_id', 'title', 'description', 'banner_img_id', 'topic_id'] as const)
	.table('topic', ['id', 'name', 'main_post_id'] as const)
	.build((builder) =>
		builder
			.add('user', 'avatar_img_id', 'media_item', 'id', 'avatar_img', true)
			.add('post', 'author_id', 'user', 'id', 'author')
			.add('post', 'banner_img_id', 'media_item', 'id', 'banner_img', true)
			.add('post', 'topic_id', 'topic', 'id', 'topic')
			.add('topic', 'main_post_id', 'post', 'id', 'main_post')
			.build()
	);

export async function commonDbInit(db: Kysely<any>) {
	await db.schema
		.createTable('user')
		.addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
		.addColumn('name', 'text', (col) => col.notNull())
		.addColumn('avatar_img_id', 'integer', (col) => col.references('media_item.id'))
		.execute();

	await db.schema
		.createTable('media_item')
		.addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
		.addColumn('width', 'integer', (col) => col.notNull())
		.addColumn('height', 'integer', (col) => col.notNull())
		.addColumn('url', 'text', (col) => col.notNull())
		.execute();

	await db.schema
		.createTable('post')
		.addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
		.addColumn('author_id', 'integer', (col) => col.notNull().references('user.id'))
		.addColumn('title', 'text', (col) => col.notNull())
		.addColumn('description', 'text')
		.addColumn('banner_img_id', 'integer', (col) => col.references('media_item.id'))
		.addColumn('topic_id', 'integer', (col) => col.references('topic.id'))
		.execute();

	await db.schema
		.createTable('topic')
		.addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
		.addColumn('name', 'text', (col) => col.notNull())
		.addColumn('main_post_id', 'integer', (col) => col.references('post.id'))
		.execute();
}
