import React, { useState, useEffect } from 'react';
import { reconciliationAPI, auditAPI } from '../services/api';
import AuditTimeline from '../components/AuditTimeline';

export default function ReconciliationPage() {
    const [results, setResults] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [showAudit, setShowAudit] = useState(false);
    const [filters, setFilters] = useState({
        matchStatus: '',
        uploadJobId: '',
        page: 1
    });
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResults();
    }, [filters]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const response = await reconciliationAPI.getResults(filters);
            setResults(response.data.results);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setLoading(false);
        }
    };

    const viewAudit = async (record) => {
        setSelectedRecord(record);
        try {
            const response = await auditAPI.getRecordTimeline(record.recordId._id);
            setAuditLogs(response.data);
            setShowAudit(true);
        } catch (error) {
            console.error('Error fetching audit:', error);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Matched': { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
            'Partially Matched': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠️' },
            'Not Matched': { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
            'Duplicate': { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🔁' }
        };
        const config = statusConfig[status] || statusConfig['Not Matched'];

        return (
            <span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2`}>
                <span>{config.icon}</span>
                {status}
            </span>
        );
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Reconciliation Results</h1>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-3 gap-4">
                    <select
                        value={filters.matchStatus}
                        onChange={(e) => setFilters({ ...filters, matchStatus: e.target.value, page: 1 })}
                        className="px-3 py-2 border rounded-lg"
                    >
                        <option value="">All Status</option>
                        <option value="Matched">Matched</option>
                        <option value="Partially Matched">Partially Matched</option>
                        <option value="Not Matched">Not Matched</option>
                        <option value="Duplicate">Duplicate</option>
                    </select>
                    <input
                        type="text"
                        value={filters.uploadJobId}
                        onChange={(e) => setFilters({ ...filters, uploadJobId: e.target.value, page: 1 })}
                        placeholder="Upload Job ID (optional)"
                        className="px-3 py-2 border rounded-lg"
                    />
                    <button
                        onClick={() => setFilters({ matchStatus: '', uploadJobId: '', page: 1 })}
                        className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">Loading...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mismatched Fields</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.map((result) => (
                                        <tr key={result._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(result.matchStatus)}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm">
                                                <div className="flex flex-col gap-1">
                                                    <div><strong>System:</strong> {result.systemRecord?.transactionId || 'N/A'}</div>
                                                    <div><strong>Upload:</strong> {result.uploadedRecord?.transactionId}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div><strong>System:</strong> ${result.systemRecord?.amount || 'N/A'}</div>
                                                    <div><strong>Upload:</strong> ${result.uploadedRecord?.amount}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm">
                                                {result.uploadedRecord?.referenceNumber}
                                            </td>
                                            <td className="px-6 py-4">
                                                {result.mismatchedFields && result.mismatchedFields.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {result.mismatchedFields.map((field, idx) => (
                                                            <div key={idx} className="text-xs bg-yellow-50 px-2 py-1 rounded">
                                                                <strong>{field.field}:</strong> {field.variance ? `${field.variance}% variance` : 'mismatch'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => viewAudit(result)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    View Audit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Page {pagination.page} of {pagination.pages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                    disabled={filters.page <= 1}
                                    className="px-4 py-2 border rounded-lg hover:bg-white disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                    disabled={filters.page >= pagination.pages}
                                    className="px-4 py-2 border rounded-lg hover:bg-white disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Audit Timeline Modal */}
            {showAudit && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Audit Timeline</h2>
                            <button
                                onClick={() => setShowAudit(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6">
                            <AuditTimeline auditLogs={auditLogs} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
