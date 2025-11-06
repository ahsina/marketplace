'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, Inbox, Send, Trash2, Eye, EyeOff } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Message {
  id: string
  subject: string
  message: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    username: string
  }
  receiver: {
    id: string
    username: string
  }
  productId?: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    fetchMessages()
  }, [isAuthenticated, activeTab])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages?type=${activeTab}`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
      })
      const data = await response.json()

      if (data.success) {
        fetchMessages()
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        toast.success('Message deleted')
        setSelectedMessage(null)
        fetchMessages()
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    }
  }

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message)
    if (activeTab === 'received' && !message.isRead) {
      markAsRead(message.id)
    }
  }

  const unreadCount = messages.filter((m) => !m.isRead).length

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            Communicate with buyers and sellers securely
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => {
                    setActiveTab('received')
                    setSelectedMessage(null)
                  }}
                  className={`w-1/2 inline-flex items-center justify-center space-x-2 px-6 py-4 font-medium transition ${
                    activeTab === 'received'
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Inbox className="w-5 h-5" />
                  <span>Inbox</span>
                  {unreadCount > 0 && activeTab === 'received' && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('sent')
                    setSelectedMessage(null)
                  }}
                  className={`w-1/2 inline-flex items-center justify-center space-x-2 px-6 py-4 font-medium transition ${
                    activeTab === 'sent'
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Send className="w-5 h-5" />
                  <span>Sent</span>
                </button>
              </div>

              {/* Message List */}
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No messages</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => handleSelectMessage(message)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                        selectedMessage?.id === message.id ? 'bg-purple-50' : ''
                      } ${!message.isRead && activeTab === 'received' ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium text-gray-900 flex items-center space-x-2">
                          <span>
                            {activeTab === 'received'
                              ? message.sender.username
                              : message.receiver.username}
                          </span>
                          {!message.isRead && activeTab === 'received' && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(message.createdAt), 'MMM dd')}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-700 mb-1 line-clamp-1">
                        {message.subject}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {message.message}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <div className="bg-white rounded-xl shadow-lg p-8">
                {/* Message Header */}
                <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedMessage.subject}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        {activeTab === 'received' ? 'From' : 'To'}:{' '}
                        <Link
                          href={`/sellers/${
                            activeTab === 'received'
                              ? selectedMessage.sender.id
                              : selectedMessage.receiver.id
                          }`}
                          className="text-purple-600 hover:text-purple-700 font-medium"
                        >
                          {activeTab === 'received'
                            ? selectedMessage.sender.username
                            : selectedMessage.receiver.username}
                        </Link>
                      </span>
                      <span>•</span>
                      <span>
                        {format(
                          new Date(selectedMessage.createdAt),
                          'PPP p'
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Message Body */}
                <div className="prose prose-purple max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>

                {/* Reply Button */}
                {activeTab === 'received' && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <Link
                      href={`/sellers/${selectedMessage.sender.id}`}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
                    >
                      <Send className="w-5 h-5" />
                      <span>Reply</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No message selected
                </h3>
                <p className="text-gray-600">
                  Select a message from the list to view its contents
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
