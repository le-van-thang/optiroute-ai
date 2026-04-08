import Link from "next/link";
import { Map, Zap, Receipt, Compass } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-8 backdrop-blur-sm">
          <Zap className="h-4 w-4 text-indigo-400" />
          <span>Powered by Gemini AI</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          Travel Smarter with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            OptiRoute AI
          </span>
        </h1>
        
        <p className="mt-4 max-w-2xl text-xl text-gray-400 font-light mb-10">
          The ultimate smart itinerary planner and split-bill ledger. 
          Stop arguing over spreadsheets and let AI seamlessly orchestrate your next journey.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center relative z-10">
          <Link
            href="/register"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:-translate-y-1"
          >
            Start Your Journey
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-bold text-lg transition-all backdrop-blur-sm"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-black/20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need for the perfect trip
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="bg-indigo-500/20 p-3 rounded-lg w-fit mb-6">
                <Map className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Smart Routes (TSP)</h3>
              <p className="text-gray-400 leading-relaxed">
                Our mathematical Traveling Salesperson Problem engine ensures you take the fastest, most effective route between your destinations.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="bg-purple-500/20 p-3 rounded-lg w-fit mb-6">
                <Receipt className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Split-Bill Ledger</h3>
              <p className="text-gray-400 leading-relaxed">
                Graph algorithms intelligently simplify group debts locally so you minimize the number of payback transactions.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="bg-cyan-500/20 p-3 rounded-lg w-fit mb-6">
                <Compass className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Interactive Open Maps</h3>
              <p className="text-gray-400 leading-relaxed">
                Built-in Leaflet and OpenStreetMap integration gives you a premium, interactive mapping experience without the bloated costs.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
