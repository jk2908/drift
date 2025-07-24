import { useRouter } from '../shared/router'

/**
 * A link component that navigates to a given href
 * @param href - the href to navigate to
 * @param props - the props to pass to the link
 * @returns a link element that navigates to the given href
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
