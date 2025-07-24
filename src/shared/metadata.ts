import type { LinkTag, Metadata, MetaTag } from '../types'

const TITLE_TEMPLATE_STR = '%s'

/**
 * Merge metadata objects, last one wins
 * @param args - the metadata objects to merge
 * @returns merged metadata
 */
export function merge(...args: (Metadata | undefined)[]) {
	if (!args.length) return {} satisfies Metadata

	const metadata: Metadata = {}
	const allItems = args
		.filter(item => item !== undefined)
		.map(item => structuredClone(item))

	const titleTemplate = allItems
		.find(item => item.title?.toString().includes(TITLE_TEMPLATE_STR))
		?.title?.toString()
	const titleParts = allItems
		.map(item => item.title?.toString())
		.filter((title): title is string => !!title && !title.includes(TITLE_TEMPLATE_STR))

	if (titleTemplate) {
		metadata.title = titleParts?.length
			? titleParts.reduce(
					(acc, part) => acc.replace(TITLE_TEMPLATE_STR, part),
					titleTemplate,
				)
			: titleTemplate.replace(TITLE_TEMPLATE_STR, '')
	} else {
		metadata.title = titleParts.length > 0 ? titleParts[titleParts.length - 1] : undefined
	}

	metadata.meta = allItems.reduce(
		(acc, item) =>
			dedupeWithPriority(acc, item.meta, tag =>
				'name' in tag && tag.name
					? tag.name
					: 'property' in tag && tag.property
						? tag.property
						: 'httpEquiv' in tag && tag.httpEquiv
							? tag.httpEquiv
							: 'charSet' in tag && tag.charSet
								? tag.charSet
								: JSON.stringify(tag),
			),
		[] as MetaTag[],
	)

	metadata.link = allItems.reduce(
		(acc, item) =>
			dedupeWithPriority(
				acc,
				item.link,
				tag =>
					tag.rel +
					(tag.href ?? '') +
					(tag.as ?? '') +
					(tag.type ?? '') +
					(tag.media ?? '') +
					(tag.sizes ?? '') +
					(tag.crossOrigin ?? ''),
			),
		[] as LinkTag[],
	)

	return metadata
}

/**
 * Deduplicate metadata objects with priority
 * @param acc - the accumulated metadata objects
 * @param item - the metadata objects to deduplicate
 * @param getKey - the function to get the key of the metadata object
 * @returns the deduplicated metadata objects
 */
function dedupeWithPriority<T extends Record<string, unknown> & { priority?: number }>(
	acc: T[] | undefined,
	item: T[] | undefined,
	getKey: (tag: T) => string,
): T[] {
	const map = new Map<string, T>()

	for (const el of acc ?? []) {
		map.set(getKey(el), el)
	}

	for (const el of item ?? []) {
		const key = getKey(el)
		const existing = map.get(key)

		if (!existing || (el.priority ?? 0) >= (existing.priority ?? 0)) {
			map.set(key, el)
		}
	}

	return [...map.values()]
}
