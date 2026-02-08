import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatsCard from '../components/StatsCard';
import { reconciliationAPI, uploadAPI } from '../services/api';

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [uploads, setUploads] = useState([]);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        uploadedBy: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, uploadsRes] = await Promise.all([
                reconciliationAPI.getDashboardStats(filters),
                uploadAPI.getAllUploads(filters)
            ]);
            setStats(statsRes.data);
            setUploads(uploadsRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const pieData = stats ? [
        { name: 'Matched', value: stats.matched, color: '#10b981' },
        { name: 'Partially Matched', value: stats.partiallyMatched, color: '#f59e0b' },
        { name: 'Unmatched', value: stats.unmatched, color: '#ef4444' },
        { name: 'Duplicate', value: stats.duplicate, color: '#8b5cf6' },
    ] : [];

    const barData = uploads.map(upload => ({
        name: upload.fileName.substring(0, 15) + '...',
        matched: upload.matchedRecords,
        partial: upload.partiallyMatchedRecords,
        unmatched: upload.unmatchedRecords,
        duplicate: upload.duplicateRecords
    })).slice(0, 5);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                <div className="grid grid-cols-4 gap-4">
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="px-3 py-2 border rounded-lg"
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="px-3 py-2 border rounded-lg"
                        placeholder="End Date"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-3 py-2 border rounded-lg"
                    >
                        <option value="">All Status</option>
                        <option value="Matched">Matched</option>
                        <option value="Partially Matched">Partially Matched</option>
                        <option value="Not Matched">Not Matched</option>
                        <option value="Duplicate">Duplicate</option>
                    </select>
                    <button
                        onClick={() => setFilters({ startDate: '', endDate: '', status: '', uploadedBy: '' })}
                        className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-6 mb-8">
                <StatsCard
                    title="Total Records"
                    value={stats?.totalRecords || 0}
                    icon={<span className="text-2xl">📊</span>}
                    color="blue"
                />
                <StatsCard
                    title="Matched"
                    value={stats?.matched || 0}
                    icon={<span className="text-2xl">✅</span>}
                    color="green"
                />
                <StatsCard
                    title="Partial Match"
                    value={stats?.partiallyMatched || 0}
                    icon={<span className="text-2xl">⚠️</span>}
                    color="yellow"
                />
                <StatsCard
                    title="Unmatched"
                    value={stats?.unmatched || 0}
                    icon={<span className="text-2xl">❌</span>}
                    color="red"
                />
                <StatsCard
                    title="Accuracy"
                    value={`${stats?.reconciliationAccuracy || 0}%`}
                    icon={<span className="text-2xl">🎯</span>}
                    color="purple"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Match Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Uploads</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="matched" fill="#10b981" name="Matched" />
                            <Bar dataKey="partial" fill="#f59e0b" name="Partial" />
                            <Bar dataKey="unmatched" fill="#ef4444" name="Unmatched" />
                            <Bar dataKey="duplicate" fill="#8b5cf6" name="Duplicate" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
