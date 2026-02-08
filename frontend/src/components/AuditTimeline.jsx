import React from 'react';
import { format } from 'date-fns';

export default function AuditTimeline({ auditLogs }) {
    if (!auditLogs || auditLogs.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No audit trail available
            </div>
        );
    }

    const getActionColor = (action) => {
        const colors = {
            CREATE: 'bg-green-500',
            UPDATE: 'bg-blue-500',
            DELETE: 'bg-red-500',
            RECONCILE: 'bg-purple-500',
            UPLOAD: 'bg-indigo-500',
            MANUAL_CORRECTION: 'bg-yellow-500'
        };
        return colors[action] || 'bg-gray-500';
    };

    const getActionIcon = (action) => {
        const icons = {
            CREATE: '+',
            UPDATE: '↻',
            DELETE: '×',
            RECONCILE: '⚡',
            UPLOAD: '↑',
            MANUAL_CORRECTION: '✎'
        };
        return icons[action] || '•';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-6">Audit Timeline</h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {auditLogs.map((log, index) => (
                    <div key={log._id || index} className="relative flex gap-6 mb-6">
                        {/* Timeline dot */}
                        <div className={`${getActionColor(log.action)} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-md z-10`}>
                            {getActionIcon(log.action)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-semibold text-gray-800">{log.action}</span>
                                    <span className="text-sm text-gray-500 ml-2">
                                        by {log.changedBy?.username || 'System'}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                                </span>
                            </div>

                            {log.oldValue && log.newValue && (
                                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                    <div>
                                        <p className="text-gray-500 font-medium mb-1">Old Value</p>
                                        <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                                            {JSON.stringify(log.oldValue, null, 2)}
                                        </pre>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 font-medium mb-1">New Value</p>
                                        <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                                            {JSON.stringify(log.newValue, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {log.source && (
                                <div className="mt-2">
                                    <span className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                                        Source: {log.source}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
