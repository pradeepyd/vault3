'use client';

import { useState, useEffect } from 'react';
import { VaultEntry, User, Team, TeamMember, UserRole } from '@/types';

interface SharedVault {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  ownerId: string;
  entries: VaultEntry[];
  permissions: SharedVaultPermission[];
  createdAt: Date;
  updatedAt: Date;
}

interface SharedVaultPermission {
  id: string;
  vaultId: string;
  userId: string;
  permission: 'read' | 'write' | 'admin';
  grantedBy: string;
  createdAt: Date;
}

interface TeamCollaborationProps {
  user: User;
  team?: Team;
  teamMembers: TeamMember[];
  sharedVaults: SharedVault[];
  onCreateSharedVault: (vault: Omit<SharedVault, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateVaultPermissions: (vaultId: string, userId: string, permission: string) => void;
  onShareEntry: (entryId: string, vaultId: string) => void;
  onRemoveSharedEntry: (entryId: string, vaultId: string) => void;
}

export default function TeamCollaboration({
  user,
  team,
  teamMembers,
  sharedVaults,
  onCreateSharedVault,
  onUpdateVaultPermissions,
  onShareEntry,
  onRemoveSharedEntry
}: TeamCollaborationProps) {
  const [activeTab, setActiveTab] = useState<'vaults' | 'permissions' | 'activity'>('vaults');
  const [showCreateVault, setShowCreateVault] = useState(false);
  const [selectedVault, setSelectedVault] = useState<SharedVault | null>(null);
  const [createVaultForm, setCreateVaultForm] = useState({
    name: '',
    description: ''
  });

  const hasAdminAccess = user.role === 'owner' || user.role === 'admin';

  const handleCreateVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (createVaultForm.name.trim() && team) {
      onCreateSharedVault({
        name: createVaultForm.name.trim(),
        description: createVaultForm.description.trim(),
        teamId: team.id,
        ownerId: user.id,
        entries: [],
        permissions: []
      });
      setCreateVaultForm({ name: '', description: '' });
      setShowCreateVault(false);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'read': return '👁️';
      case 'write': return '✏️';
      case 'admin': return '👑';
      default: return '❓';
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'read': return 'bg-gray-100 text-gray-800';
      case 'write': return 'bg-blue-100 text-blue-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserPermission = (vault: SharedVault, userId: string): string => {
    if (vault.ownerId === userId) return 'admin';
    const permission = vault.permissions.find(p => p.userId === userId);
    return permission?.permission || 'none';
  };

  const canManageVault = (vault: SharedVault): boolean => {
    return vault.ownerId === user.id || hasAdminAccess;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Collaboration</h1>
          <p className="text-gray-600">Manage shared vaults and team access</p>
        </div>
        {hasAdminAccess && (
          <button
            onClick={() => setShowCreateVault(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Create Shared Vault</span>
          </button>
        )}
      </div>

      {!team && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-yellow-800 mb-2">No Team Found</h3>
          <p className="text-yellow-700">
            You need to be part of a team to use collaboration features. 
            Upgrade your plan or join a team to get started.
          </p>
        </div>
      )}

      {team && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            {[
              { id: 'vaults', label: '🏦 Shared Vaults', count: sharedVaults.length },
              { id: 'permissions', label: '🔐 Permissions', count: null },
              { id: 'activity', label: '📊 Activity', count: null }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 font-medium transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'vaults' && (
            <div className="space-y-6">
              {sharedVaults.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-6xl mb-4">🏦</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shared Vaults</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first shared vault to start collaborating with your team
                  </p>
                  {hasAdminAccess && (
                    <button
                      onClick={() => setShowCreateVault(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                    >
                      Create Shared Vault
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sharedVaults.map((vault) => {
                    const userPermission = getUserPermission(vault, user.id);
                    const isOwner = vault.ownerId === user.id;
                    
                    return (
                      <div key={vault.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{vault.name}</h3>
                            {vault.description && (
                              <p className="text-sm text-gray-600 mb-2">{vault.description}</p>
                            )}
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getPermissionColor(userPermission)}`}>
                                {getPermissionIcon(userPermission)} {userPermission}
                              </span>
                              {isOwner && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  👑 Owner
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Entries:</span>
                            <span className="font-medium">{vault.entries.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Team Members:</span>
                            <span className="font-medium">{vault.permissions.length + 1}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Last Updated:</span>
                            <span className="font-medium">{new Date(vault.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex space-x-2">
                          <button
                            onClick={() => setSelectedVault(vault)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded"
                          >
                            View Vault
                          </button>
                          {canManageVault(vault) && (
                            <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-3 py-2 rounded">
                              Manage
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Team Permissions Overview</h2>
                  <p className="text-gray-600 mt-1">Manage access levels for team members across all shared vaults</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-900">Team Member</th>
                        <th className="text-left p-4 font-medium text-gray-900">Role</th>
                        {sharedVaults.map(vault => (
                          <th key={vault.id} className="text-center p-4 font-medium text-gray-900 min-w-32">
                            {vault.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                                {(member.user?.name || member.user?.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{member.user?.name || 'Unknown'}</div>
                                <div className="text-sm text-gray-600">{member.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                              {member.role}
                            </span>
                          </td>
                          {sharedVaults.map((vault) => {
                            const permission = getUserPermission(vault, member.userId);
                            return (
                              <td key={vault.id} className="p-4 text-center">
                                {permission !== 'none' ? (
                                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getPermissionColor(permission)}`}>
                                    {getPermissionIcon(permission)} {permission}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">No access</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">📝</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">John Doe</span> added a new entry to <span className="font-medium">Marketing Vault</span>
                    </p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">👥</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">You</span> invited <span className="font-medium">jane@company.com</span> to the team
                    </p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <p>More activity features coming soon...</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Vault Modal */}
      {showCreateVault && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create Shared Vault</h2>
                <button
                  onClick={() => setShowCreateVault(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateVault} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vault Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createVaultForm.name}
                    onChange={(e) => setCreateVaultForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Marketing Team, HR Documents"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={createVaultForm.description}
                    onChange={(e) => setCreateVaultForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional description for this vault"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Create Vault
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateVault(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Vault Detail Modal */}
      {selectedVault && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedVault.name}</h2>
                  {selectedVault.description && (
                    <p className="text-gray-600 mt-1">{selectedVault.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedVault(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{selectedVault.entries.length}</div>
                    <div className="text-sm text-gray-600">Total Entries</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{selectedVault.permissions.length + 1}</div>
                    <div className="text-sm text-gray-600">Team Members</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {new Date(selectedVault.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">Last Updated</div>
                  </div>
                </div>

                {selectedVault.entries.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No entries yet</h3>
                    <p className="text-gray-600">Start adding entries to this shared vault</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900">Vault Entries</h3>
                    {selectedVault.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">
                            {entry.type === 'login' ? '🔐' :
                             entry.type === 'banking' ? '🏦' :
                             entry.type === 'card' ? '💳' :
                             entry.type === 'identity' ? '🆔' :
                             entry.type === 'note' ? '📝' : '📄'}
                          </span>
                          <div>
                            <div className="font-medium">{entry.title}</div>
                            <div className="text-sm text-gray-600 capitalize">{entry.type}</div>
                          </div>
                        </div>
                        {canManageVault(selectedVault) && (
                          <button
                            onClick={() => onRemoveSharedEntry(entry.id, selectedVault.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}