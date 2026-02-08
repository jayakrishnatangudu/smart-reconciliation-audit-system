import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadAPI } from '../services/api';

export default function UploadPage() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [columnMapping, setColumnMapping] = useState({});
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Mapping, 3: Processing
    const [uploadJobId, setUploadJobId] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const requiredFields = ['transactionId', 'amount', 'referenceNumber', 'date'];

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');
        setLoading(true);

        try {
            const response = await uploadAPI.preview(selectedFile);
            setPreview(response.data);

            // Auto-map columns if they match
            const autoMapping = {};
            response.data.columns.forEach(col => {
                const lowerCol = col.toLowerCase();
                if (lowerCol.includes('transaction') || lowerCol.includes('txn')) {
                    autoMapping.transactionId = col;
                } else if (lowerCol.includes('amount')) {
                    autoMapping.amount = col;
                } else if (lowerCol.includes('reference') || lowerCol.includes('ref')) {
                    autoMapping.referenceNumber = col;
                } else if (lowerCol.includes('date')) {
                    autoMapping.date = col;
                }
            });
            setColumnMapping(autoMapping);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'File upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Validate all required fields are mapped
        const missingFields = requiredFields.filter(field => !columnMapping[field]);
        if (missingFields.length > 0) {
            setError(`Please map required fields: ${missingFields.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            const response = await uploadAPI.submit(preview.fileName, columnMapping);
            setUploadJobId(response.data.uploadJobId);
            setStep(3);

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setColumnMapping({});
        setStep(1);
        setError('');
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Upload File</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Step 1: File Upload */}
            {step === 1 && (
                <div className="bg-white rounded-lg shadow p-8">
                    <h2 className="text-xl font-semibold mb-4">Select CSV or Excel File</h2>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <div className="text-6xl mb-4">📁</div>
                            <p className="text-lg font-medium text-gray-700">Click to upload or drag and drop</p>
                            <p className="text-sm text-gray-500 mt-2">CSV or Excel files (up to 100MB)</p>
                        </label>
                    </div>
                    {loading && <p className="text-center mt-4">Processing file...</p>}
                </div>
            )}

            {/* Step 2: Preview & Column Mapping */}
            {step === 2 && preview && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Column Mapping</h2>
                        <p className="text-gray-600 mb-4">Map uploaded columns to system fields</p>

                        <div className="grid grid-cols-2 gap-4">
                            {requiredFields.map(field => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {field} <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={columnMapping[field] || ''}
                                        onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">Select column...</option>
                                        {preview.columns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Preview (First 20 Rows)</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {preview.columns.map(col => (
                                            <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {preview.preview.map((row, idx) => (
                                        <tr key={idx}>
                                            {preview.columns.map(col => (
                                                <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {row[col]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleReset}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {loading ? 'Submitting...' : 'Submit for Processing'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Processing */}
            {step === 3 && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-6xl mb-4">⚡</div>
                    <h2 className="text-2xl font-semibold mb-4">File Submitted Successfully!</h2>
                    <p className="text-gray-600 mb-4">
                        Your file is being processed asynchronously. Upload Job ID: <code className="bg-gray-100 px-2 py-1 rounded">{uploadJobId}</code>
                    </p>
                    <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
                </div>
            )}
        </div>
    );
}
