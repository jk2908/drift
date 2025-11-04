import { Suspense } from 'react'

import { Yellow } from '../yellow'
import { Blue } from '../blue'


export const metadata = async () => ({
  title: 'Profile Page',
})

export default function Page() {
  return (
    <>
      I am the profile page

      <Suspense fallback={<div>Loading...</div>}>
        <Yellow />
      </Suspense>

      <Blue />
    </>
  )
}