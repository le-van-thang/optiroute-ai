import { ShieldCheck, Users, Map, DollarSign, Activity } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400 mb-2">
          Welcome to Admin Control Panel
        </h1>
        <p className="text-gray-400 text-lg">Manage users, view system metrics, and monitor platform health.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-[#0a1128] border border-gray-800 rounded-2xl p-6 shadow-xl shadow-black/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Users</p>
              <h3 className="text-3xl font-bold text-white mt-1">1,248</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-lg">
              <Users className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-400 font-medium">+12%</span>
            <span className="text-gray-500 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-[#0a1128] border border-gray-800 rounded-2xl p-6 shadow-xl shadow-black/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Trips</p>
              <h3 className="text-3xl font-bold text-white mt-1">456</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Map className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-400 font-medium">+5%</span>
            <span className="text-gray-500 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-[#0a1128] border border-gray-800 rounded-2xl p-6 shadow-xl shadow-black/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Expenses</p>
              <h3 className="text-3xl font-bold text-white mt-1">$45.2k</h3>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-400 font-medium">+18%</span>
            <span className="text-gray-500 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-[#0a1128] border border-gray-800 rounded-2xl p-6 shadow-xl shadow-black/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">System Status</p>
              <h3 className="text-xl font-bold text-emerald-400 mt-2">Operational</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <Activity className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-400 font-medium border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 rounded-full">All systems go</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#0a1128] border border-gray-800 rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-rose-400" />
            Security & Access Logs
          </h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-800 rounded-xl">
            <ShieldCheck className="h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-300">No security events found</h3>
            <p className="text-gray-500 mt-1 max-w-sm">
              Your system is currently secure. Admin controls and user management tools will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
