export const metadata = {
  title: 'Error Page',
}

export default function Err({ error }: { error: Error }) {
  return <>
    I am the error page
    {JSON.stringify({
      error: {
        message: error.message,
        stack: error.stack,
      },
    })}
  </>
}