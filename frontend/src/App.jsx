import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import Home from './pages/Home.jsx'
import Insights from './pages/Insights.jsx'
import NotFound from './pages/NotFound.jsx'
import Solutions from './pages/Solutions.jsx'
import WhyAvl from './pages/WhyAvl.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="solutions" element={<Solutions />} />
        <Route path="why-avl" element={<WhyAvl />} />
        <Route path="insights" element={<Insights />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
