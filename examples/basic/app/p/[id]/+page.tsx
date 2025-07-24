
export const metadata = async ({ params }: { params?: { id: string } }) => {
	const post = allPosts.find(p => p.__mdsrc.slug === params?.id)

	return {
		title: post?.title,
		meta: [
			{
				name: 'description',
				content: post?.excerpt
			}
		],
	}
}

export default function Post({ params }: { params?: { id: string } }) {
	const post = allPosts.find(p => p.__mdsrc.slug === params?.id)

	return <>Post {JSON.stringify(post)}</>
}

export const prerender = () => allPosts.map(p => ({ id: p.__mdsrc.slug }))

const allPosts = [
  {
    __mdsrc: {
      slug: 'post-1',
    },
    title: 'Post 1',
    excerpt: 'This is the excerpt for post 1',
  }, {
    __mdsrc: {
      slug: 'post-2',
    },
    title: 'Post 2',
    excerpt: 'This is the excerpt for post 2',
  }
]