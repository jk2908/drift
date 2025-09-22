import type { LinkTag, MetaTag, Metadata as TMetadata } from '../types'

import { EntryKind } from '../config'

type TEntryKind = typeof EntryKind
type MetadataSource = Exclude<TEntryKind[keyof TEntryKind], typeof EntryKind.ENDPOINT>

const TITLE_TEMPLATE_STR = '%s'

export const PRIORITY: Record<MetadataSource, number> = {
	[EntryKind.SHELL]: 10,
	[EntryKind.LAYOUT]: 20,
	[EntryKind.PAGE]: 30,
	[EntryKind.ERROR]: 40,
} as const

export class MetadataCollection {
	#base: TMetadata = {}
	#collection: {
		priority: number
		item: Promise<TMetadata>
	}[] = []

	constructor(base?: TMetadata) {
		if (base) this.#base = base
	}

	/**
	 * Merges multiple metadata objects into one
	 * @param items - an array of metadata objects to merge
	 * @returns Merged metadata object
	 */
	static #merge(...items: TMetadata[]) {
		if (!items.length) return {} satisfies TMetadata

		let titleTemplate: string | undefined
		let title: string | undefined

		const metaMap = new Map<string, MetaTag>()
		const linkMap = new Map<string, LinkTag>()

		for (const item of items) {
			if (item.title) {
				const titleStr = item.title.toString()

				if (titleStr.includes(TITLE_TEMPLATE_STR)) {
					titleTemplate = titleStr
				} else {
					title = titleStr
				}
			}

			if (item.meta) {
				for (const tag of item.meta) {
					metaMap.set(MetadataCollection.#getMetaTagKey(tag), tag)
				}
			}

			if (item.link) {
				for (const tag of item.link) {
					linkMap.set(MetadataCollection.#getLinkTagKey(tag), tag)
				}
			}
		}

		const metadata: TMetadata = {}

		// build final title
		if (titleTemplate && title) {
			metadata.title = titleTemplate.replace(TITLE_TEMPLATE_STR, title)
		} else {
			metadata.title = title ?? titleTemplate?.replace(TITLE_TEMPLATE_STR, '').trim()
		}

		// assign final tags
		metadata.meta = [...metaMap.values()]
		metadata.link = [...linkMap.values()]

		return metadata
	}

	/**
	 * Clones an object using structuredClone with a fallback to JSON methods
	 * @param obj - the object to clone
	 * @returns A clone of the object
	 */
	static #clone<T>(obj: T) {
		if (typeof structuredClone === 'function') {
			return structuredClone(obj) as T
		}

		return JSON.parse(JSON.stringify(obj)) as T
	}

	/**
	 * Gets a unique key for the meta tag
	 * @param tag - the meta tag
	 * @returns A unique key for the meta tag
	 */
	static #getMetaTagKey(tag: MetaTag) {
		return 'name' in tag && tag.name
			? `name:${tag.name}`
			: 'property' in tag && tag.property
				? `property:${tag.property}`
				: 'httpEquiv' in tag && tag.httpEquiv
					? `httpEquiv:${tag.httpEquiv}`
					: 'charSet' in tag && tag.charSet
						? 'charSet'
						: JSON.stringify(tag)
	}

	/**
	 * Gets a unique key for the link tag
	 * @param tag - the link tag
	 * @returns A unique key for the link tag
	 */
	static #getLinkTagKey(tag: LinkTag) {
		return tag.rel + (tag.href ?? '')
	}

	/**
	 * Adds tasks to the collection
	 * @param tasks - an array of task objects containing a promise and a priority
	 * @returns The current instance of the MetadataCollection
	 */
	add(
		...tasks: {
			task: Promise<TMetadata>
			priority: number
		}[]
	) {
		for (const { task, priority } of tasks) {
			this.#collection.push({ priority, item: task })
		}

		return this
	}

	/**
	 * Merges metadata from all sources, sorted by priority
	 * @returns A promise that resolves to the merged metadata
	 */
	async run() {
		const items = [...this.#collection].sort((a, b) => a.priority - b.priority)
		let merged = MetadataCollection.#clone(this.#base)

		if (items.length === 0) return merged

		const tasks = items.map(entry =>
			entry.item
				.then(item => ({ item, priority: entry.priority }))
				.catch(() => ({ item: {}, priority: entry.priority })),
		)

		const res = await Promise.allSettled(tasks)
		const ok = res
			.filter(r => r.status === 'fulfilled')
			.map(r => r.value)
			.sort((a, b) => a.priority - b.priority)
			.map(r => r.item)

		if (ok.length) merged = MetadataCollection.#merge(merged, ...ok)

		return merged
	}

	/**
	 * @returns A clone of the base metadata
	 */
	get base() {
		return MetadataCollection.#clone(this.#base)
	}
}
