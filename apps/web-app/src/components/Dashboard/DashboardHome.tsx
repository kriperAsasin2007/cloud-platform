import { useAuth } from '../../context/AuthContext';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
    title: 'Compute Instances',
    desc: 'Spin up isolated Docker-based compute environments with custom CPU, memory, and image configuration.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Real-time Monitoring',
    desc: 'Live CPU, memory, and network metrics streamed every 30 seconds via WebSocket for instant visibility.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Secure SSH Access',
    desc: 'Each instance exposes a dedicated SSH port. Register your public key at creation for immediate access.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7M4 7h16M4 7l2-4h12l2 4" />
      </svg>
    ),
    title: 'Storage (Coming Soon)',
    desc: 'Persistent block and object storage volumes that attach seamlessly to any running instance.',
  },
];

export function DashboardHome() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-16 px-8">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-3">
          Welcome back, {user?.username}
        </h1>
        <p className="text-lg text-slate-500 mb-12">
          Cloud Platform gives you on-demand compute infrastructure with real-time provisioning and monitoring.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-slate-200 rounded-xl p-5 flex gap-4 hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
