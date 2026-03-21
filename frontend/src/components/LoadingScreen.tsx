import Lottie from 'lottie-react'
import loadingAnimation from '../assets/loading.json'

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Lottie
        animationData={loadingAnimation}
        loop={true}
        style={{ width: 120, height: 120 }}
      />
    </div>
  )
}
