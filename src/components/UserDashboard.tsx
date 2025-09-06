'use client';

import { useState, useEffect, useMemo } from 'react';
import { User, SubscriptionPlan, Team, TeamMember, PLAN_FEATURES } from '@/types';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { SecureForm } from '@/components/SecureForm';

interface ActivityLog {
  id: string;
  action: string;
  timestamp: Date;
  details?: string;
  severity: 'info' | 'warning' | 'error';
}

interface UserStats {
  vaultEntries: number;
  sharedVaults: number;
  lastLogin: Date;
  securityScore: number;
  weeklyActivity: number;
  storageUsed: number; // in MB
}

interface UserDashboardProps {
  user: User;
  team?: Team;
  teamMembers?: TeamMember[];
  userStats?: UserStats;
  activityLogs?: ActivityLog[];
  onUpdateProfile: (updates: Partial<User>) => void;
  onManageSubscription: () => void;
  onInviteTeamMember: (email: string, role: string) => void;
  onRemoveTeamMember: (memberId: string) => void;
  onChangeUserRole: (memberId: string, role: string) => void;
  onSetup2FA: () => void;
  onChangePassword: () => void;
  onViewSessions: () => void;
  onExportData: () => void;
  onDeleteAccount: () => void;
}

export default function UserDashboard({
  user,
  team,
  teamMembers = [],
  userStats,
  activityLogs = [],
  onUpdateProfile,
  onManageSubscription,
  onInviteTeamMember,
  onRemoveTeamMember,
  onChangeUserRole,
  onSetup2FA,
  onChangePassword,
  onViewSessions,
  onExportData,
  onDeleteAccount
}: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'subscription' | 'team' | 'security' | 'activity'>('overview');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    email: user.email
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member'
  });
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' }[]>([]);

  // Mock vault entries for security monitoring (replace with actual data)
  const mockVaultEntries = useMemo(() => [], []);
  const { securityScore, alerts, hasActiveAlerts, criticalAlerts, getSecurityScoreColor } = useSecurityMonitoring(mockVaultEntries);

  const currentPlanFeatures = PLAN_FEATURES[user.subscriptionPlan];

  // Auto-dismiss notifications
  useEffect(() => {
    notifications.forEach(notification => {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    });
  }, [notifications]);

  const addNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const handleProfileSave = async () => {
    try {
      await onUpdateProfile(profileForm);
      setEditingProfile(false);
      addNotification('Profile updated successfully', 'success');
    } catch (error) {
      addNotification('Failed to update profile', 'error');
    }
  };

  const handleInviteMember = async (e: React.FormEvent, csrfToken: string) => {
    e.preventDefault();
    if (inviteForm.email.trim()) {
      try {
        await onInviteTeamMember(inviteForm.email.trim(), inviteForm.role);
        setInviteForm({ email: '', role: 'member' });
        addNotification('Team member invited successfully', 'success');
      } catch (error) {
        addNotification('Failed to invite team member', 'error');
      }
    }
  };

  const calculateUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0; // Unlimited
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800',
      incomplete: 'bg-gray-100 text-gray-800'
    };
    return badges[status as keyof typeof badges] || badges.incomplete;
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    const badges = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    };
    return badges[plan];
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'profile', label: '👤 Profile', icon: '👤' },
    { id: 'subscription', label: '💳 Subscription', icon: '💳' },
    { id: 'team', label: '👥 Team', icon: '👥' },
    { id: 'security', label: '🔒 Security', icon: '🔒' },
    { id: 'activity', label: '📈 Activity', icon: '📈' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
                notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-yellow-100 text-yellow-800 border border-yellow-200'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* Security Alerts */}
      {hasActiveAlerts && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-xl">⚠️</span>
            <h3 className="text-red-800 font-semibold">Security Attention Required</h3>
          </div>
          <p className="text-red-700 mt-1">
            You have {criticalAlerts.length} critical security alerts that need immediate attention.
          </p>
          <button
            onClick={() => setActiveTab('security')}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Review Security Issues
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              {user.twoFactorEnabled && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.name || 'User'}
              </h1>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPlanBadge(user.subscriptionPlan)}`}>
                  {user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1)}
                </span>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(user.subscriptionStatus)}`}>
                  {user.subscriptionStatus.replace('_', ' ')}
                </span>
                {userStats && (
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800`}>
                    Security Score: {securityScore}/100
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onExportData}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              title="Export Data"
            >
              📥 Export
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors"
              title="Security Center"
            >
              🛡️ Security
            </button>
            <button
              onClick={onManageSubscription}
              className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg transition-colors"
              title="Manage Subscription"
            >
              💳 Billing
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.vaultEntries}</div>
              <div className="text-sm text-gray-600">Vault Entries</div>
            </div>
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{teamMembers.length}</div>
              <div className="text-sm text-gray-600">Team Members</div>
            </div>
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{userStats.sharedVaults}</div>
              <div className="text-sm text-gray-600">Shared Vaults</div>
            </div>
            <div className="bg-white rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{securityScore}</div>
              <div className="text-sm text-gray-600">Security Score</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Message */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name || 'User'}!</h2>
              <p className="text-blue-100">
                {userStats ? `Last login: ${formatLastActive(userStats.lastLogin)}` : 'Welcome to your secure vault dashboard'}
              </p>
            </div>

            {/* Security Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Security Status</h3>
                  <div className={`w-3 h-3 rounded-full ${
                    securityScore >= 80 ? 'bg-green-500' : 
                    securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Security Score</span>
                    <span className={`font-bold ${
                      securityScore >= 80 ? 'text-green-600' : 
                      securityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {securityScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        securityScore >= 80 ? 'bg-green-500' : 
                        securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${securityScore}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">2FA Enabled</span>
                    <span className={user.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}>
                      {user.twoFactorEnabled ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  {alerts.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        {alerts.length} security issue{alerts.length > 1 ? 's' : ''} need{alerts.length === 1 ? 's' : ''} attention
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Account Activity</h3>
                <div className="space-y-3">
                  {userStats && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Weekly Activity</span>
                        <span className="font-semibold">{userStats.weeklyActivity} actions</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Storage Used</span>
                        <span className="font-semibold">{userStats.storageUsed}MB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Last Backup</span>
                        <span className="font-semibold">2 days ago</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Account Created</span>
                    <span className="font-semibold">{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Usage & Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Vault Entries</span>
                    <span className="text-sm text-gray-500">
                      {userStats?.vaultEntries || 0} / {currentPlanFeatures.maxVaultEntries === -1 ? '∞' : currentPlanFeatures.maxVaultEntries}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateUsagePercentage(userStats?.vaultEntries || 0, currentPlanFeatures.maxVaultEntries)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Team Members</span>
                    <span className="text-sm text-gray-500">
                      {teamMembers.length} / {currentPlanFeatures.maxTeamMembers === -1 ? '∞' : currentPlanFeatures.maxTeamMembers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateUsagePercentage(teamMembers.length, currentPlanFeatures.maxTeamMembers)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Shared Vaults</span>
                    <span className="text-sm text-gray-500">
                      {userStats?.sharedVaults || 0} / {currentPlanFeatures.maxSharedVaults === -1 ? '∞' : currentPlanFeatures.maxSharedVaults}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateUsagePercentage(userStats?.sharedVaults || 0, currentPlanFeatures.maxSharedVaults)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center space-x-3 py-2">
                    <div className={`w-2 h-2 rounded-full ${
                      log.severity === 'error' ? 'bg-red-500' :
                      log.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      {log.details && <p className="text-xs text-gray-600">{log.details}</p>}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatLastActive(log.timestamp)}
                    </span>
                  </div>
                ))}
                {activityLogs.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Profile Settings</h2>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            <SecureForm onSubmit={async (e, csrfToken) => {
              e.preventDefault();
              if (editingProfile) {
                await handleProfileSave();
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!editingProfile}
                    className={`w-full p-3 border rounded-lg ${
                      editingProfile
                        ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!editingProfile}
                    className={`w-full p-3 border rounded-lg ${
                      editingProfile
                        ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Created
                  </label>
                  <input
                    type="text"
                    value={new Date(user.createdAt).toLocaleDateString()}
                    disabled
                    className="w-full p-3 border border-gray-200 bg-gray-50 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={user.id}
                    disabled
                    className="w-full p-3 border border-gray-200 bg-gray-50 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>

              {editingProfile && (
                <div className="flex items-center space-x-4 mt-6">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileForm({ name: user.name || '', email: user.email });
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
                  >
                    ❌ Cancel
                  </button>
                </div>
              )}
            </SecureForm>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Current Subscription</h2>
                <button
                  onClick={onManageSubscription}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  💳 Manage Billing
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <span className={`inline-flex px-4 py-2 text-lg font-medium rounded-full ${getPlanBadge(user.subscriptionPlan)}`}>
                      {user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1)} Plan
                    </span>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(user.subscriptionStatus)}`}>
                      {user.subscriptionStatus.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan Type:</span>
                      <span className="font-medium">{user.subscriptionPlan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{user.subscriptionStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Billing:</span>
                      <span className="font-medium">-</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Plan Features</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={currentPlanFeatures.maxVaultEntries === -1 ? 'text-green-600' : 'text-blue-600'}>✓</span>
                      <span className="text-sm">
                        {currentPlanFeatures.maxVaultEntries === -1 ? 'Unlimited' : currentPlanFeatures.maxVaultEntries} vault entries
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={currentPlanFeatures.maxTeamMembers === -1 ? 'text-green-600' : 'text-blue-600'}>✓</span>
                      <span className="text-sm">
                        {currentPlanFeatures.maxTeamMembers === -1 ? 'Unlimited' : currentPlanFeatures.maxTeamMembers} team members
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={currentPlanFeatures.twoFactorAuth ? 'text-green-600' : 'text-gray-400'}>✓</span>
                      <span className="text-sm">Two-factor authentication</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={currentPlanFeatures.apiAccess ? 'text-green-600' : 'text-gray-400'}>✓</span>
                      <span className="text-sm">API access</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={currentPlanFeatures.prioritySupport ? 'text-green-600' : 'text-gray-400'}>✓</span>
                      <span className="text-sm">Priority support</span>
                    </div>
                  </div>
                </div>
              </div>

              {user.subscriptionPlan === 'free' && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Upgrade to Pro</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Get unlimited vault entries, advanced security features, and priority support.
                  </p>
                  <button
                    onClick={onManageSubscription}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    ⬆️ Upgrade Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Team Management</h2>
                {currentPlanFeatures.maxTeamMembers > teamMembers.length && (
                  <span className="text-sm text-green-600">
                    {currentPlanFeatures.maxTeamMembers - teamMembers.length} invites available
                  </span>
                )}
              </div>

              {team ? (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">{team.name}</h3>
                  <p className="text-gray-600">{team.description || 'No description provided'}</p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800">You're not part of any team yet. Create or join a team to collaborate!</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-medium mb-4">Invite Team Member</h3>
                <SecureForm onSubmit={handleInviteMember}>
                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="colleague@company.com"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                        className="p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={!inviteForm.email.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                      📧 Send Invite
                    </button>
                  </div>
                </SecureForm>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Team Members ({teamMembers.length})</h3>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {member.user?.name?.charAt(0) || member.user?.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{member.user?.name || 'Unnamed User'}</p>
                          <p className="text-sm text-gray-600">{member.user?.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          member.role === 'owner' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          active
                        </span>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => onRemoveTeamMember(member.id)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remove member"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No team members yet. Invite your first team member above!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Security Center</h2>
                <div className="flex items-center space-x-4">
                  <div className={`text-2xl font-bold ${getSecurityScoreColor(securityScore)}`}>
                    {securityScore}/100
                  </div>
                  <div className={`w-4 h-4 rounded-full ${
                    securityScore >= 80 ? 'bg-green-500' :
                    securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Security Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Two-Factor Authentication</span>
                      <div className="flex items-center space-x-2">
                        <span className={user.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}>
                          {user.twoFactorEnabled ? '✓ Enabled' : '✗ Disabled'}
                        </span>
                        {!user.twoFactorEnabled && (
                          <button
                            onClick={onSetup2FA}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            Setup
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Password Strength</span>
                      <span className="text-green-600">✓ Strong</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Recent Login</span>
                      <span className="text-gray-800">
                        {userStats ? formatLastActive(userStats.lastLogin) : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Sessions</span>
                      <button
                        onClick={onViewSessions}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        View Sessions
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Security Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={onChangePassword}
                      className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 p-3 rounded-lg text-left transition-colors"
                    >
                      🔐 Change Password
                    </button>
                    <button
                      onClick={onSetup2FA}
                      className="w-full bg-green-100 hover:bg-green-200 text-green-800 p-3 rounded-lg text-left transition-colors"
                    >
                      📱 {user.twoFactorEnabled ? 'Manage' : 'Setup'} 2FA
                    </button>
                    <button
                      onClick={onViewSessions}
                      className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 p-3 rounded-lg text-left transition-colors"
                    >
                      🖥️ View Active Sessions
                    </button>
                    <button
                      onClick={onExportData}
                      className="w-full bg-purple-100 hover:bg-purple-200 text-purple-800 p-3 rounded-lg text-left transition-colors"
                    >
                      📥 Export Account Data
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Alerts */}
            {alerts.length > 0 && (
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 text-red-600">🚨 Security Alerts</h3>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                      alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <h3 className="text-lg font-semibold text-red-600 mb-4">⚠️ Danger Zone</h3>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Delete Account</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    onClick={onDeleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    🗑️ Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{userStats?.weeklyActivity || 0}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{activityLogs.filter(log => log.severity === 'info').length}</div>
                <div className="text-sm text-gray-600">Normal Actions</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{activityLogs.filter(log => log.severity === 'warning').length}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{activityLogs.filter(log => log.severity === 'error').length}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-6">Activity Log</h2>
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                      log.severity === 'error' ? 'bg-red-500' :
                      log.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{log.action}</h3>
                        <span className="text-sm text-gray-500">
                          {formatLastActive(log.timestamp)}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {log.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {activityLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No activity logs found. Your actions will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}