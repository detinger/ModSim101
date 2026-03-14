import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Lesson01 from './pages/Lesson01'
import Lesson02 from './pages/Lesson02'
import Lesson03 from './pages/Lesson03'
import StatFit from './pages/StatFit'

const PAGES = {
  home: <Home />,
  lesson01: <Lesson01 />,
  lesson02: <Lesson02 />,
  lesson03: <Lesson03 />,
  statfit: <StatFit />,
}

export default function App() {
  const [page, setPage] = useState('home')

  return (
    <div className="app-shell">
      <Sidebar current={page} navigate={setPage} />
      <main className="main-content">
        {PAGES[page]}
      </main>
    </div>
  )
}
