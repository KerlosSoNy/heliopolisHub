import {
    createContext,
    useContext,
    useState,
    useEffect,
} from 'react';
import { account } from '../lib/appwrite';
import { type Models } from 'appwrite';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: any }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [loading, setLoading] = useState(true);

    // 👇 Check session on mount AND on every route change
    useEffect(() => {
        checkSession();
    }, []);

    async function checkSession() {
        try {
            console.log('🔄 Checking session...');
            const currentUser = await account.get();
            console.log('✅ Session found:', currentUser.name);
            setUser(currentUser);
        } catch (err) {
            console.log('ℹ️ No active session');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    async function login(email: string, password: string) {
        // 👇 Delete any stale sessions first
        try {
            await account.deleteSession('current');
        } catch {
            // No existing session, that's fine
        }

        try {
            await account.createEmailPasswordSession(email, password);
            const currentUser = await account.get();
            setUser(currentUser);
        } catch (error: any) {
            console.error('❌ Login error:', error);
            if (error.code === 401) {
                throw new Error('Invalid email or password');
            }
            if (error.code === 429) {
                throw new Error('Too many attempts. Please wait and try again.');
            }
            throw new Error(error.message || 'Login failed');
        }
    }

    async function register(name: string, email: string, password: string) {
        try {
            await account.create('unique()', email, password, name);
            await login(email, password);
        } catch (error: any) {
            if (error.code === 409) {
                throw new Error('An account with this email already exists');
            }
            throw new Error(error.message || 'Registration failed');
        }
    }

    async function logout() {
        try {
            await account.deleteSession('current');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}