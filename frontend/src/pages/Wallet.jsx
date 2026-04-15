// ============================================================
// Wallet Page
// Shows balance, top-up form, and transaction history
// ============================================================

import { useState, useEffect } from 'react';
import { walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Wallet() {
    const { user, updateUser } = useAuth();
    const [amount, setAmount] = useState('');
    const [history, setHistory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [topUpLoading, setTopUpLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetch wallet data on mount
    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const [balanceRes, historyRes] = await Promise.all([
                walletAPI.getBalance(),
                walletAPI.getHistory()
            ]);
            updateUser({ wallet_balance: balanceRes.data.wallet_balance });
            setHistory(historyRes.data.wallet_history);
            setTransactions(historyRes.data.transactions);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load wallet data.' });
        } finally {
            setLoading(false);
        }
    };

    // Handle top-up
    const handleTopUp = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        const topUpAmount = parseFloat(amount);
        if (!topUpAmount || topUpAmount <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid amount.' });
            return;
        }

        setTopUpLoading(true);
        try {
            const response = await walletAPI.topUp(topUpAmount);
            setMessage({ type: 'success', text: response.data.message });
            updateUser({ wallet_balance: response.data.wallet_balance });
            setAmount('');
            fetchWalletData(); // Refresh history
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Top-up failed.' });
        } finally {
            setTopUpLoading(false);
        }
    };

    // Quick top-up buttons
    const quickAmounts = [10, 25, 50, 100, 250];

    // Format date
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="container">
            <div className="page-header">
                <h1>💰 My Wallet</h1>
                <p>Manage your balance and view transaction history</p>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            {/* Wallet Balance Card */}
            <div className="wallet-card">
                <p className="balance-label">Current Balance</p>
                <p className="balance-amount">${user?.wallet_balance?.toFixed(2) || '0.00'}</p>
                
                {/* Top-up Form */}
                <form className="topup-form" onSubmit={handleTopUp}>
                    <input
                        type="number"
                        placeholder="Enter amount to add..."
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="1"
                        step="0.01"
                    />
                    <button 
                        type="submit" 
                        className="btn btn-success"
                        disabled={topUpLoading}
                    >
                        {topUpLoading ? 'Processing...' : '➕ Top Up'}
                    </button>
                </form>

                {/* Quick Amount Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    {quickAmounts.map(amt => (
                        <button
                            key={amt}
                            className="btn btn-sm"
                            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                            onClick={() => setAmount(amt.toString())}
                        >
                            ${amt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transaction History */}
            <div className="two-col">
                {/* Wallet History */}
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1rem' }}>📊 Wallet History</h2>
                        
                        {loading ? (
                            <div className="loading"><div className="spinner"></div></div>
                        ) : history.length === 0 ? (
                            <div className="empty-state">
                                <p>No wallet activity yet.</p>
                            </div>
                        ) : (
                            <ul className="history-list">
                                {history.map(item => (
                                    <li key={item.wallet_id} className="history-item">
                                        <div>
                                            <div className="description">{item.description}</div>
                                            <div className="date">{formatDate(item.created_at)}</div>
                                        </div>
                                        <span className={`amount ${item.action}`}>
                                            {item.action === 'add' ? '+' : '-'}${item.amount.toFixed(2)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Transactions */}
                <div className="card">
                    <div className="card-body">
                        <h2 style={{ marginBottom: '1rem' }}>🧾 Transactions</h2>
                        
                        {loading ? (
                            <div className="loading"><div className="spinner"></div></div>
                        ) : transactions.length === 0 ? (
                            <div className="empty-state">
                                <p>No transactions yet.</p>
                            </div>
                        ) : (
                            <ul className="history-list">
                                {transactions.map(item => (
                                    <li key={item.transaction_id} className="history-item">
                                        <div>
                                            <div className="description">
                                                {item.type === 'top-up' ? '💳' : '🛒'} {item.description}
                                            </div>
                                            <div className="date">{formatDate(item.created_at)}</div>
                                        </div>
                                        <span className={`amount ${item.type === 'top-up' ? 'add' : 'deduct'}`}>
                                            {item.type === 'top-up' ? '+' : '-'}${item.amount.toFixed(2)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Wallet;
