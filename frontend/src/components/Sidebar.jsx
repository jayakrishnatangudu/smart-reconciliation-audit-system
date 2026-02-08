import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const location = useLocation();
    const { user, logout, hasRole } = useAuth();

    const navItems = [
        { path: '/dashboard', name: 'Dashboard', icon: '📊', roles: ['Admin', 'Analyst', 'Viewer'] },
        { path: '/upload', name: 'Upload', icon: '📤', roles: ['Admin', 'Analyst'] },
        { path: '/reconciliation', name: 'Reconciliation', icon: '🔍', roles: ['Admin', 'Analyst', 'Viewer'] },
        { path: '/audit', name: 'Audit Logs', icon: '📝', roles: ['Admin', 'Analyst', 'Viewer'] },
    ];

    const filteredNavItems = navItems.filter(item =>
        item.roles.some(role => hasRole(role))
    );

    return (
        <div className="bg-gray-900 text-white w-64 min-h-screen flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold">Reconciliation</h1>
                <p className="text-sm text-gray-400 mt-1">Audit System</p>
            </div>

            <nav className="flex-1 px-4">
                {filteredNavItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${location.pathname === item.path
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800'
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <div className="px-4 py-3 bg-gray-800 rounded-lg mb-3">
                    <p className="text-sm font-medium">{user?.username}</p>
                    <p className="text-xs text-gray-400">{user?.role}</p>
                </div>
                <button
                    onClick={logout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
