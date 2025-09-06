'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCSRFToken } from '@/hooks/useCSRFToken';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  lastLoginAt: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { secureFetch, addCSRFToJSON } = useCSRFToken();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      loadProfile();
    }
  }, [status, router]);

  const loadProfile = async () => {
    try {
      // Simulate loading profile data
      // In real implementation, you'd fetch from /api/user/profile
      const mockProfile: UserProfile = {
        id: session?.user?.id || '',
        name: session?.user?.name || '',
        email: session?.user?.email || '',
        image: session?.user?.image || undefined,
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
        twoFactorEnabled: false,
        emailVerified: true,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      };

      setProfile(mockProfile);
      setName(mockProfile.name);
      setEmail(mockProfile.email);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secureFetch) return;

    setSaving(true);
    try {
      const response = await secureFetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addCSRFToJSON({
          name,
          email
        }))
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      alert('Profile updated successfully!');
      await loadProfile();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secureFetch) return;

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const response = await secureFetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addCSRFToJSON({
          currentPassword,
          newPassword
        }))
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      alert('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
          <h3 className="text-red-800 font-medium">Error Loading Settings</h3>
          <p className="text-red-700 mt-2">{error}</p>
          <button 
            onClick={loadProfile}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'billing', name: 'Billing', icon: '💳' },
    { id: 'preferences', name: 'Preferences', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account settings and preferences</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3 text-lg">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 mt-6 lg:mt-0">
            <div className="bg-white shadow rounded-lg">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="px-6 py-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h2>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <div className="h-20 w-20 bg-gray-300 rounded-full flex items-center justify-center">
                        {profile?.image ? (
                          <img src={profile.image} alt="Profile" className="h-20 w-20 rounded-full" />
                        ) : (
                          <span className="text-2xl text-gray-600">
                            {profile?.name?.[0] || profile?.email[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Change Photo
                        </button>
                        <p className="text-sm text-gray-500 mt-2">JPG, GIF or PNG. 1MB max.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your full name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>

                  {/* Account Info */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-md font-medium text-gray-900 mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Member since:</span>
                        <span className="text-gray-900">
                          {profile && new Date(profile.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last login:</span>
                        <span className="text-gray-900">
                          {profile && new Date(profile.lastLoginAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email verified:</span>
                        <span className={profile?.emailVerified ? 'text-green-600' : 'text-red-600'}>
                          {profile?.emailVerified ? 'Verified' : 'Not verified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="px-6 py-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>
                  
                  {/* Change Password */}
                  <div className="mb-8">
                    <h3 className="text-md font-medium text-gray-900 mb-4">Change Password</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Changing...' : 'Change Password'}
                      </button>
                    </form>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="pt-8 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-md font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${profile?.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}`}>
                          {profile?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          onClick={() => router.push('/security')}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Configure
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Security Questions */}
                  <div className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-medium text-gray-900">Security Questions</h3>
                        <p className="text-sm text-gray-600">Set up security questions for account recovery</p>
                      </div>
                      <button
                        onClick={() => router.push('/security')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Manage Questions
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <div className="px-6 py-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Billing & Subscription</h2>
                  
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">Current Plan</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{profile?.subscriptionPlan}</p>
                        <p className="text-sm text-gray-600 capitalize">{profile?.subscriptionStatus?.toLowerCase()}</p>
                      </div>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        Upgrade Plan
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Payment Methods</h4>
                          <p className="text-sm text-gray-600">Manage your payment methods</p>
                        </div>
                        <span className="text-gray-400">→</span>
                      </div>
                    </button>
                    
                    <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Billing History</h4>
                          <p className="text-sm text-gray-600">View your payment history and invoices</p>
                        </div>
                        <span className="text-gray-400">→</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="px-6 py-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Preferences</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Notifications</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">Email notifications for security events</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">Team invitation notifications</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                          <span className="ml-2 text-sm text-gray-700">Marketing and promotional emails</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Language & Region</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                        <select className="border border-gray-300 rounded-md px-3 py-2">
                          <option>English</option>
                          <option>Spanish</option>
                          <option>French</option>
                        </select>
                        <select className="border border-gray-300 rounded-md px-3 py-2">
                          <option>UTC</option>
                          <option>EST</option>
                          <option>PST</option>
                        </select>
                      </div>
                    </div>
                    
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}