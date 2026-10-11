import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default function LoginPage({ searchParams }: { searchParams: { next?: string; expired?: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <LoginForm next={searchParams.next} expired={searchParams.expired === '1'} />
    </div>
  )
}
