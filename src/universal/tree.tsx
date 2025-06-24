export function Tree({
	leaves,
	params,
}: {
	leaves: React.ComponentType<{
		children: React.ReactNode
		params: Record<string, string>
	}>[]
	params: Record<string, string>
}) {
	return leaves.reduce((child, Leaf, idx) => {
		const key = Leaf.displayName ?? Leaf.name ?? `l:${idx}`

		return (
			<Leaf key={key} params={params}>
				{child}
			</Leaf>
		)
	}, null as React.ReactNode)
}
