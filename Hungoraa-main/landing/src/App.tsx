import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import RestaurantShowcase from './components/RestaurantShowcase'
import Testimonials from './components/Testimonials'
import AppDownload from './components/AppDownload'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <RestaurantShowcase />
        <Testimonials />
        <AppDownload />
      </main>
      <Footer />
    </>
  )
}
