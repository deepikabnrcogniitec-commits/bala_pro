import Navbar from './components/Navbar'
import HowItWorks from './components/HowItWorks'
import MenuGallery from './components/MenuGallery'
import AppDownload from './components/AppDownload'
import Footer from './components/Footer'

export default function HowItWorksPage() {
  return (
    <>
      <Navbar onHome={false} />
      <main>
        <HowItWorks />
        <MenuGallery />
        <AppDownload />
      </main>
      <Footer onHome={false} />
    </>
  )
}
