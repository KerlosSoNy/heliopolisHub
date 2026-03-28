import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function Login() {
    const { login, register } = useAuth();

    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await register(name, email, password);
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Header */}
                <div className="login-header">
                    <div className="login-logo">📊</div>
                    <h1>{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
                    <p>{isRegister ? 'Sign up to get started' : 'Login to your dashboard'}</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="alert alert-error">
                        ⚠️ {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {isRegister && (
                        <div className="input-group">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <Mail size={18} className="input-icon" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="input-group">
                        <Lock size={18} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-login"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 size={18} className="spin" />
                        ) : isRegister ? (
                            <UserPlus size={18} />
                        ) : (
                            <LogIn size={18} />
                        )}
                        {loading
                            ? 'Please wait...'
                            : isRegister
                                ? 'Create Account'
                                : 'Sign In'}
                    </button>
                </form>

                {/* Toggle Login/Register */}
                <div className="login-footer">
                    <p>
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}
                        <button
                            type="button"
                            className="link-btn"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError('');
                            }}
                        >
                            {isRegister ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}