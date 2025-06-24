import { useRouter } from '../universal/router'

/**
 * A link component that navigates to a given href
 * @param href - The href to navigate to
 * @param props - The props to pass to the link
 * @returns The link component
 */
export function Link({ href, ...props }: React.ComponentPropsWithRef<'a'>) {
	const { go } = useRouter()

	return (
		<a
			{...props}
			href={href}
			onClick={e => {
				e.preventDefault()
				href && go(href)
			}}
		/>
	)
}
