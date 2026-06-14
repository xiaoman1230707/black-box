import {
  Outlet
} from 'react-router-dom'
import BottomNav from '@/components/BottomNav'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-background to-background pb-16">
      <div className="h-full w-full">
        <Outlet />
      </div>
      {/* 底栏 */}
      <BottomNav/>
    </div>
  )
}