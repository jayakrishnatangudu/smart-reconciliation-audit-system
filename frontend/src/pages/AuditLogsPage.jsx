import React, { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import AuditTimeline from '../components/AuditTimeline';

const AuditLogsPage = () => {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await auditAPI.getAllLogs({ page, limit });
            if (response.data.success) {
                setLogs(response.data.data);
                setTotal(response.data.total);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, limit]);

    if (loading) return <div className="text-center p-8">Loading audit logs...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">System Audit Logs</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map((log) => (
                            <tr key={log._id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.performedBy?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.resourceType}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.details ? JSON.stringify(log.details) : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-between items-center">
                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <span>Page {page} of {Math.ceil(total / limit)}</span>
                <button
                    disabled={page >= Math.ceil(total / limit)}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default AuditLogsPage;
