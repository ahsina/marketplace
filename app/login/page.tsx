'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Mail, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        login(data.data.user, data.data.token)
        toast.success('Welcome back!')
        router.push('/marketplace')
      } else {
        toast.error(data.error || 'Login failed')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white">
      <Navbar />

      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to access your anonymous marketplace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.emailOrUsername}
                    onChange={(e) =>
                      setFormData({ ...formData, emailOrUsername: e.target.value })
                    }
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition"
                    placeholder="your@email.com or username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                {!isLoading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-purple-600 font-medium hover:text-purple-700"
              >
                Create one now
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>🔒 Your privacy is our priority</p>
            <p>No tracking • No personal data collection</p>
          </div>
        </div>
      </div>
    </div>
  )
}
