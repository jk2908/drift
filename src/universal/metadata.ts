import type { Metadata, MetaTag, LinkTag } from '../types'

const TITLE_TEMPLATE_STR = '%s'

/**
 * Merge metadata objects, last one wins unless overridden by priority
 * @param args - The metadata objects to merge
 * @returns Merged metadata
 */
export function merge(...args: (Metadata | undefined)[]) {
	if (!args.length) return {} satisfies Metadata

	const titleSegments: string[] = []

	return args.reduce<Metadata>((acc, itemRaw) => {
		const item = structuredClone(itemRaw) ?? {}

		const rawTitle = item.title?.toString()
		if (rawTitle) titleSegments.unshift(rawTitle)

		const hasTemplate = titleSegments.some(segment =>
			segment.includes(TITLE_TEMPLATE_STR),
		)

		if (hasTemplate) {
			acc.title = titleSegments.reduce((accTitle, segment) => {
				return accTitle.includes(TITLE_TEMPLATE_STR)
					? accTitle.replace(TITLE_TEMPLATE_STR, segment)
					: segment
			}, TITLE_TEMPLATE_STR)
		} else {
			acc.title = titleSegments[0]
		}

		acc.meta = dedupeWithPriority<MetaTag>(acc.meta, item.meta, tag =>
			'name' in tag && tag.name
				? tag.name
				: 'property' in tag && tag.property
					? tag.property
					: 'httpEquiv' in tag && tag.httpEquiv
						? tag.httpEquiv
						: 'charSet' in tag && tag.charSet
							? tag.charSet
							: JSON.stringify(tag),
		)

		acc.link = dedupeWithPriority<LinkTag>(
			acc.link,
			item.link,
			tag =>
				tag.rel +
				(tag.href ?? '') +
				(tag.as ?? '') +
				(tag.type ?? '') +
				(tag.media ?? '') +
				(tag.sizes ?? '') +
				(tag.crossOrigin ?? ''),
		)

		return acc
	}, {})
}

/**
 * Deduplicate metadata objects with priority
 * @param acc - The accumulated metadata objects
 * @param item - The metadata objects to deduplicate
 * @param getKey - The function to get the key of the metadata object
 * @returns The deduplicated metadata objects
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
