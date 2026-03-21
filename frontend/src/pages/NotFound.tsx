import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Lottie from 'lottie-react'
import background404 from '../assets/background-404.json'

export function NotFound() {
  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Full-screen Lottie background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <Lottie
          animationData={background404}
          loop
          autoplay
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Glassmorphism overlay blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md text-center"
      >
        {/* Glass card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-10">

          {/* 404 Big number */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <span className="block text-[7rem] font-black font-heading leading-none bg-gradient-to-br from-emerald-400 to-emerald-600 bg-clip-text text-transparent drop-shadow-lg select-none">
              404
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h2 className="text-2xl font-bold font-heading text-white mb-3">
              Page Not Found
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold text-base shadow-lg shadow-emerald-900/40 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              ← Back to Home
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
