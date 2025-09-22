import { NavLink } from "react-router-dom";

export default function SettingsLayout({ children, botId }) {
    const navLinkClass = ({ isActive }) =>
        `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
            isActive 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
        }`;

    // Inline style fallback so links look like buttons even if utility CSS fails
    const linkStyle = (isActive) => ({
        padding: '10px 16px',
        borderRadius: 8,
        border: `1px solid ${isActive ? '#4f46e5' : '#e2e8f0'}`,
        background: isActive ? '#4f46e5' : '#ffffff',
        color: isActive ? '#ffffff' : '#0f172a',
        fontWeight: 600,
        marginRight: 12,
        textDecoration: 'none',
        display: 'inline-block'
    });

    return (
        <div className="w-full">
            {/* Top Tabs */}
            <div className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur border-b border-slate-200" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
                    <nav className="flex items-center gap-3 py-3" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                        <NavLink to={`/edit-bot/${botId}/general`} className={navLinkClass} style={({ isActive }) => linkStyle(isActive)}>General</NavLink>
                        <NavLink to={`/edit-bot/${botId}/appearance`} className={navLinkClass} style={({ isActive }) => linkStyle(isActive)}>Appearance</NavLink>
                        <NavLink to={`/edit-bot/${botId}/knowledge`} className={navLinkClass} style={({ isActive }) => linkStyle(isActive)}>Knowledge</NavLink>
                    </nav>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
                {children}
            </main>
        </div>
    );
}