import type { LinkTag, Metadata, MetaTag, Params } from '../types'

const TITLE_TEMPLATE_STR = '%s'

/**
 * Resolve metadata objects from route module promises
 * @param promises - the route module promises
 * @param args - the arguments to pass to the metadata function
 * @param args.params - the route parameters, if any
 * @param args.error - the error object, if any
 * @returns the resolved metadata objects
 */
export async function resolveMetadata(
	promises: Promise<unknown>[],
	args: { params?: Params; error?: Error },
) {
	const modules = await Promise.all(promises).catch(() => [])

	return Promise.all(
		modules.map(async m => {
			if (typeof m !== 'object' || m === null || !('metadata' in m)) return {}

			const metadata = m.metadata as
				| ((args: { params?: Params; error?: Error }) => Promise<Metadata> | Metadata)
				| Metadata

			return typeof metadata === 'function' ? metadata(args) : metadata
		}),
	)
}

/**
 * Merges metadata objects, last one wins
 * @param args {Metadata | undefined} - the metadata objects to merge
 * @returns the final, merged metadata object
 */
export function mergeMetadata(...args: (Metadata | undefined)[]) {
	if (!args.length) return {} satisfies Metadata

	const allItems = args.filter(i => i !== undefined)

	let titleTemplate: string | undefined
	let title: string | undefined

	const metaMap = new Map<string, MetaTag>()
	const linkMap = new Map<string, LinkTag>()

	for (const item of allItems) {
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
				metaMap.set(getMetaTagKey(tag), tag)
			}
		}

		if (item.link) {
			for (const tag of item.link) {
				linkMap.set(getLinkTagKey(tag), tag)
			}
		}
	}

	const metadata: Metadata = {}

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

function getMetaTagKey(tag: MetaTag): string {
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

function getLinkTagKey(tag: LinkTag): string {
	return tag.rel + (tag.href ?? '')
}
